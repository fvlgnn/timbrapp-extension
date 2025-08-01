// ---- CONSTANTS AND CONFIGURATION ----

const DEBUG_MODE = true;
const ONE_DAY_MS = 86400000; // 24h * 60' * 60'' * 1000ms = 86400000ms
const ONE_DAY_MIN = 1440; // 24h * 60' = 1440'

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
    // Controlla se qualche allarme è stato mancato mentre il browser era chiuso
    chrome.storage.local.get(["lastClosedTime", "alarmNextFireTimes"], (data) => {
        const lastClosedTime = data.lastClosedTime ? new Date(data.lastClosedTime) : null;
        const now = new Date();
        const alarmNextFireTimes = data.alarmNextFireTimes || {};

        if (lastClosedTime) {
            debugLog(`[onStartup] Ultima chiusura: ${lastClosedTime.toLocaleString()}, Ora: ${now.toLocaleString()}`);
            for (const alarmName in alarmNextFireTimes) {
                const fireTime = new Date(alarmNextFireTimes[alarmName]);
                if (fireTime > lastClosedTime && fireTime <= now) {
                    debugLog(`[onStartup] Allarme "${alarmName}" mancato! Scadenza: ${fireTime.toLocaleString()}. Lo attivo ora.`);
                    triggerNotification({ name: alarmName }); // Attiva la notifica per l'allarme mancato
                    break; // Un solo avviso è sufficiente per attirare l'attenzione
                }
            }
        }

        // Ripristina sempre gli allarmi per le scadenze future
        chrome.storage.local.set({ lastClosedTime: now.toISOString() });
        debugLog(`[onStartup] Imposto lastClosedTime a: ${now.toISOString()}`);
    });
});

chrome.runtime.onSuspend.addListener(() => {
    const now = new Date();
    chrome.storage.local.set({ lastClosedTime: now.toISOString() });
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

chrome.alarms.onAlarm.addListener((alarm) => {
    const today = new Date();
    const dayOfWeek = today.getDay().toString(); // 0=Sun, 1=Mon, ...

    chrome.storage.local.get(["dndDays"], (data) => {
        const dndDays = data.dndDays || [];
        if (dndDays.includes(dayOfWeek)) {
            debugLog(`[onAlarm] Allarme ${alarm.name} ignorato. Oggi (${dayOfWeek}) è un giorno "Non disturbare".`);
            return; // Skip notification
        }
        debugLog(`[onAlarm] Allarme ${alarm.name} ricevuto e processato.`);
        triggerNotification(alarm);
    });
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

function triggerNotification(alarm) {
    debugLog(`[triggerNotification] Allarme: ${alarm.name}`);
    const isEntry = ["morningIn", "afternoonIn"].includes(alarm.name);
    const isMorning = ["morningIn", "morningOut"].includes(alarm.name);
    debugLog(`[triggerNotification] isEntry: ${isEntry}`);
    debugLog(`[triggerNotification] isMorning: ${isMorning}`);
    const shiftPhase = chrome.i18n.getMessage(isEntry ? "in_label" : "out_label");
    const shiftPeriod = chrome.i18n.getMessage(isMorning ? "morning_label" : "afternoon_label");
    chrome.storage.local.get(["siteUrl", "overlayScope"], (data) => {
        const notificationTitle = chrome.i18n.getMessage("notification_title", [shiftPhase, shiftPeriod]);
        const messageTemplate = data.siteUrl ? "notification_message_with_url" : "notification_message_default";
        const notificationMessage = chrome.i18n.getMessage(messageTemplate, [shiftPhase, shiftPeriod]);
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