const notificationTitle = chrome.i18n.getMessage("notification_title");

chrome.runtime.onInstalled.addListener((detail) => {
    console.log(`onInstalled: ${detail.reason}`); // DEBUG
    if (detail.reason === "install") {
        chrome.storage.sync.set({ alarmStatus: false });
        chrome.tabs.create({ url: chrome.runtime.getURL("README.html") });
    }
});

chrome.runtime.onStartup.addListener(() => {
    console.log("onStartup"); // DEBUG
    chrome.storage.sync.get(["alarmStatus", "morningIn", "morningOut", "afternoonIn", "afternoonOut"], (data) => {
        console.log(`alarmStatus: ${data.alarmStatus}`); // DEBUG
        if (data.alarmStatus) {
            chrome.action.setBadgeText({ text: "▲" });
            chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
            console.log("Ripristino gli allarmi da onStartup"); // DEBUG
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
                    if (alarmClear) console.log("morningIn cancellato"); // DEBUG
                });
            }
            if (data.morningOut) {
                setAlarm(data.morningOut, "morningOut");
            } else {
                chrome.alarms.clear("morningOut", (alarmClear) => {
                    if (alarmClear) console.log("morningOut cancellato"); // DEBUG
                });
            }
            if (data.afternoonIn) {
                setAlarm(data.afternoonIn, "afternoonIn");
            } else {
                chrome.alarms.clear("afternoonIn", (alarmClear) => {
                    if (alarmClear) console.log("afternoonIn cancellato"); // DEBUG
                });
            }
            if (data.afternoonOut) {
                setAlarm(data.afternoonOut, "afternoonOut");
            } else {
                chrome.alarms.clear("afternoonOut", (alarmClear) => {
                    if (alarmClear) console.log("afternoonOut cancellato"); // DEBUG
                });
            }
        });
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    const alarmType = chrome.i18n.getMessage(
        alarm.name == ("morningIn" || "afternoonIn") ? "in_label" : "out_label"
    );
    const alarmLabel = chrome.i18n.getMessage(
        alarm.name == ("morningIn" || "morningOut") ? "morning_label" : "afternoon_label"
    );
    console.log(`Allarme: ${alarm.name}`); // DEBUG 
    chrome.storage.sync.get(["siteUrl"], (data) => {
        const messageKey = data.siteUrl ? "notification_message_with_url" : "notification_message_default";
        const notificationMessage = chrome.i18n.getMessage(messageKey, [alarmType, alarmLabel]);
        chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/128.png",
            title: notificationTitle,
            message: notificationMessage,
            priority: 2,
            requireInteraction: true
        }, (notificationId) => {
            chrome.storage.local.set({ notificationId });
            console.log(`Notifica creata: ${notificationId}`); // DEBUG 
        });
        chrome.storage.sync.set({ alarmStatus: true });
        chrome.action.setBadgeText({ text: "▲" });
        chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
    });
});

chrome.action.onClicked.addListener((tab) => {
    chrome.storage.sync.get(["siteUrl", "alarmStatus"], (data) => {
        if (data.alarmStatus) {
            chrome.action.setBadgeText({ text: "" });
            chrome.storage.local.get("notificationId", (notificationData) => {
                if (notificationData.notificationId) {
                    chrome.notifications.clear(notificationData.notificationId, () => {
                        console.log(`Notifica ${notificationData.notificationId} recuperata e chiusa.`); // DEBUG
                    });
                    chrome.storage.local.remove("notificationId");
                }
            });
            if (data.siteUrl) {
                chrome.tabs.create({ url: data.siteUrl });
            }
            chrome.storage.sync.set({ alarmStatus: false });
        } else {
            chrome.runtime.openOptionsPage();
        }
    });
});

chrome.notifications.onClicked.addListener((notificationId) => {
    chrome.storage.sync.get("siteUrl", (data) => {
        if (data.siteUrl) {
            chrome.tabs.create({ url: data.siteUrl });
        }
    });
    chrome.action.setBadgeText({ text: "" });
    chrome.storage.sync.set({ alarmStatus: false });
});

function setAlarm(time, alarmName) {
    const now = new Date();
    const getNextAlarmTime = (time) => {
        const [hours, minutes] = time.split(":").map(Number);
        const alarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
        if (alarmTime <= now) {
            alarmTime.setTime(alarmTime.getTime() + 86400000); // NOTE 24h * 60' * 60'' * 1000ms = 86400000ms
            console.log(`${alarmName}, alarmTime è passato, aggiungo un giorno.`); // DEBUG 
        }
        return alarmTime.getTime();
    };
    const setTime = getNextAlarmTime(time);
    chrome.alarms.clear(alarmName, () => {
        chrome.alarms.create(alarmName, { when: setTime, periodInMinutes: 1440 }); // NOTE 24h * 60' = 1440'
        console.log(`setAlarm ${alarmName} alle ${new Date(setTime).toLocaleString()}`); // DEBUG 
    });
}
