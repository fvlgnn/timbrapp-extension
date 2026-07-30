document.addEventListener("DOMContentLoaded", () => {
    // ---- Funzione di Debug ----
    // In release, la CI scrive la versione reale in manifest.json e rimuove version_name (vedi .github/workflows/main.yml)
    const manifestData = chrome.runtime.getManifest();
    const DEBUG_MODE = manifestData.version === "0.0.0";

    const debugLog = (...args) => {
        if (DEBUG_MODE) console.log("[Options]", ...args);
    };

    // ---- Inizializzazione: Traduzioni e Versione ----
    document.querySelectorAll("[data-i18n]").forEach((element) => {
        const key = element.getAttribute("data-i18n");
        element.textContent = chrome.i18n.getMessage(key);
    });
    document.querySelectorAll("[data-i18n-title]").forEach((element) => {
        const key = element.getAttribute("data-i18n-title");
        element.title = chrome.i18n.getMessage(key);
    });
    const versionElement = document.getElementById("app-version");
    if (versionElement) {
        versionElement.textContent = `v${manifestData.version}`;
    }
    const devBadge = document.getElementById("dev-badge");
    if (devBadge && manifestData.version_name) {
        devBadge.textContent = manifestData.version_name.toUpperCase();
        devBadge.classList.remove("hidden");
    }

    // ---- Riferimenti agli elementi del DOM ----
    const morningIn = document.getElementById("morning-in");
    const morningOut = document.getElementById("morning-out");
    const afternoonIn = document.getElementById("afternoon-in");
    const afternoonOut = document.getElementById("afternoon-out");
    const overlayScope = document.getElementById("overlay-scope");
    const snoozeDelay = document.getElementById("snooze-delay");
    const siteUrl = document.getElementById("site-url");
    const statusNotification = document.getElementById("status-notification");
    const helpIcon = document.getElementById("help-icon");
    const helpPanel = document.getElementById("help-panel");
    const closeHelpButton = document.getElementById("close-help");
    const helpBody = document.getElementById("help-body");

    // ---- Funzioni per la gestione dei permessi ----
    const HOST_PERMISSIONS = { origins: ["https://*/*", "http://*/*"] };

    // Richiede i permessi per accedere a tutti i siti
    async function requestHostPermission() {
        try {
            const granted = await chrome.permissions.request(HOST_PERMISSIONS);
            debugLog("Richiesta permessi host. Concessi:", granted);
            return granted;
        } catch (err) {
            debugLog("Errore durante la richiesta dei permessi:", err);
            return false;
        }
    }

    // Rimuove i permessi per accedere a tutti i siti
    async function removeHostPermission() {
        try {
            const removed = await chrome.permissions.remove(HOST_PERMISSIONS);
            debugLog("Rimozione permessi host. Rimossi:", removed);
            return removed;
        } catch (err) {
            debugLog("Errore durante la rimozione dei permessi:", err);
            return false;
        }
    }

    // ---- Funzioni principali ----

    // Carica le impostazioni e aggiorna l'interfaccia
    const loadAndDisplaySettings = async () => {
        debugLog("Avvio caricamento impostazioni...");
        const keys = ["morningIn", "morningOut", "afternoonIn", "afternoonOut", "overlayScope", "siteUrl", "dndDays", "notificationsEnabled", "snoozeDelayMinutes"];
        const data = await chrome.storage.local.get(keys);
        debugLog("Dati caricati da storage:", data);
        // Popola sempre tutti i campi
        morningIn.value = data.morningIn || "";
        morningOut.value = data.morningOut || "";
        afternoonIn.value = data.afternoonIn || "";
        afternoonOut.value = data.afternoonOut || "";
        siteUrl.value = data.siteUrl || "";
        snoozeDelay.value = String(data.snoozeDelayMinutes || 5);

        // Sincronizza lo stato del selettore overlay con i permessi reali
        const hasPermissions = await chrome.permissions.contains(HOST_PERMISSIONS);
        debugLog("Controllo permessi host:", hasPermissions);
        const savedScope = data.overlayScope || "none";

        if (hasPermissions) {
            // Se abbiamo i permessi, l'opzione salvata (active o all) è valida.
            overlayScope.value = savedScope === "none" ? "active" : savedScope; // Default a 'active' se lo stato è inconsistente
            debugLog("Permessi presenti. Valore overlayScope impostato a:", overlayScope.value);
        } else {
            // Se non abbiamo i permessi, l'unica opzione valida è 'none'.
            overlayScope.value = "none";
            debugLog("Permessi assenti. Valore overlayScope impostato a 'none'.");
        }

        const dndDays = data.dndDays || [];
        document.querySelectorAll("#dnd-days input[type='checkbox']").forEach(cb => {
            cb.checked = dndDays.includes(cb.value);
        });

        // Aggiorna l'indicatore di stato (anche cliccabile, se ci sono orari impostati)
        const hasTimes = !!(data.morningIn || data.morningOut || data.afternoonIn || data.afternoonOut);
        updateStatusIndicator(hasTimes, data.notificationsEnabled !== false);
    };

    // Aggiorna le classi dell'indicatore di stato (icona fissa, il colore di sfondo comunica
    // lo stato). Cliccabile solo se ci sono orari impostati: altrimenti non c'è nulla da
    // abilitare/disabilitare.
    function updateStatusIndicator(hasTimes, notificationsEnabled) {
        const isOn = hasTimes && notificationsEnabled;
        debugLog(`Stato: ${isOn ? "ON" : "OFF"} (orari impostati: ${hasTimes}, notifiche abilitate: ${notificationsEnabled})`);
        statusNotification.classList.toggle("enabled", isOn);
        statusNotification.classList.toggle("disabled", hasTimes && !isOn);
        statusNotification.classList.toggle("clickable", hasTimes);

        const tooltipKey = !hasTimes
            ? "status_toggle_tooltip_no_times"
            : isOn
                ? "status_toggle_tooltip_disable"
                : "status_toggle_tooltip_enable";
        statusNotification.title = chrome.i18n.getMessage(tooltipKey);
    }

    // Mostra il messaggio di conferma salvataggio
    function showSaved(message) {
        const savedElement = document.getElementById("saved");
        savedElement.querySelector(".saved-message").textContent = message;
        savedElement.classList.remove("hidden");
        savedElement.classList.add("visible");
        setTimeout(() => {
            savedElement.classList.remove("visible");
            savedElement.classList.add("hidden");
        }, 2400);
    }

    // ---- Event Listeners ----

    // Pulsante Salva
    document.getElementById("save-settings").addEventListener("click", () => {
        debugLog("Click su Salva.");
        const settings = {
            morningIn: morningIn.value,
            morningOut: morningOut.value,
            afternoonIn: afternoonIn.value,
            afternoonOut: afternoonOut.value,
            overlayScope: overlayScope.value,
            snoozeDelayMinutes: parseInt(snoozeDelay.value, 10),
            dndDays: Array.from(document.querySelectorAll("#dnd-days input[type='checkbox']:checked")).map(cb => cb.value),
            siteUrl: siteUrl.value
        };

        debugLog("Salvataggio impostazioni:", settings);
        chrome.storage.local.set(settings, () => {
            chrome.runtime.sendMessage({ action: "setAlarms" });
            debugLog("Messaggio 'setAlarms' inviato al background script.");
            showSaved(chrome.i18n.getMessage("settings_saved"));
            loadAndDisplaySettings(); // Aggiorna l'interfaccia dopo il salvataggio
        });
    });

    // Indicatore di stato: cliccabile per abilitare/disabilitare i promemoria senza toccare gli orari salvati
    statusNotification.addEventListener("click", async () => {
        const data = await chrome.storage.local.get(["morningIn", "morningOut", "afternoonIn", "afternoonOut", "notificationsEnabled"]);
        const hasTimes = !!(data.morningIn || data.morningOut || data.afternoonIn || data.afternoonOut);
        if (!hasTimes) return; // Niente da abilitare/disabilitare

        const newEnabled = data.notificationsEnabled === false;
        debugLog(`Click su indicatore di stato. Notifiche: ${newEnabled ? "abilitate" : "disabilitate"}.`);
        await chrome.storage.local.set({ notificationsEnabled: newEnabled });
        updateStatusIndicator(hasTimes, newEnabled);
        chrome.runtime.sendMessage({ action: "setAlarms" });
    });

    // Pulsante Svuota Campi
    document.getElementById("clean-settings").addEventListener("click", () => {
        debugLog("Click su Svuota Campi.");
        morningIn.value = "";
        morningOut.value = "";
        afternoonIn.value = "";
        afternoonOut.value = "";
        siteUrl.value = "";
        overlayScope.value = "none";
        snoozeDelay.value = "5";
        document.querySelectorAll("#dnd-days input[type='checkbox']").forEach(cb => {
            cb.checked = false;
        });
    });

    // Gestisce il cambio di selezione per l'overlay e i relativi permessi
    overlayScope.addEventListener("change", async (event) => {
        const selectedValue = event.target.value;
        debugLog(`Selezione overlay cambiata a: '${selectedValue}'`);

        if (selectedValue === "active" || selectedValue === "all") {
            // L'utente vuole attivare un overlay, richiedi il permesso se non già presente
            const hasPermissions = await chrome.permissions.contains(HOST_PERMISSIONS);
            if (!hasPermissions) {
                debugLog("Permessi non presenti, avvio richiesta...");
                const granted = await requestHostPermission();
                if (!granted) {
                    // L'utente ha negato il permesso, reimposta il selettore su "none"
                    overlayScope.value = "none";
                }
            }
        } else { // selectedValue === "none"
            debugLog("Selezionato 'none', avvio revoca permessi...");
            // L'utente ha disabilitato l'overlay, revochiamo i permessi se presenti
            const hasPermissions = await chrome.permissions.contains(HOST_PERMISSIONS);
            if (hasPermissions) {
                await removeHostPermission();
            }
        }
    });

    // ---- Gestione Pannello di Aiuto ----

    const HELP_SECTION_IDS = {
        it: "utilizzo",
        en: "usage"
        // Aggiungi altre lingue qui, es: de: 'anwendung'
    };
    const DEFAULT_HELP_LANG = "en";

    // Funzione per mostrare il pannello
    const showHelpPanel = async () => {
        // Carica il contenuto solo se non è già stato caricato
        if (helpBody.textContent.trim() === "") {
            helpBody.innerHTML = `<p>${chrome.i18n.getMessage("help_loading")}</p>`;
            try {
                const readmeUrl = chrome.runtime.getURL("README.html");
                const response = await fetch(readmeUrl);
                if (!response.ok) throw new Error(`Errore di rete: ${response.status} ${response.statusText}`);
                const text = await response.text();
                if (!text) throw new Error("Il file README.html è vuoto o non leggibile.");

                const parser = new DOMParser();
                const doc = parser.parseFromString(text, "text/html");

                // Determina la sezione da mostrare in base alla lingua dell'interfaccia
                const uiLang = chrome.i18n.getUILanguage().split("-")[0]; // Prende solo 'it' da 'it-IT'
                const sectionId = HELP_SECTION_IDS[uiLang] || HELP_SECTION_IDS[DEFAULT_HELP_LANG];
                debugLog(`Lingua UI: ${uiLang}. Cerco la sezione di aiuto con id: '${sectionId}'`);

                const usageSection = doc.getElementById(sectionId);
                if (usageSection) {
                    let content = usageSection.outerHTML;
                    let nextElement = usageSection.nextElementSibling;
                    // Aggiungi gli elementi successivi fino alla prossima sezione H3
                    while (nextElement && nextElement.tagName !== "H3") {
                        content += nextElement.outerHTML;
                        nextElement = nextElement.nextElementSibling;
                    }
                    helpBody.innerHTML = content;
                } else {
                    debugLog(`Sezione con id '${sectionId}' non trovata nel README.html.`);
                    helpBody.textContent = chrome.i18n.getMessage("help_content_not_found");
                }
            } catch (error) {
                debugLog("Errore nel caricamento della guida:", error);
                helpBody.textContent = chrome.i18n.getMessage("help_load_error", [error.message]);
            }
        }
        helpPanel.classList.remove("hidden");
    };

    // Funzione per nascondere il pannello
    const hideHelpPanel = () => helpPanel.classList.add("hidden");

    helpIcon.addEventListener("click", showHelpPanel);
    closeHelpButton.addEventListener("click", hideHelpPanel);
    helpPanel.addEventListener("click", (event) => {
        if (event.target === helpPanel) hideHelpPanel(); // Chiudi cliccando sullo sfondo
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !helpPanel.classList.contains("hidden")) hideHelpPanel(); // Chiudi con 'Esc'
    });

    // ---- Esecuzione iniziale ----
    loadAndDisplaySettings();
});