const DEBUG_MODE = true;

const ONE_DAY_MS = 86400000; // 24h * 60' * 60'' * 1000ms = 86400000ms
const ONE_DAY_MIN = 1440; // 24h * 60' = 1440'

const debugLog = (...args) => {
    if (DEBUG_MODE) console.log(...args);
};

chrome.runtime.onInstalled.addListener((detail) => {
    debugLog(`[onInstalled] ${detail.reason}`);
    if (detail.reason === "install") {
        chrome.storage.local.set({ alarmActive: false });
        chrome.tabs.create({ url: chrome.runtime.getURL("README.html") });
    }
});

chrome.runtime.onStartup.addListener(() => {
    debugLog("[onStartup] Avvio l'estensione");
    chrome.storage.local.get(["alarmActive", "lastClosedTime", "morningIn", "morningOut", "afternoonIn", "afternoonOut"], (data) => {
        debugLog(`[onStartup] alarmActive: ${data.alarmActive} / lastClosedTime: ${data.lastClosedTime} / morningIn: ${data.morningIn} / morningOut: ${data.morningOut} / afternoonIn: ${data.afternoonIn} / afternoonOut: ${data.afternoonOut}`);
        const lastClosedTime = data.lastClosedTime ? new Date(data.lastClosedTime) : null;
        const now = new Date();
        if (data.alarmActive) {
            debugLog("[onStartup] Con allarme attivo abilito il badge");
            setNotificationBadge(true);
        } else {
            if (lastClosedTime && (now - lastClosedTime) > ONE_DAY_MS) {
                debugLog("[onStartup] Il browser è stato chiuso per più di 24 ore. Abilito alarmActive e il badge.");
                chrome.storage.local.set({ alarmActive: true });
                chrome.action.setBadgeText({ text: "▲" });
                chrome.action.setBadgeBackgroundColor({ color: "#FFFF00" });
            }
        }
        debugLog("[onStartup] Ripristino gli allarmi da onStartup");
        restoreAlarms(data);
        chrome.storage.local.set({ lastClosedTime: now.toISOString() });
        debugLog(`[onStartup] Imposto lastClosedTime alle ${data.lastClosedTime}`);
    });
});

chrome.runtime.onSuspend.addListener(() => {
    const now = new Date();
    chrome.storage.local.set({ lastClosedTime: now.toISOString() });
    debugLog(`[onSuspend] Browser chiuso alle ${now.toISOString()}`);
});

chrome.runtime.onMessage.addListener((message) => {
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
        // If not a DND day, proceed with notification
        triggerNotification(alarm);
    });
});

chrome.action.onClicked.addListener(() => {
    chrome.storage.local.get(["siteUrl", "alarmActive"], (data) => {
        if (data.alarmActive) {
            // setNotificationBadge(false);
            // clearNotifications();
            // if (data.siteUrl) {
            //     chrome.tabs.create({ url: data.siteUrl });
            // }
            // chrome.storage.local.set({ alarmActive: false });
            clearAlerts("clearAlerts");
        } else {
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
        if (data.overlayScope === 'all') {
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
    chrome.alarms.clear(alarmName, () => {
        chrome.alarms.create(alarmName, { when: setTime, periodInMinutes: ONE_DAY_MIN });
        debugLog(`[setAlarm function] setAlarm ${alarmName} alle ${new Date(setTime).toLocaleString()}`); 
    });
}

function setNotificationBadge(isVisible) {
    if (isVisible) {
        chrome.action.setBadgeText({ text: "❕" });
        chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
    } else {
        chrome.action.setBadgeText({ text: "" });
    }
}

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

function restoreAlarms(data) {
    if (data.morningIn) {
        setAlarm(data.morningIn, "morningIn");
    }
    if (data.morningOut) {
        setAlarm(data.morningOut, "morningOut");
    }
    if (data.afternoonIn) {
        setAlarm(data.afternoonIn, "afternoonIn");
    }
    if (data.afternoonOut) {
        setAlarm(data.afternoonOut, "afternoonOut");
    }
}

function setOrClearAlarms(data) {
    ["morningIn", "morningOut", "afternoonIn", "afternoonOut"].forEach((alarmName) => {
        if (data[alarmName]) {
            setAlarm(data[alarmName], alarmName);
        } else {
            chrome.alarms.clear(alarmName, (alarmClear) => {
                if (alarmClear) debugLog(`[onMessage] ${alarmName} cancellato`);
            });
        }
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
            data.notificationIds.forEach((notificationId) => {
                chrome.notifications.clear(notificationId, () => {
                    debugLog(`[clearNotifications] Notifica ${notificationId} chiusa da array.`);
                });
            });
            chrome.storage.local.remove("notificationIds");
        }
    });
}

function injectOverlayInActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
            debugLog("[injectOverlayInActiveTab] Nessun tab attivo trovato.");
            return;
        }
        const activeTab = tabs[0];
        if (activeTab.id && activeTab.url && activeTab.url.startsWith("http")) {
            injectOverlay(activeTab.id, activeTab.url, "injectOverlayInActiveTab");
        }
    });
}

function injectOverlayInAllTabs() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            if (tab.id && tab.url && tab.url.startsWith("http")) {
                injectOverlay(tab.id, tab.url, "injectOverlayInAllTabs");
            }
        });
    });
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