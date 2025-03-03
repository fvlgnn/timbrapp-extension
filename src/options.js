document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-i18n]").forEach((element) => {
        const key = element.getAttribute("data-i18n");
        element.textContent = chrome.i18n.getMessage(key);
    });
    const manifestData = chrome.runtime.getManifest();
    document.getElementById('appVersion').textContent = `v${manifestData.version}`;
    const morningIn = document.getElementById("morningIn");
    const morningOut = document.getElementById("morningOut");
    const afternoonIn = document.getElementById("afternoonIn");
    const afternoonOut = document.getElementById("afternoonOut");
    const siteUrl = document.getElementById("siteUrl");
    const statusNotification = document.getElementById("statusNotification");
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
    document.getElementById("saveSettings").addEventListener("click", updateStatus);
});

document.getElementById("saveSettings").addEventListener("click", () => {
    const morningIn = document.getElementById("morningIn").value;
    const morningOut = document.getElementById("morningOut").value;
    const afternoonIn = document.getElementById("afternoonIn").value;
    const afternoonOut = document.getElementById("afternoonOut").value;
    const siteUrl = document.getElementById("siteUrl").value;
    chrome.storage.local.set({ morningIn, morningOut, afternoonIn, afternoonOut, siteUrl }, () => {
        chrome.runtime.sendMessage({ action: "setAlarms" });
        showSaved(chrome.i18n.getMessage("settings_saved"));
    });
});

document.getElementById("cleanSettings").addEventListener("click", () => {
    document.getElementById("morningIn").value = "";
    document.getElementById("morningOut").value = "";
    document.getElementById("afternoonIn").value = "";
    document.getElementById("afternoonOut").value = "";
    // document.getElementById("siteUrl").value = "";
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