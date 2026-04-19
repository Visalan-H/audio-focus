const toggle = document.getElementById("toggle");
const status = document.getElementById("status");

chrome.storage.local.get(["enabled"], (res) => {
    const isEnabled = res.enabled !== false;
    toggle.checked = isEnabled;
    updateText(isEnabled);
});

toggle.addEventListener("change", () => {
    const isEnabled = toggle.checked;

    chrome.storage.local.set({ enabled: isEnabled });

    updateText(isEnabled);
});

function updateText(enabled) {
    status.textContent = enabled
        ? "ON - Auto muting active"
        : "OFF - Disabled";
}
