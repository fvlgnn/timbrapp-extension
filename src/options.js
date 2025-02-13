document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-i18n]").forEach((element) => {
        const key = element.getAttribute("data-i18n");
        element.textContent = chrome.i18n.getMessage(key);
    });
    const manifestData = chrome.runtime.getManifest();
    document.getElementById('appVersion').textContent = `v${manifestData.version}`;
    const morningTime = document.getElementById("morningTime");
    const afternoonTime = document.getElementById("afternoonTime");
    const url = document.getElementById("url");
    const statusNotification = document.getElementById("statusNotification");
    const updateStatus = () => {
        chrome.storage.sync.get(["morningTime", "afternoonTime", "url"], (data) => {
            if (data.morningTime || data.afternoonTime) {
                statusNotification.textContent = "ON";
                statusNotification.classList.add("enabled");
                statusNotification.classList.remove("disabled");
                morningTime.value = data.morningTime || "";
                afternoonTime.value = data.afternoonTime || "";
                url.value = data.url || "";
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
    const morningTime = document.getElementById("morningTime").value;
    const afternoonTime = document.getElementById("afternoonTime").value;
    const url = document.getElementById("url").value;
    chrome.storage.sync.set({ morningTime, afternoonTime, url }, () => {
        chrome.runtime.sendMessage({ action: "setAlarms" });
        showSaved(chrome.i18n.getMessage("settings_saved"));
    });
});

document.getElementById("cleanSettings").addEventListener("click", () => {
    document.getElementById("morningTime").value = "";
    document.getElementById("afternoonTime").value = "";
    document.getElementById("url").value = "";
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