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
    const siteUrl = document.getElementById("site-url");
    const statusNotification = document.getElementById("status-notification");
    const updateStatus = () => {
        chrome.storage.local.get(["morningIn", "morningOut", "afternoonIn", "afternoonOut", "siteUrl"], (data) => {
            if (data.morningIn || data.morningOut || data.afternoonIn || data.afternoonOut) {
                statusNotification.textContent = "ON";
                statusNotification.classList.add("enabled");
                statusNotification.classList.remove("disabled");
                morningIn.value = data.morningIn || "";
                morningOut.value = data.morningOut || "";
                afternoonIn.value = data.afternoonIn || "";
                afternoonOut.value = data.afternoonOut || "";
                siteUrl.value = data.siteUrl || "";
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
    const siteUrl = document.getElementById("site-url").value;
    chrome.storage.local.set({ morningIn, morningOut, afternoonIn, afternoonOut, siteUrl }, () => {
        chrome.runtime.sendMessage({ action: "setAlarms" });
        showSaved(chrome.i18n.getMessage("settings_saved"));
    });
});

document.getElementById("clean-settings").addEventListener("click", () => {
    document.getElementById("morning-in").value = "";
    document.getElementById("morning-out").value = "";
    document.getElementById("afternoon-in").value = "";
    document.getElementById("afternoon-out").value = "";
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