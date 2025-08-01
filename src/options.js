document.addEventListener("DOMContentLoaded", () => {
    // ---- Funzione di Debug ----
    const DEBUG_MODE = true;

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
    const manifestData = chrome.runtime.getManifest();
    const versionElement = document.getElementById("app-version");
    if (versionElement) {
        versionElement.textContent = `v${manifestData.version}`;
    }

    // ---- Riferimenti agli elementi del DOM ----
    const morningIn = document.getElementById("morning-in");
    const morningOut = document.getElementById("morning-out");
    const afternoonIn = document.getElementById("afternoon-in");
    const afternoonOut = document.getElementById("afternoon-out");
    const overlayScope = document.getElementById("overlay-scope");
    const siteUrl = document.getElementById("site-url");
    const statusNotification = document.getElementById("status-notification");

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
        const keys = ["morningIn", "morningOut", "afternoonIn", "afternoonOut", "overlayScope", "siteUrl", "dndDays"];
        chrome.storage.local.get(keys, async (data) => {
            debugLog("Dati caricati da storage:", data);
            // Popola sempre tutti i campi
            morningIn.value = data.morningIn || "";
            morningOut.value = data.morningOut || "";
            afternoonIn.value = data.afternoonIn || "";
            afternoonOut.value = data.afternoonOut || "";
            siteUrl.value = data.siteUrl || "";

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

            // Aggiorna l'indicatore di stato in base agli orari
            if (data.morningIn || data.morningOut || data.afternoonIn || data.afternoonOut) {
                debugLog("Stato: ON");
                statusNotification.textContent = "ON";
                statusNotification.classList.add("enabled");
                statusNotification.classList.remove("disabled");
            } else {
                debugLog("Stato: OFF");
                statusNotification.textContent = "OFF";
                statusNotification.classList.add("disabled");
                statusNotification.classList.remove("enabled");
            }
        });
    };

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

    // Pulsante Svuota Campi
    document.getElementById("clean-settings").addEventListener("click", () => {
        debugLog("Click su Svuota Campi.");
        morningIn.value = "";
        morningOut.value = "";
        afternoonIn.value = "";
        afternoonOut.value = "";
        // Non svuota URL e altre opzioni per comodità dell'utente
        // document.querySelectorAll('#dnd-days input[type="checkbox"]').forEach(cb => {
        //     cb.checked = false;
        // });
        // document.getElementById("overlay-scope").value = "";
        // document.getElementById("site-url").value = "";
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

    // ---- Esecuzione iniziale ----
    loadAndDisplaySettings();
});