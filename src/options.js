document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-i18n]").forEach((element) => {
        const key = element.getAttribute("data-i18n");
        element.textContent = chrome.i18n.getMessage(key);
    });
    const manifestData = chrome.runtime.getManifest();
    document.getElementById("app-version").textContent = `v${manifestData.version}`;
    const morningIn = document.getElementById("morning-in");
    const morningOut = document.getElementById("morning-out");
    const afternoonIn = document.getElementById("afternoon-in");
    const afternoonOut = document.getElementById("afternoon-out");
    const overlayScope = document.getElementById("overlay-scope");
    const siteUrl = document.getElementById("site-url");
    const statusNotification = document.getElementById("status-notification");
    const updateStatus = () => {
        chrome.storage.local.get(["morningIn", "morningOut", "afternoonIn", "afternoonOut", "overlayScope", "siteUrl", "dndDays"], (data) => {
            if (data.morningIn || data.morningOut || data.afternoonIn || data.afternoonOut) {
                statusNotification.textContent = "ON";
                statusNotification.classList.add("enabled");
                statusNotification.classList.remove("disabled");
                morningIn.value = data.morningIn || "";
                morningOut.value = data.morningOut || "";
                afternoonIn.value = data.afternoonIn || "";
                afternoonOut.value = data.afternoonOut || "";
                overlayScope.value = data.overlayScope || "active";
                siteUrl.value = data.siteUrl || "";
                const dndDays = data.dndDays || [];
                document.querySelectorAll('.days-grid input[type="checkbox"]').forEach(cb => {
                    cb.checked = dndDays.includes(cb.value);
                });
            } else {
                statusNotification.textContent = "OFF";
                statusNotification.classList.add("disabled");
                statusNotification.classList.remove("enabled");
            }
        });
    };
    updateStatus();
    document.getElementById("save-settings").addEventListener("click", updateStatus);
});

document.getElementById("save-settings").addEventListener("click", () => {
    const morningIn = document.getElementById("morning-in").value;
    const morningOut = document.getElementById("morning-out").value;
    const afternoonIn = document.getElementById("afternoon-in").value;
    const afternoonOut = document.getElementById("afternoon-out").value;
    const overlayScope = document.getElementById("overlay-scope").value;
    const dndDays = Array.from(document.querySelectorAll('.days-grid input[type="checkbox"]:checked')).map(cb => cb.value);
    const siteUrl = document.getElementById("site-url").value;
    chrome.storage.local.set({ morningIn, morningOut, afternoonIn, afternoonOut, overlayScope, siteUrl, dndDays }, () => {
        chrome.runtime.sendMessage({ action: "setAlarms" });
        showSaved(chrome.i18n.getMessage("settings_saved"));
    });
});

document.getElementById("clean-settings").addEventListener("click", () => {
    document.getElementById("morning-in").value = "";
    document.getElementById("morning-out").value = "";
    document.getElementById("afternoon-in").value = "";
    document.getElementById("afternoon-out").value = "";
    document.querySelectorAll('.days-grid input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    // document.getElementById("overlay-scope").value = "";
    // document.getElementById("site-url").value = "";
});

function showSaved(message) {
    const savedElement = document.getElementById("saved");
    savedElement.textContent = message;
    savedElement.classList.remove("hidden");
    savedElement.classList.add("visible");
    setTimeout(() => {
        savedElement.classList.remove("visible");
        savedElement.classList.add("hidden");
    }, 2400);
}