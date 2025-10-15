// ---- CONSTANTS AND CONFIGURATION ----

const DEBUG_MODE = true;

const NAME_PREFIX = "timbrapp-extension";
const NOTIFICATION_ID = `${NAME_PREFIX}-main-notification`;
const MAIN_ALARM_NAME = `${NAME_PREFIX}-main-alarm`;
const HEALTH_CHECK_ALARM_NAME = `${NAME_PREFIX}-health-check`;

const debugLog = (...args) => {
    if (DEBUG_MODE) console.log(...args);
};

// ---- CHROME RUNTIME EVENTS (Lifecycle) ----

chrome.runtime.onInstalled.addListener((detail) => {
    debugLog(`[onInstalled] Evento: ${detail.reason}.`);
    initializeExtensionState();
    if (detail.reason === "install") {
        debugLog("[onInstalled] Prima installazione, apro la pagina README.");
        chrome.tabs.create({ url: chrome.runtime.getURL("README.html") });
    }
});

chrome.runtime.onStartup.addListener(() => {
    debugLog("[onStartup] Avvio l'estensione.");
    initializeExtensionState();
});

// ---- CHROME API EVENTS (User Actions & Alarms) ----

chrome.runtime.onMessage.addListener(async (message) => {
    debugLog(`[onMessage] Ricevuto messaggio:`, message);
    if (message.action === "setAlarms") {
        await calculateAndSetNextAlarm();
    }
    if (message.action === "resolveAlert" || message.action === "dismissAlert" || message.action === "snoozeAlert") {
        await handleAlertAction(message.action);
    }
});

// Promise per serializzare la gestione degli allarmi ed evitare race conditions
let alarmHandlerPromise = Promise.resolve();

// Listener principale per tutti gli allarmi.
chrome.alarms.onAlarm.addListener((alarm) => {
    // Accoda l'elaborazione dell'allarme per garantire che vengano gestiti uno alla volta.
    alarmHandlerPromise = alarmHandlerPromise
        .then(async () => {
            // Allarme principale
            if (alarm.name === MAIN_ALARM_NAME) { 
                debugLog(`[onAlarm] Allarme principale scattato.`);
                // Il nome dell'allarme scattato è nel nostro storage
                const { nextAlarm } = await chrome.storage.local.get("nextAlarm");
                await triggerNotification(nextAlarm || { name: "generic" });
                // Dopo aver gestito l'allarme, calcola il prossimo.
                await calculateAndSetNextAlarm();
            } else if (alarm.name === HEALTH_CHECK_ALARM_NAME) {
                debugLog(`[onAlarm] Controllo periodico di stato.`);
                await checkMissedAlarm();
            }
        })
        .catch((err) => debugLog("[onAlarm] Errore nella catena di promise:", err));
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

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    const { overlayTabIds = [] } = await chrome.storage.local.get("overlayTabIds");
    if (overlayTabIds.includes(tabId)) {
        const newOverlayTabIds = overlayTabIds.filter(id => id !== tabId);
        await chrome.storage.local.set({ overlayTabIds: newOverlayTabIds });
        debugLog(`[tabs.onRemoved] Rimosso tab ${tabId} dalla lista degli overlay.`);
    }
});

// ---- CORE LOGIC FUNCTIONS ----

async function initializeExtensionState() {
    debugLog("[initializeExtensionState] Inizializzazione stato estensione...");
    const { alarmActive } = await chrome.storage.local.get("alarmActive");
    const isActive = typeof alarmActive === "undefined" ? false : alarmActive;
    await chrome.storage.local.set({ alarmActive: isActive });
    setNotificationBadge(isActive);
    debugLog(`[initializeExtensionState] Stato allarme ripristinato a: ${isActive}`);

    // Controlla se abbiamo perso un allarme durante l'inattività
    await checkMissedAlarm();
    // Assicura che il prossimo allarme sia correttamente impostato
    await calculateAndSetNextAlarm();
    // Imposta l'allarme di controllo periodico per gestire il risveglio dall'ibernazione
    chrome.alarms.create(HEALTH_CHECK_ALARM_NAME, { periodInMinutes: 4 });
    debugLog("[initializeExtensionState] Allarme di controllo periodico impostato.");
}

async function checkMissedAlarm() {
    debugLog("[checkMissedAlarm] Controllo allarme perso...");
    const data = await chrome.storage.local.get([
        "nextAlarm",
        "morningIn",
        "morningOut",
        "afternoonIn",
        "afternoonOut",
        "dndDays",
    ]);
    const { nextAlarm, dndDays = [] } = data;
    const now = Date.now();

    if (nextAlarm && nextAlarm.time < now) {
        debugLog(`[checkMissedAlarm] Trovato allarme perso. Previsto per: ${new Date(nextAlarm.time).toLocaleString()}`);
        const missedSince = nextAlarm.time;
        let missedAlarmsCount = 0;

        const alarmTimes = [
            { name: "morningIn", time: data.morningIn },
            { name: "morningOut", time: data.morningOut },
            { name: "afternoonIn", time: data.afternoonIn },
            { name: "afternoonOut", time: data.afternoonOut },
        ].filter((a) => a.time);

        // Itera sui giorni dall'allarme perso fino ad oggi
        for (let d = new Date(missedSince); d.getTime() <= now; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay().toString();
            if (dndDays.includes(dayOfWeek)) continue; // Salta i giorni DND

            // Controlla ogni allarme configurato per quel giorno
            for (const alarm of alarmTimes) {
                const [hours, minutes] = alarm.time.split(":").map(Number);
                const candidateTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes).getTime();

                if (candidateTime > missedSince && candidateTime < now) {
                    missedAlarmsCount++;
                }
            }
        }
        // Aggiungiamo l'allarme originale che ha dato il via al controllo
        missedAlarmsCount++; 
        debugLog(`[checkMissedAlarm] Calcolati ${missedAlarmsCount} allarmi persi.`);

        if (missedAlarmsCount > 1) {
            debugLog("[checkMissedAlarm] Più di un allarme perso. Invio notifica generica.");
            await triggerNotification({ name: "generic" });
        } else {
            debugLog(`[checkMissedAlarm] Trovato allarme perso recente: ${nextAlarm.name}. Scateno la notifica.`);
            debugLog(`[checkMissedAlarm] Un solo allarme perso: ${nextAlarm.name}. Invio notifica specifica.`);
            await triggerNotification(nextAlarm);
        }
    }
}

async function calculateAndSetNextAlarm() {
    debugLog("[calculateAndSetNextAlarm] Calcolo del prossimo allarme...");
    const { morningIn, morningOut, afternoonIn, afternoonOut, dndDays = [] } = await chrome.storage.local.get([
        "morningIn",
        "morningOut",
        "afternoonIn",
        "afternoonOut",
        "dndDays",
    ]);

    const alarmTimes = [
        { name: "morningIn", time: morningIn },
        { name: "morningOut", time: morningOut },
        { name: "afternoonIn", time: afternoonIn },
        { name: "afternoonOut", time: afternoonOut },
    ].filter((a) => a.time);

    if (alarmTimes.length === 0) {
        debugLog("[calculateAndSetNextAlarm] Nessun orario impostato. Cancello tutti gli allarmi.");
        await chrome.alarms.clearAll();
        await chrome.storage.local.remove("nextAlarm");
        return;
    }

    const now = new Date();
    let nextAlarm = null;

    for (const alarm of alarmTimes) {
        const [hours, minutes] = alarm.time.split(":").map(Number);

        // Cerca il prossimo giorno valido nei prossimi 7 giorni
        for (let i = 0; i < 7; i++) {
            const candidateDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hours, minutes, 0, 0);
            const dayOfWeek = candidateDate.getDay().toString();

            // Se il giorno non è DND e l'orario è nel futuro
            if (!dndDays.includes(dayOfWeek) && candidateDate.getTime() > now.getTime()) {
                // Se è il primo allarme valido trovato o se è precedente a quello già trovato
                if (!nextAlarm || candidateDate.getTime() < nextAlarm.time) {
                    nextAlarm = { name: alarm.name, time: candidateDate.getTime() };
                }
                // Trovato il primo giorno valido per questo orario, passa al prossimo tipo di allarme
                break;
            }
        }
    }

    // Pulisce l'allarme principale per sicurezza e tiene solo quello di health check
    await chrome.alarms.clear(MAIN_ALARM_NAME);

    if (nextAlarm) {
        debugLog(`[calculateAndSetNextAlarm] Prossimo allarme: ${nextAlarm.name} il ${new Date(nextAlarm.time).toLocaleString()}`);
        await chrome.storage.local.set({ nextAlarm: nextAlarm });
        chrome.alarms.create(MAIN_ALARM_NAME, { when: nextAlarm.time });
    } else {
        debugLog("[calculateAndSetNextAlarm] Nessun allarme valido trovato nel futuro.");
        await chrome.storage.local.remove("nextAlarm");
    }
}

async function triggerNotification(alarm) {
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

async function handleAlertAction(action) {
    debugLog(`[handleAlertAction] Inizio gestione azione: ${action}`);
    try {
        if (action === "resolveAlert") {
            const { siteUrl } = await chrome.storage.local.get("siteUrl");
            if (siteUrl) {
                chrome.tabs.create({ url: siteUrl });
                debugLog(`[handleAlertAction] (${action}) Tab aperto su URL: ${siteUrl}.`);
            }
        }
        await clearNotifications();
        await removeOverlays();
        if (action !== "snoozeAlert") {
            setNotificationBadge(false);
            await chrome.storage.local.set({ alarmActive: false });
            // Dopo aver gestito l'allarme, ricalcola il prossimo
            await calculateAndSetNextAlarm();
        }
        debugLog(`[handleAlertAction] Stato di allerta resettato per ${action}.`);
    } catch (error) {
        debugLog(`[handleAlertAction] Errore: ${error && error.message ? error.message : error}`);
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

async function clearNotifications() {
    await chrome.notifications.clear(NOTIFICATION_ID);
    debugLog(`[clearNotifications] Chiusura della notifica: ${NOTIFICATION_ID}`);
}

async function removeOverlays() {
    const hasPermissions = await chrome.permissions.contains({
        origins: ["https://*/*", "http://*/*"],
    });
    if (!hasPermissions) {
        debugLog("[removeOverlays] Permessi host non concessi. Impossibile rimuovere gli overlay.");
        return;
    }
    const { overlayTabIds } = await chrome.storage.local.get("overlayTabIds");
    if (!overlayTabIds || overlayTabIds.length === 0) {
        debugLog("[removeOverlays] Nessun overlay da rimuovere.");
        return;
    }
    for (const tabId of overlayTabIds) {
        try {
            // Tenta di rimuovere lo script. Se il tab è stato chiuso
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    const overlay = document.getElementById("timbrapp-extension-overlay");
                    if (overlay) overlay.remove();
                },
            });
            debugLog(`[removeOverlays] Overlay rimosso dal tab ${tabId}`);
        } catch (error) {
            debugLog(`[removeOverlays] Impossibile rimuovere l'overlay dal tab ${tabId} (potrebbe essere stato chiuso): ${error.message}`);
        }
    }
    // Una volta terminato, pulisce la lista dallo storage.
    await chrome.storage.local.remove("overlayTabIds");
}

async function createNotification(title, message) {
    await chrome.notifications.create(NOTIFICATION_ID, {
        type: "basic",
        iconUrl: "icons/128.png",
        title: title,
        message: message,
        requireInteraction: true,
        buttons: [{ title: chrome.i18n.getMessage("notification_close_button") }]
    });
    debugLog(`[createNotification] Notifica creata/aggiornata con ID: ${NOTIFICATION_ID}`);
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
        // Salva l'ID del tab in cui l'overlay è stato iniettato con successo.
        const { overlayTabIds = [] } = await chrome.storage.local.get("overlayTabIds");
        if (!overlayTabIds.includes(tabId)) {
            await chrome.storage.local.set({ overlayTabIds: [...overlayTabIds, tabId] });
            debugLog(`[${source}] Overlay iniettato e registrato per il tabId ${tabId} (URL: ${tabUrl})`);
        }
    } catch (error) {
        debugLog(`[${source}] Errore, impossibile iniettare overlay in ${tabUrl}: ${error.message}`);
    }
}
