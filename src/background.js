const DEBUG_MODE = true;

const debugLog = (...args) => {
    if (DEBUG_MODE) console.log(...args);
};

chrome.runtime.onInstalled.addListener((detail) => {
    debugLog(`onInstalled: ${detail.reason}`);
    if (detail.reason === "install") {
        chrome.storage.sync.set({ alarmActive: false });
        chrome.tabs.create({ url: chrome.runtime.getURL("README.html") });
    }
});

chrome.runtime.onStartup.addListener(() => {
    debugLog("onStartup");
    chrome.storage.sync.get(["alarmActive", "morningIn", "morningOut", "afternoonIn", "afternoonOut"], (data) => {
        debugLog(`alarmActive: ${data.alarmActive}`);
        debugLog(`morningIn: ${data.morningIn}`);
        debugLog(`morningOut: ${data.morningOut}`);
        debugLog(`afternoonIn: ${data.afternoonIn}`);
        debugLog(`afternoonOut: ${data.afternoonOut}`);
        if (data.alarmActive) {
            chrome.action.setBadgeText({ text: "▲" });
            chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
            debugLog("Ripristino gli allarmi da onStartup");
            if (data.morningIn) {
                setAlarm(data.morningIn, "morningIn");
            }
            if (data.morningOut) {
                setAlarm(data.morningIn, "morningOut");
            }
            if (data.afternoonIn) {
                setAlarm(data.afternoonIn, "afternoonIn");
            }
            if (data.afternoonOut) {
                setAlarm(data.afternoonIn, "afternoonOut");
            }
        }
    });
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "setAlarms") {
        chrome.storage.sync.get(["morningIn", "morningOut", "afternoonIn", "afternoonOut"], (data) => {
            if (data.morningIn) {
                setAlarm(data.morningIn, "morningIn");
            } else {
                chrome.alarms.clear("morningIn", (alarmClear) => {
                    if (alarmClear) debugLog("morningIn cancellato");
                });
            }
            if (data.morningOut) {
                setAlarm(data.morningOut, "morningOut");
            } else {
                chrome.alarms.clear("morningOut", (alarmClear) => {
                    if (alarmClear) debugLog("morningOut cancellato");
                });
            }
            if (data.afternoonIn) {
                setAlarm(data.afternoonIn, "afternoonIn");
            } else {
                chrome.alarms.clear("afternoonIn", (alarmClear) => {
                    if (alarmClear) debugLog("afternoonIn cancellato");
                });
            }
            if (data.afternoonOut) {
                setAlarm(data.afternoonOut, "afternoonOut");
            } else {
                chrome.alarms.clear("afternoonOut", (alarmClear) => {
                    if (alarmClear) debugLog("afternoonOut cancellato");
                });
            }
        });
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    debugLog(`Allarme: ${alarm.name}`);
    const isEntry = ["morningIn", "afternoonIn"].includes(alarm.name);
    const isMorning = ["morningIn", "morningOut"].includes(alarm.name);
    debugLog(`isEntry: ${isEntry}`);
    debugLog(`isMorning: ${isMorning}`);
    const shiftPhase = chrome.i18n.getMessage(isEntry ? "in_label" : "out_label");
    const shiftPeriod = chrome.i18n.getMessage(isMorning ? "morning_label" : "afternoon_label");
    chrome.storage.sync.get(["siteUrl"], (data) => {
        const notificationTitle = chrome.i18n.getMessage("notification_title");
        const messageTemplate = data.siteUrl ? "notification_message_with_url" : "notification_message_default";
        const notificationMessage = chrome.i18n.getMessage(messageTemplate, [shiftPhase, shiftPeriod]);
        chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/128.png",
            title: notificationTitle,
            message: notificationMessage,
            priority: 2,
            requireInteraction: true
        }, (notificationId) => {
            chrome.storage.local.get({ notificationIds: [] }, (data) => {
                const updatedIds = [...data.notificationIds, notificationId];
                chrome.storage.local.set({ notificationIds: updatedIds });
                debugLog(`Notifica creata: ${notificationId}`);
            });
        });
        chrome.storage.sync.set({ alarmActive: true });
        chrome.action.setBadgeText({ text: "❕" });
        chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
    });
});

chrome.action.onClicked.addListener((tab) => {
    chrome.storage.sync.get(["siteUrl", "alarmActive"], (data) => {
        if (data.alarmActive) {
            chrome.action.setBadgeText({ text: "" });
            chrome.storage.local.get("notificationIds", (data) => {
                if (data.notificationIds && data.notificationIds.length > 0) {
                    data.notificationIds.forEach((notificationId) => {
                        chrome.notifications.clear(notificationId, () => {
                            debugLog(`Notifica ${notificationId} chiusa da array.`);
                        });
                    });
                    chrome.storage.local.remove("notificationIds");
                }
            });
            if (data.siteUrl) {
                chrome.tabs.create({ url: data.siteUrl });
            }
            chrome.storage.sync.set({ alarmActive: false });
        } else {
            chrome.runtime.openOptionsPage();
        }
    });
});

chrome.notifications.onClicked.addListener((notificationId) => {
    chrome.storage.sync.get(["siteUrl", "alarmActive"], (data) => {
        if (data.siteUrl && data.alarmActive) {
            chrome.tabs.create({ url: data.siteUrl });
        }
    });
    chrome.notifications.clear(notificationId, () => {
        debugLog(`Notifica ${notificationId} chiusa singolarmente.`);
    });
    debugLog("Rimuovi la notifica dall'array in storage");
    chrome.storage.local.get({ notificationIds: [] }, (data) => {
        const updatedIds = data.notificationIds.filter(id => id !== notificationId);
        chrome.storage.local.set({ notificationIds: updatedIds });
    });
    chrome.action.setBadgeText({ text: "" });
    chrome.storage.sync.set({ alarmActive: false });
});

function setAlarm(time, alarmName) {
    const now = new Date();
    const getNextAlarmTime = (time) => {
        const [hours, minutes] = time.split(":").map(Number);
        const alarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
        if (alarmTime <= now) {
            alarmTime.setTime(alarmTime.getTime() + 86400000); // NOTE 24h * 60' * 60'' * 1000ms = 86400000ms
            debugLog(`${alarmName}, alarmTime è passato, aggiungo un giorno.`); 
        }
        return alarmTime.getTime();
    };
    const setTime = getNextAlarmTime(time);
    chrome.alarms.clear(alarmName, () => {
        chrome.alarms.create(alarmName, { when: setTime, periodInMinutes: 1440 }); // NOTE 24h * 60' = 1440'
        debugLog(`setAlarm ${alarmName} alle ${new Date(setTime).toLocaleString()}`); 
    });
}
