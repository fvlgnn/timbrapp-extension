document.addEventListener("DOMContentLoaded", () => {
    // --- Inizializzazione: Traduzioni e Versione ---
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

    // --- Riferimenti agli elementi del DOM ---
    const morningIn = document.getElementById("morning-in");
    const morningOut = document.getElementById("morning-out");
    const afternoonIn = document.getElementById("afternoon-in");
    const afternoonOut = document.getElementById("afternoon-out");
    const overlayScope = document.getElementById("overlay-scope");
    const siteUrl = document.getElementById("site-url");
    const statusNotification = document.getElementById("status-notification");

    // --- Funzioni ---

    // Carica le impostazioni e aggiorna l'interfaccia
    const loadAndDisplaySettings = () => {
        const keys = ["morningIn", "morningOut", "afternoonIn", "afternoonOut", "overlayScope", "siteUrl", "dndDays"];
        chrome.storage.local.get(keys, (data) => {
            // Popola sempre tutti i campi
            morningIn.value = data.morningIn || "";
            morningOut.value = data.morningOut || "";
            afternoonIn.value = data.afternoonIn || "";
            afternoonOut.value = data.afternoonOut || "";
            overlayScope.value = data.overlayScope || "active";
            siteUrl.value = data.siteUrl || "";
            
            const dndDays = data.dndDays || [];
            document.querySelectorAll('#dnd-days input[type="checkbox"]').forEach(cb => {
                cb.checked = dndDays.includes(cb.value);
            });

            // Aggiorna l'indicatore di stato in base agli orari
            if (data.morningIn || data.morningOut || data.afternoonIn || data.afternoonOut) {
                statusNotification.textContent = "ON";
                statusNotification.classList.add("enabled");
                statusNotification.classList.remove("disabled");
            } else {
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

    // --- Event Listeners ---

    // Pulsante Salva
    document.getElementById("save-settings").addEventListener("click", () => {
        const settings = {
            morningIn: morningIn.value,
            morningOut: morningOut.value,
            afternoonIn: afternoonIn.value,
            afternoonOut: afternoonOut.value,
            overlayScope: overlayScope.value,
            dndDays: Array.from(document.querySelectorAll('#dnd-days input[type="checkbox"]:checked')).map(cb => cb.value),
            siteUrl: siteUrl.value
        };

        chrome.storage.local.set(settings, () => {
            chrome.runtime.sendMessage({ action: "setAlarms" });
            showSaved(chrome.i18n.getMessage("settings_saved"));
            loadAndDisplaySettings(); // Aggiorna l'interfaccia dopo il salvataggio
        });
    });

    // Pulsante Svuota Campi
    document.getElementById("clean-settings").addEventListener("click", () => {
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

    // --- Esecuzione iniziale ---
    loadAndDisplaySettings();
});