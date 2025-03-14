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
    if (message.action === "clearAllAlerts") {
        clearAllAlerts();
    }
    if (message.action === "closeAllOverlays") {
        removeOverlays();
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    debugLog(`[onAlarm] Allarme: ${alarm.name}`);
    const isEntry = ["morningIn", "afternoonIn"].includes(alarm.name);
    const isMorning = ["morningIn", "morningOut"].includes(alarm.name);
    debugLog(`[onAlarm] isEntry: ${isEntry}`);
    debugLog(`[onAlarm] isMorning: ${isMorning}`);
    const shiftPhase = chrome.i18n.getMessage(isEntry ? "in_label" : "out_label");
    const shiftPeriod = chrome.i18n.getMessage(isMorning ? "morning_label" : "afternoon_label");
    chrome.storage.local.get(["siteUrl"], (data) => {
        const notificationTitle = chrome.i18n.getMessage("notification_title", [shiftPhase, shiftPeriod]);
        const messageTemplate = data.siteUrl ? "notification_message_with_url" : "notification_message_default";
        const notificationMessage = chrome.i18n.getMessage(messageTemplate, [shiftPhase, shiftPeriod]);
        createNotification(notificationTitle, notificationMessage);
        chrome.storage.local.set({ alarmActive: true });
        setNotificationBadge(true);
        injectOverlayInTabs();
    });
});

chrome.action.onClicked.addListener(() => {
    removeOverlays();
    chrome.storage.local.get(["siteUrl", "alarmActive"], (data) => {
        if (data.alarmActive) {
            setNotificationBadge(false);
            clearNotifications();
            if (data.siteUrl) {
                chrome.tabs.create({ url: data.siteUrl });
            }
            chrome.storage.local.set({ alarmActive: false });
        } else {
            chrome.runtime.openOptionsPage();
        }
    });
});

chrome.notifications.onClicked.addListener((notificationId) => {
    removeOverlays();
    chrome.storage.local.get(["siteUrl", "alarmActive"], (data) => {
        if (data.siteUrl && data.alarmActive) {
            chrome.tabs.create({ url: data.siteUrl });
        }
    });
    chrome.notifications.clear(notificationId, () => {
        debugLog(`[onClicked notification] Notifica ${notificationId} chiusa singolarmente.`);
    });
    debugLog("[onClicked notification] Rimozione ID notifica dall'array in storage");
    chrome.storage.local.get({ notificationIds: [] }, (data) => {
        const updatedIds = data.notificationIds.filter(id => id !== notificationId);
        chrome.storage.local.set({ notificationIds: updatedIds });
    });
    setNotificationBadge(false);
    chrome.storage.local.set({ alarmActive: false });
});

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
                        const overlay = document.getElementById("timbrapp-overlay");
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

function clearAllAlerts() {
    chrome.storage.local.get(["siteUrl"], (data) => {
        if (data.siteUrl) {
            chrome.tabs.create({ url: data.siteUrl });
        }
    });
    removeOverlays();
    clearNotifications();
    setNotificationBadge(false);
    chrome.storage.local.set({ alarmActive: false });
    debugLog("[clearAllAlerts] Pulite tutte le notifiche e gli allarmi");
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
        requireInteraction: true
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

function injectOverlayInTabs() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            if (
                tab.id && 
                tab.url && 
                tab.url.startsWith("http")
            ) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["overlay.js"]
                }).then(() => {
                    debugLog(`[injectOverlayInTabs] Overlay iniettato in ${tab.url}`);
                }).catch((error) => {
                    debugLog(`[injectOverlayInTabs] Errore, impossibile iniettare overlay in ${tab.url}: ${error.message}`);
                });
            }
        });
    });
}