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
    chrome.storage.sync.get(["alarmStatus", "morningTime", "afternoonTime"], (data) => {
        console.log(`alarmStatus: ${data.alarmStatus}`); // DEBUG
        if (data.alarmStatus) {
            chrome.action.setBadgeText({ text: "▲" });
            chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
            console.log("Ripristino gli allarmi da onStartup"); // DEBUG
            if (data.morningTime) {
                setAlarm(data.morningTime, "morningAlarm");
            }
            if (data.afternoonTime) {
                setAlarm(data.afternoonTime, "afternoonAlarm");
            }
        }
    });
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "setAlarms") {
        chrome.storage.sync.get(["morningTime", "afternoonTime"], (data) => {
            if (data.morningTime) {
                setAlarm(data.morningTime, "morningAlarm");
            } else {
                chrome.alarms.clear("morningAlarm", (alarmClear) => {
                    if (alarmClear) console.log("morningAlarm cancellato"); // DEBUG
                });
            }
            if (data.afternoonTime) {
                setAlarm(data.afternoonTime, "afternoonAlarm");
            } else {
                chrome.alarms.clear("afternoonAlarm", (alarmClear) => {
                    if (alarmClear) console.log("afternoonAlarm cancellato"); // DEBUG
                });
            }
        });
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    const alarmLabel = chrome.i18n.getMessage(
        alarm.name === "morningAlarm" ? "notification_morning_label" : "notification_afternoon_label"
    );
    console.log(`Allarme: ${alarm.name}`); // DEBUG 
    chrome.storage.sync.get(["url"], (data) => {
        const messageKey = data.url ? "notification_message_with_url" : "notification_message_default";
        const notificationMessage = chrome.i18n.getMessage(messageKey, [alarmLabel]);
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
    chrome.storage.sync.get(["url", "alarmStatus"], (data) => {
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
            if (data.url) {
                chrome.tabs.create({ url: data.url });
            }
            chrome.storage.sync.set({ alarmStatus: false });
        } else {
            chrome.runtime.openOptionsPage();
        }
    });
});

chrome.notifications.onClicked.addListener((notificationId) => {
    chrome.storage.sync.get("url", (data) => {
        if (data.url) {
            chrome.tabs.create({ url: data.url });
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
            console.log(`alarmTime ${alarmTime} per ${alarmName} è passato, aggiungo un giorno.`); // DEBUG 
        }
        return alarmTime.getTime();
    };
    const setTime = getNextAlarmTime(time);
    chrome.alarms.clear(alarmName, () => {
        chrome.alarms.create(alarmName, { when: setTime, periodInMinutes: 1440 }); // NOTE 24h * 60' = 1440'
        console.log(`setAlarm ${alarmName} alle ${new Date(setTime).toLocaleString()}`); // DEBUG 
    });
}
