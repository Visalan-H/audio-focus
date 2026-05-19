const masterToggle = document.getElementById("masterToggle");
const modeMuteBtn = document.getElementById("modeMute");
const modeDuckBtn = document.getElementById("modeDuck");
const duckPanel = document.getElementById("duckPanel");
const duckSlider = document.getElementById("duckSlider");
const duckValueLabel = document.getElementById("duckValueLabel");
const sliderFill = document.getElementById("sliderFill");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const mainContent = document.getElementById("mainContent");

chrome.storage.local.get(["enabled", "mode", "duckVolume"], (res) => {
    const isEnabled = res.enabled !== false;
    const savedMode = res.mode || "mute";
    const savedVolume = res.duckVolume !== undefined ? res.duckVolume : 20;

    masterToggle.checked = isEnabled;
    applyEnabled(isEnabled);
    applyMode(savedMode);
    applyDuckVolume(savedVolume);
});

masterToggle.addEventListener("change", () => {
    const on = masterToggle.checked;
    chrome.storage.local.set({ enabled: on });
    applyEnabled(on);
});

modeMuteBtn.addEventListener("click", () => selectMode("mute"));
modeDuckBtn.addEventListener("click", () => selectMode("duck"));

function selectMode(m) {
    chrome.storage.local.set({ mode: m });
    applyMode(m);
}

duckSlider.addEventListener("input", () => {
    const v = parseInt(duckSlider.value, 10);
    applyDuckVolume(v);
    chrome.storage.local.set({ duckVolume: v });
});

function applyEnabled(on) {
    document.body.classList.toggle("disabled", !on);
    mainContent.style.opacity = on ? "1" : "0.35";
    mainContent.style.pointerEvents = on ? "" : "none";
    updateStatus(on, document.querySelector(".pill.active")?.dataset.mode || "mute",
        parseInt(duckSlider.value, 10));
}

function applyMode(m) {
    modeMuteBtn.classList.toggle("active", m === "mute");
    modeDuckBtn.classList.toggle("active", m === "duck");
    duckPanel.classList.toggle("visible", m === "duck");
    updateStatus(masterToggle.checked, m, parseInt(duckSlider.value, 10));
}

function applyDuckVolume(v) {
    duckSlider.value = v;
    duckValueLabel.textContent = v + "%";
    // Update the track fill visually
    const pct = ((v - 1) / 98) * 100;
    sliderFill.style.width = pct + "%";
    updateStatus(masterToggle.checked,
        document.querySelector(".pill.active")?.dataset.mode || "mute", v);
}

function updateStatus(on, m, vol) {
    if (!on) {
        statusDot.className = "status-dot off";
        statusText.textContent = "Disabled — all audio playing freely";
        return;
    }
    statusDot.className = "status-dot on";
    if (m === "mute") {
        statusText.textContent = "Active — background tabs muted";
    } else {
        statusText.textContent = `Active — background tabs at ${vol}%`;
    }
}