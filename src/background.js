// ---- CONSTANTS AND CONFIGURATION ----

const DEBUG_MODE = true;
const ONE_DAY_MS = 86400000; // 24h * 60' * 60'' * 1000ms = 86400000ms
const ONE_DAY_MIN = 1440; // 24h * 60' = 1440'

// Nome univoco per l'allarme che elabora la coda.
const PROCESS_QUEUE_ALARM_NAME = "timbrapp-process-queue";

const debugLog = (...args) => {
    if (DEBUG_MODE) console.log(...args);
};

// ---- CHROME RUNTIME EVENTS (Lifecycle) ----

chrome.runtime.onInstalled.addListener((detail) => {
    debugLog(`[onInstalled] ${detail.reason}`);
    if (detail.reason === "install") {
        chrome.storage.local.set({ alarmActive: false });
        chrome.tabs.create({ url: chrome.runtime.getURL("README.html") });
    }
});

chrome.runtime.onStartup.addListener(() => {
    debugLog("[onStartup] Avvio l'estensione");
    // All'avvio, ci assicuriamo solo che il timestamp per la prossima sospensione sia aggiornato.
    // La gestione degli allarmi mancati è ora centralizzata in onAlarm per evitare race conditions.
    const now = new Date();
    chrome.storage.local.set({ lastSuspendTime: now.toISOString() });
    debugLog(`[onStartup] Impostato lastSuspendTime a: ${now.toISOString()}`);
});

chrome.runtime.onSuspend.addListener(() => {
    const now = new Date();
    chrome.storage.local.set({ lastSuspendTime: now.toISOString() });
    debugLog(`[onSuspend] Browser chiuso alle ${now.toISOString()}`);
});

// ---- CHROME API EVENTS (User Actions & Alarms) ----

chrome.runtime.onMessage.addListener((message) => {
    debugLog(`[onMessage] Ricevuto messaggio:`, message);
    if (message.action === "setAlarms") {
        chrome.storage.local.get(["morningIn", "morningOut", "afternoonIn", "afternoonOut"], (data) => {
            setOrClearAlarms(data);
        });
    }
    if (message.action === "clearAlerts" || message.action === "closeOverlays") {
        clearAlerts(message.action);
    }
});

// Listener principale per tutti gli allarmi.
chrome.alarms.onAlarm.addListener(async (alarm) => {
    // Se l'allarme che è scattato è quello per elaborare la coda,
    // esegui la funzione e fermati qui.
    if (alarm.name === PROCESS_QUEUE_ALARM_NAME) {
        debugLog(`[onAlarm] Ricevuto allarme di elaborazione. Avvio processAlarmQueue.`);
        await processAlarmQueue();
        return;
    }

    // Altrimenti, è un allarme di notifica. Aggiungilo alla coda.
    debugLog(`[onAlarm] Ricevuto allarme di notifica: ${alarm.name}. Aggiungo alla coda.`);

    // Aggiungiamo l'allarme alla coda persistente
    const data = await chrome.storage.local.get({ alarmQueue: [] });
    const newQueue = [...data.alarmQueue, alarm];
    await chrome.storage.local.set({ alarmQueue: newQueue });

    // Crea (o aggiorna) l'allarme di elaborazione per eseguirlo tra 1 secondo.
    // Questo raggruppa tutti gli allarmi che arrivano in rapida successione
    // e garantisce l'esecuzione anche se il service worker viene sospeso.
    chrome.alarms.create(PROCESS_QUEUE_ALARM_NAME, { delayInMinutes: 1 / 60 });
});

chrome.action.onClicked.addListener(() => {
    chrome.storage.local.get(["siteUrl", "alarmActive"], (data) => {
        if (data.alarmActive) {
            debugLog("[onClicked action] Allarme attivo, eseguo clearAlerts.");
            clearAlerts("clearAlerts");
        } else {
            debugLog("[onClicked action] Nessun allarme attivo, apro la pagina delle opzioni.");
            chrome.runtime.openOptionsPage();
        }
    });
});

chrome.notifications.onClicked.addListener((notificationId) => {
    debugLog(`[onClicked notification] Notifica ${notificationId} cliccata.`);
    // L'azione principale della notifica è la stessa del pulsante "Vai al sito" dell'overlay.
    clearAlerts("clearAlerts");
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    debugLog(`[onButtonClicked] Pulsante ${buttonIndex} della notifica ${notificationId} cliccato.`);
    // L'azione è chiudere l'avviso senza aprire l'URL, come per il pulsante "Chiudi" dell'overlay.
    clearAlerts("notificationButtonClose");
});

// ---- CORE LOGIC FUNCTIONS ----

async function processAlarmQueue() {
    // 1. Recupera e svuota la coda in un'unica operazione per evitare race conditions
    const { alarmQueue } = await chrome.storage.local.get({ alarmQueue: [] });
    if (alarmQueue.length === 0) {
        debugLog(`[processAlarmQueue] Coda vuota, nessuna azione.`);
        return;
    }
    await chrome.storage.local.set({ alarmQueue: [] }); // Svuota subito

    debugLog(`[processAlarmQueue] Inizio elaborazione di ${alarmQueue.length} allarmi in coda.`);

    // 2. Trova l'allarme più recente tra quelli in coda
    const latestAlarm = alarmQueue.reduce((latest, current) => {
        return current.scheduledTime > latest.scheduledTime ? current : latest;
    });

    debugLog(`[processAlarmQueue] L'allarme più recente è: ${latestAlarm.name} (scadenza: ${new Date(latestAlarm.scheduledTime).toLocaleString()})`);

    // 3. Controlla le condizioni e, se superate, attiva la notifica
    const dayOfWeek = new Date(latestAlarm.scheduledTime).getDay().toString();
    const storageData = await chrome.storage.local.get(["dndDays", "alarmActive"]);

    if (storageData.alarmActive) {
        debugLog(`[processAlarmQueue] Allarmi ignorati perché una notifica è già attiva.`);
        return;
    }
    const dndDays = storageData.dndDays || [];
    if (dndDays.includes(dayOfWeek)) {
        debugLog(`[processAlarmQueue] Allarme ${latestAlarm.name} ignorato. Il giorno ${dayOfWeek} è "Non disturbare".`);
        return;
    }

    debugLog(`[processAlarmQueue] Processo l'allarme ${latestAlarm.name}.`);
    triggerNotification(latestAlarm);
}

function triggerNotification(alarm) {
    // Aggiungiamo un controllo per evitare race conditions.
    chrome.storage.local.get(["siteUrl", "overlayScope", "alarmActive"], (data) => {
        if (data.alarmActive) {
            debugLog(`[triggerNotification] Notifica per ${alarm.name} bloccata, un'altra è già attiva.`);
            return;
        }
        debugLog(`[triggerNotification] Allarme: ${alarm.name}`);
        const isEntry = ["morningIn", "afternoonIn"].includes(alarm.name);
        const isMorning = ["morningIn", "morningOut"].includes(alarm.name);
        const shiftPhase = chrome.i18n.getMessage(isEntry ? "in_label" : "out_label");
        const shiftPeriod = chrome.i18n.getMessage(isMorning ? "morning_label" : "afternoon_label");// 
        const notificationTitle = chrome.i18n.getMessage("notification_title", [shiftPhase, shiftPeriod]);
        const messageTemplate = data.siteUrl ? "notification_message_with_url" : "notification_message_default";
        const notificationMessage = chrome.i18n.getMessage(messageTemplate, [shiftPhase, shiftPeriod]);
        debugLog(`[triggerNotification] notificationTitle: ${notificationTitle}, notificationMessage: ${notificationMessage}`);
        createNotification(notificationTitle, notificationMessage);
        chrome.storage.local.set({ alarmActive: true });
        setNotificationBadge(true);
        if (data.overlayScope === "all") {
            injectOverlayInAllTabs();
        } else {
            injectOverlayInActiveTab();
        }
    });
}

function setAlarm(time, alarmName) {
    const now = new Date();
    const getNextAlarmTime = (time) => {
        const [hours, minutes] = time.split(":").map(Number);
        const alarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
        if (alarmTime <= now) {
            alarmTime.setTime(alarmTime.getTime() + ONE_DAY_MS);
            debugLog(`[setAlarm function] ${alarmName}, alarmTime è passato, aggiungo un giorno.`); 
        }
        return alarmTime.getTime();
    };
    const setTime = getNextAlarmTime(time);
    chrome.alarms.create(alarmName, { when: setTime, periodInMinutes: ONE_DAY_MIN });
    debugLog(`[setAlarm function] setAlarm ${alarmName} alle ${new Date(setTime).toLocaleString()}`);
    // Salva la prossima scadenza dell'allarme
    chrome.storage.local.get({ alarmNextFireTimes: {} }, (data) => {
        const updatedFireTimes = { ...data.alarmNextFireTimes, [alarmName]: setTime };
        chrome.storage.local.set({ alarmNextFireTimes: updatedFireTimes });
    });
}

function clearAlerts(action) {
    if (action === "clearAlerts") {
        chrome.storage.local.get(["siteUrl"], (data) => {
            if (data.siteUrl) {
                chrome.tabs.create({ url: data.siteUrl });
                debugLog(`[clearAlerts] (${action}) Tab aperto su URL: ${data.siteUrl}`);
            }
        });
    }
    removeOverlays();
    clearNotifications();
    setNotificationBadge(false);
    chrome.storage.local.set({ alarmActive: false });
    debugLog(`[clearAlerts] (${action}) Pulite tutte le notifiche e gli allarmi`);
}

function setOrClearAlarms(data) {
    ["morningIn", "morningOut", "afternoonIn", "afternoonOut"].forEach((alarmName) => {
        debugLog(`[setOrClearAlarms] Controllo l'allarme: ${alarmName} con valore: ${data[alarmName]}`);
        if (data[alarmName]) {
            setAlarm(data[alarmName], alarmName);
        } else {
            chrome.alarms.clear(alarmName, (wasCleared) => {
                if (wasCleared) {
                    debugLog(`[setOrClearAlarms] ${alarmName} cancellato`);
                    // Rimuovi la scadenza salvata
                    chrome.storage.local.get({ alarmNextFireTimes: {} }, (storageData) => {
                        const updatedFireTimes = { ...storageData.alarmNextFireTimes };
                        delete updatedFireTimes[alarmName];
                        chrome.storage.local.set({ alarmNextFireTimes: updatedFireTimes });
                    });
                }
            });
        }
    });
}

function setNotificationBadge(isVisible) {
    debugLog(`[setNotificationBadge] Imposto visibilità a: ${isVisible}`);
    if (isVisible) {
        chrome.action.setBadgeText({ text: "❕" });
        chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
    } else {
        chrome.action.setBadgeText({ text: "" });
    }
}

// ---- UI HELPER FUNCTIONS (Overlays & Notifications) ----

function removeOverlays() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            if (
                tab.id && 
                tab.url && 
                tab.url.startsWith("http")
            ) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        const overlay = document.getElementById("timbrapp-extension-overlay");
                        if (overlay) overlay.remove();
                    }
                }).then(() => {
                    debugLog(`[removeOverlays] Overlay rimosso da ${tab.url}`);
                }).catch((error) => {
                    debugLog(`[removeOverlays] Errore, impossibile rimuovere overlay da ${tab.url}: ${error.message}`);
                });
            }
        });
    });
}

function createNotification(title, message) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/128.png",
        title: title,
        message: message,
        requireInteraction: true,
        buttons: [
            { title: chrome.i18n.getMessage("notification_close_button") }
        ]
    }, (notificationId) => {
        chrome.storage.local.get({ notificationIds: [] }, (data) => {
            const updatedIds = [...data.notificationIds, notificationId];
            chrome.storage.local.set({ notificationIds: updatedIds });
            debugLog(`[onAlarm] Notifica creata: ${notificationId}`);
        });
    });
}

function clearNotifications() {
    chrome.storage.local.get("notificationIds", (data) => {
        if (data.notificationIds && data.notificationIds.length > 0) {
            debugLog(`[clearNotifications] Trovate ${data.notificationIds.length} notifiche da chiudere.`);
            data.notificationIds.forEach((notificationId) => {
                chrome.notifications.clear(notificationId, () => {
                    debugLog(`[clearNotifications] Notifica ${notificationId} chiusa da array.`);
                });
            });
            chrome.storage.local.remove("notificationIds");
        } else {
            debugLog("[clearNotifications] Nessuna notifica da chiudere.");
        }
    });
}

async function injectOverlayInActiveTab() {
    const hasPermissions = await chrome.permissions.contains({
        origins: ["https://*/*", "http://*/*"],
    });
    if (!hasPermissions) {
        debugLog("[injectOverlayInActiveTab] Permessi host non concessi. Impossibile iniettare l'overlay.");
        return;
    }
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
        debugLog("[injectOverlayInActiveTab] Nessun tab attivo trovato.");
        return;
    }
    const activeTab = tabs[0];
    if (activeTab.id && activeTab.url && activeTab.url.startsWith("http")) {
        injectOverlay(activeTab.id, activeTab.url, "injectOverlayInActiveTab");
    }
}

async function injectOverlayInAllTabs() {
    const hasPermissions = await chrome.permissions.contains({
        origins: ["https://*/*", "http://*/*"],
    });
    if (!hasPermissions) {
        debugLog("[injectOverlayInAllTabs] Permessi host non concessi. Impossibile iniettare l'overlay.");
        return;
    }
    const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
    for (const tab of tabs) {
        injectOverlay(tab.id, tab.url, "injectOverlayInAllTabs");
    }
}

async function injectOverlay(tabId, tabUrl, source) {
    try {
        await chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ["overlay.css"],
        });
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["overlay.js"],
        });
        debugLog(`[${source}] Overlay iniettato in ${tabUrl}`);
    } catch (error) {
        debugLog(`[${source}] Errore, impossibile iniettare overlay in ${tabUrl}: ${error.message}`);
    }
}