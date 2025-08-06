(function () {
    if (document.getElementById("timbrapp-extension-overlay")) return;

    chrome.storage.local.get(["siteUrl"], (data) => {
        const siteUrl = data.siteUrl;

        // ---- Crea il contenitore principale ----
        const overlay = document.createElement("div");
        overlay.id = "timbrapp-extension-overlay";

        // ---- Crea il titolo ----
        const title = document.createElement("div");
        title.className = "timbrapp-extension-overlay__title";
        // Usiamo 'overlay_title' come preferito dall'utente
        title.innerHTML = `🔔 ${chrome.i18n.getMessage("overlay_title")}`;

        // ---- Crea il pulsante primario ----
        const primaryButton = document.createElement("div");
        primaryButton.className = "timbrapp-extension-overlay__button timbrapp-extension-overlay__button--primary";
        primaryButton.dataset.action = "resolveAlert";
        primaryButton.textContent = siteUrl ? chrome.i18n.getMessage("overlay_go") : chrome.i18n.getMessage("overlay_done");

        // ---- Aggiunge gli elementi al contenitore e poi al body ----
        overlay.append(title, primaryButton);

        // ---- Mostra il pulsante secondario solo se è stato impostato un URL. ----
        if (siteUrl) {
            const secondaryButton = document.createElement("div");
            secondaryButton.className = "timbrapp-extension-overlay__button timbrapp-extension-overlay__button--secondary";
            secondaryButton.dataset.action = "dismissAlert";
            secondaryButton.textContent = chrome.i18n.getMessage("overlay_done");
            overlay.appendChild(secondaryButton);
        }

        document.body.appendChild(overlay);

        // ---- Gestisce i click sui pulsanti ----
        overlay.addEventListener("click", (event) => {
            const actionTarget = event.target.closest("[data-action]");
            if (!actionTarget) return;

            const action = actionTarget.dataset.action;
            overlay.remove();
            chrome.runtime.sendMessage({ action });
        });
    });
})();
