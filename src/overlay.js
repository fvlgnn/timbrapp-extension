(function () {
    if (document.getElementById("timbrapp-overlay")) return; // Evita di creare più overlay

    // Crea il contenitore dell'overlay
    const overlay = document.createElement("div");
    overlay.id = "timbrapp-overlay";
    Object.assign(overlay.style, {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        backgroundColor: "#ffcc00",
        padding: "15px",
        border: "2px solid #333",
        color: "#333",
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        lineHeight: "1.5em",
        borderRadius: "8px",
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.3)",
        zIndex: "9999",
        maxWidth: "250px",
        textAlign: "center"
    });
    
    // Contenuto del banner
    chrome.storage.local.get(["siteUrl"], (data) => {
        const siteUrl = data.siteUrl;
        overlay.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px;">🔔 ${chrome.i18n.getMessage("overlay_label")}</div>
            <div data-action="clearAllAlerts"
                style="cursor: pointer; background-color: #0056b3; color: #fff; padding: 8px 12px; 
                border-radius: 4px; display: block; text-align: center; font-weight: bold; margin-bottom: 10px;">
                ${siteUrl ? `${chrome.i18n.getMessage("overlay_go")}` : `${chrome.i18n.getMessage("overlay_done")}`}
            </div>
            <div data-action="closeAllOverlays"
                style="cursor: pointer; background-color: #d32f2f; color: #fff; padding: 8px 12px; 
                border-radius: 4px; display: block; text-align: center; font-weight: bold;">
                ${chrome.i18n.getMessage("overlay_close")}
            </div>
        `;

        // Aggiunge il banner alla pagina
        document.body.appendChild(overlay);

        // Invia azione dichiarata nel data-action al background.js
        document.getElementById("timbrapp-overlay").addEventListener("click", (event) => {
            const action = event.target.dataset.action;
            if (!action) return; // Se non c'è data-action, esci
            overlay.remove();
            chrome.runtime.sendMessage({ action });
        });
    });
})();
