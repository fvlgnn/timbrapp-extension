// ---- CONSTANTS AND CONFIGURATION ----

const DEBUG_MODE = true;
const ONE_DAY_MS = 86400000; // 24h * 60' * 60'' * 1000ms = 86400000ms
const ONE_DAY_MIN = 1440; // 24h * 60' = 1440'

const PROCESS_QUEUE_ALARM_NAME = "timbrapp-extension-process-alarm-queue";

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
    debugLog("[onStartup] Avvio l'estensione.");
    // Controlla se un allarme era attivo prima della chiusura e ripristina il badge.
    chrome.storage.local.get("alarmActive", (data) => {
        if (data.alarmActive) {
            debugLog("[onStartup] Trovato un allarme attivo. Ripristino il badge.");
            setNotificationBadge(true);
        }
    });
});

// ---- CHROME API EVENTS (User Actions & Alarms) ----

chrome.runtime.onMessage.addListener(async (message) => {
    debugLog(`[onMessage] Ricevuto messaggio:`, message);
    if (message.action === "setAlarms") {
        const data = await chrome.storage.local.get(["morningIn", "morningOut", "afternoonIn", "afternoonOut"]);
        await setOrClearAlarms(data);
    }
    if (message.action === "resolveAlert" || message.action === "dismissAlert") {
        await handleAlertAction(message.action);
    }
});

// Promise per serializzare la gestione degli allarmi ed evitare race conditions
let alarmHandlerPromise = Promise.resolve();

// Listener principale per tutti gli allarmi.
chrome.alarms.onAlarm.addListener((alarm) => {
    // Accoda l'elaborazione dell'allarme per garantire che vengano gestiti uno alla volta, race condition.
    alarmHandlerPromise = alarmHandlerPromise.then(async () => {
        // Se l'allarme che è scattato è quello per elaborare la coda, esegui la funzione e fermati qui.
        if (alarm.name === PROCESS_QUEUE_ALARM_NAME) {
            debugLog(`[onAlarm] Ricevuto allarme di elaborazione. Avvio processAlarmQueue.`);
            await processAlarmQueue();
            return;
        }

        // Altrimenti, è un allarme di notifica. Aggiungilo alla coda.
        debugLog(`[onAlarm] Ricevuto allarme di notifica: ${alarm.name}. Aggiungo alla coda.`);
        const { alarmQueue = [] } = await chrome.storage.local.get("alarmQueue");
        const newQueue = [...alarmQueue, alarm];
        await chrome.storage.local.set({ alarmQueue: newQueue });

        // Usa un allarme di 1 secondo come "debounce" per processare la coda, garantendo l'esecuzione.
        chrome.alarms.create(PROCESS_QUEUE_ALARM_NAME, { delayInMinutes: 1 / 60 });
    });
});

chrome.action.onClicked.addListener(async () => {
    const data = await chrome.storage.local.get("alarmActive");
    if (data.alarmActive) {
        debugLog("[onClicked action] Allarme attivo, eseguo resolveAlert.");
        await handleAlertAction("resolveAlert");
    } else {
        debugLog("[onClicked action] Nessun allarme attivo, apro la pagina delle opzioni.");
        chrome.runtime.openOptionsPage();
    }
});

chrome.notifications.onClicked.addListener(async (notificationId) => {
    debugLog(`[onClicked notification] Notifica ${notificationId} cliccata.`);
    await handleAlertAction("resolveAlert");
});

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
    debugLog(`[onButtonClicked] Pulsante ${buttonIndex} della notifica ${notificationId} cliccato.`);
    await handleAlertAction("dismissAlert");
});

// ---- CORE LOGIC FUNCTIONS ----

async function processAlarmQueue() {
    // 1. Recupera la coda dallo storage
    const { alarmQueue } = await chrome.storage.local.get({ alarmQueue: [] });
    if (alarmQueue.length === 0) {
        debugLog(`[processAlarmQueue] Coda vuota, nessuna azione.`);
        return;
    }
    // Salva il numero di allarmi PRIMA di svuotare la coda per una decisione affidabile.
    const alarmCount = alarmQueue.length;
    debugLog(`[processAlarmQueue] Trovati ${alarmCount} allarmi in coda.`);
    // Svuota subito la coda per evitare che venga riprocessata
    await chrome.storage.local.set({ alarmQueue: [] });

    debugLog(`[processAlarmQueue] Inizio elaborazione di ${alarmCount} allarmi in coda.`);

    // 2. Trova l'allarme più recente tra quelli in coda
    const latestAlarm = alarmQueue.reduce((latest, current) => {
        return current.scheduledTime > latest.scheduledTime ? current : latest;
    });

    debugLog(`[processAlarmQueue] L'allarme più recente è: ${latestAlarm.name} (scadenza: ${new Date(latestAlarm.scheduledTime).toLocaleString()})`);

    // 3. Controlla le condizioni DND usando l'orario dell'ultimo allarme
    const dayOfWeek = new Date(latestAlarm.scheduledTime).getDay().toString();
    const storageData = await chrome.storage.local.get(["dndDays"]);

    const dndDays = storageData.dndDays || [];
    if (dndDays.includes(dayOfWeek)) {
        debugLog(`[processAlarmQueue] Allarmi ignorati. Il giorno ${dayOfWeek} è "Non disturbare".`);
        return;
    }

    // 4. Decide se inviare una notifica generica o specifica
    if (alarmCount > 1) {
        debugLog(`[processAlarmQueue] Rilevati allarmi multipli. Invio notifica generica.`);
        triggerNotification({ name: "generic" }); // Usa un nome speciale per la notifica generica
    } else {
        debugLog(`[processAlarmQueue] Rilevato allarme singolo. Processo l'allarme ${latestAlarm.name}.`);
        triggerNotification(latestAlarm); // Usa l'allarme effettivo
    }
}

async function triggerNotification(alarm) {
    // Pulisce sempre qualsiasi stato di allarme precedente per garantire la sostituzione.
    debugLog(`[triggerNotification] Pulizia dello stato di allarme precedente prima di attivare ${alarm.name}.`);
    // await clearNotifications();
    // await removeOverlays();
    removeOverlays();
    clearNotifications();

    debugLog(`[triggerNotification] Attivazione notifica per: ${alarm.name}`);
    const data = await chrome.storage.local.get(["siteUrl", "overlayScope"]);
    
    let notificationTitle;
    let notificationMessage;

    if (alarm.name === "generic") {
        notificationTitle = chrome.i18n.getMessage("notification_title_generic");
        const messageTemplate = data.siteUrl ? "notification_message_generic_with_url" : "notification_message_generic_default";
        notificationMessage = chrome.i18n.getMessage(messageTemplate);
    } else {
        const isEntry = ["morningIn", "afternoonIn"].includes(alarm.name);
        const isMorning = ["morningIn", "morningOut"].includes(alarm.name);
        const shiftPhase = chrome.i18n.getMessage(isEntry ? "in_label" : "out_label");
        const shiftPeriod = chrome.i18n.getMessage(isMorning ? "morning_label" : "afternoon_label");
        notificationTitle = chrome.i18n.getMessage("notification_title", [shiftPhase, shiftPeriod]);
        const messageTemplate = data.siteUrl ? "notification_message_with_url" : "notification_message_default";
        notificationMessage = chrome.i18n.getMessage(messageTemplate, [shiftPhase, shiftPeriod]);
    }

    await createNotification(notificationTitle, notificationMessage);
    await chrome.storage.local.set({ alarmActive: true });
    setNotificationBadge(true);

    if (data.overlayScope === "all") {
        await injectOverlayInAllTabs();
    } else if (data.overlayScope === "active") {
        await injectOverlayInActiveTab();
    } else {
        debugLog(`[triggerNotification] Nessun overlay iniettato. overlayScope: ${data.overlayScope}`);
    }
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
    debugLog(`[setAlarm] Impostato allarme ${alarmName} per le ${new Date(setTime).toLocaleString()}`);
}

async function handleAlertAction(action) {
    if (action === "resolveAlert") {
        const { siteUrl } = await chrome.storage.local.get("siteUrl");
        if (siteUrl) {
            chrome.tabs.create({ url: siteUrl });
            debugLog(`[handleAlertAction] (${action}) Tab aperto su URL: ${siteUrl}.`);
        }
    }
    // await clearNotifications();
    // await removeOverlays();
    clearNotifications();
    removeOverlays();
    setNotificationBadge(false);
    await chrome.storage.local.set({ alarmActive: false });
    debugLog(`[handleAlertAction] (${action}) Pulite tutte le notifiche e gli allarmi`);
}

async function setOrClearAlarms(data) {
    const alarmNames = ["morningIn", "morningOut", "afternoonIn", "afternoonOut"];
    for (const alarmName of alarmNames) {
        debugLog(`[setOrClearAlarms] Controllo l'allarme: ${alarmName} con valore: ${data[alarmName]}`);
        if (data[alarmName]) {
            setAlarm(data[alarmName], alarmName);
        } else {
            await chrome.alarms.clear(alarmName);
            debugLog(`[setOrClearAlarms] ${alarmName} cancellato`);
        }
    }
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

// async function clearNotifications() {
//     const { notificationIds } = await chrome.storage.local.get("notificationIds");
//     if (notificationIds && notificationIds.length > 0) {
//         debugLog(`[clearNotifications] Trovate ${notificationIds.length} notifiche da chiudere.`);
//         await Promise.all(
//             notificationIds.map(id =>
//                 chrome.notifications.clear(id).then(() =>
//                     debugLog(`[clearNotifications] Notifica ${id} chiusa da array.`)
//                 )
//             )
//         );
//         await chrome.storage.local.remove("notificationIds");
//     } else {
//         debugLog("[clearNotifications] Nessuna notifica da chiudere.");
//     }
// }
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

// async function removeOverlays() {
//     const tabs = await chrome.tabs.query({});
//     for (const tab of tabs) {
//         if (tab.id && tab.url && tab.url.startsWith("http")) {
//             try {
//                 await chrome.scripting.executeScript({
//                     target: { tabId: tab.id },
//                     func: () => {
//                         const overlay = document.getElementById("timbrapp-extension-overlay");
//                         if (overlay) overlay.remove();
//                     }
//                 });
//                 debugLog(`[removeOverlays] Overlay rimosso da ${tab.url}`);
//             } catch (error) {
//                 debugLog(`[removeOverlays] Errore, impossibile rimuovere overlay da ${tab.url}: ${error.message}`);
//             }
//         }
//     }
// }
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

async function createNotification(title, message) {
    const notificationId = await chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/128.png",
        title: title,
        message: message,
        requireInteraction: true,
        buttons: [{ title: chrome.i18n.getMessage("notification_close_button") }]
    });
    const { notificationIds = [] } = await chrome.storage.local.get("notificationIds");
    const updatedIds = [...notificationIds, notificationId];
    await chrome.storage.local.set({ notificationIds: updatedIds });
    debugLog(`[createNotification] Notifica creata: ${notificationId}`);
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
