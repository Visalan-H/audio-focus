console.log("Audio Focus background script started");

let enabled = true;
let mode = "mute"; // "mute" | "duck"
let duckVolume = 20; // 0–100
let focusedTabId = null;
let activeTabId = null;
const playingTabs = new Set();
const mutedByUs = new Set();
const duckedByUs = new Set();

// ─── Load persisted settings ───────────────────────────────────────────────
chrome.storage.local.get(["enabled", "mode", "duckVolume"], (res) => {
    if (chrome.runtime.lastError || !res) return;
    if (res.enabled !== undefined) enabled = res.enabled;
    if (res.mode !== undefined) mode = res.mode;
    if (res.duckVolume !== undefined) duckVolume = res.duckVolume;
});

// React to popup changes immediately
chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled !== undefined) {
        enabled = changes.enabled.newValue;
        handleAudioFocus();
    }
    if (changes.mode !== undefined) {
        // Restore everything with the OLD mode before switching
        restoreAll();
        mode = changes.mode.newValue;
        handleAudioFocus();
    }
    if (changes.duckVolume !== undefined) {
        duckVolume = changes.duckVolume.newValue;
        // Live-update any already-ducked tabs
        if (mode === "duck") {
            for (const tabId of duckedByUs) {
                sendVolumeMsg(tabId, duckVolume / 100);
            }
        }
    }
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) activeTabId = tabs[0].id;
});

// ─── Helpers ───────────────────────────────────────────────────────────────
function sendVolumeMsg(tabId, volume) {
    chrome.tabs.sendMessage(tabId, { type: "SET_VOLUME", volume },
        () => void chrome.runtime.lastError);
}

function sendRestoreMsg(tabId) {
    chrome.tabs.sendMessage(tabId, { type: "RESTORE_VOLUME" },
        () => void chrome.runtime.lastError);
}

function muteTab(tabId) {
    if (mode === "mute") {
        chrome.tabs.update(tabId, { muted: true }, () => void chrome.runtime.lastError);
        mutedByUs.add(tabId);
    } else {
        // Duck mode: lower volume via content script
        sendVolumeMsg(tabId, duckVolume / 100);
        duckedByUs.add(tabId);
    }
}

function unmuteTab(tabId) {
    if (mutedByUs.has(tabId)) {
        chrome.tabs.update(tabId, { muted: false }, () => void chrome.runtime.lastError);
        mutedByUs.delete(tabId);
    }
    if (duckedByUs.has(tabId)) {
        sendRestoreMsg(tabId);
        duckedByUs.delete(tabId);
    }
}

function restoreAll() {
    for (const id of mutedByUs) {
        chrome.tabs.update(id, { muted: false }, () => void chrome.runtime.lastError);
    }
    mutedByUs.clear();

    for (const id of duckedByUs) {
        sendRestoreMsg(id);
    }
    duckedByUs.clear();

    focusedTabId = null;
}

function unmutAll() {
    restoreAll();
}

function pickNewFocus() {
    if (playingTabs.has(focusedTabId)) return;
    focusedTabId = playingTabs.size > 0 ? [...playingTabs][0] : null;
}

async function handleAudioFocus() {
    if (!enabled) {
        unmutAll();
        return;
    }
    try {
        const tabs = await chrome.tabs.query({});
        const openIds = new Set(tabs.map(t => t.id));

        for (const id of playingTabs) if (!openIds.has(id)) playingTabs.delete(id);
        for (const id of mutedByUs) if (!openIds.has(id)) mutedByUs.delete(id);
        for (const id of duckedByUs) if (!openIds.has(id)) duckedByUs.delete(id);

        pickNewFocus();

        if (!focusedTabId) {
            unmutAll();
            return;
        }

        for (const tab of tabs) {
            if (tab.id === undefined) continue;

            if (tab.id === focusedTabId) {
                // Focused tab — make sure it's not muted/ducked by us
                if (mutedByUs.has(tab.id)) unmuteTab(tab.id);
                if (duckedByUs.has(tab.id)) unmuteTab(tab.id);
            } else {
                // Background tab — apply current mode
                const alreadyMuted = tab.mutedInfo?.muted && mutedByUs.has(tab.id);
                const alreadyDucked = duckedByUs.has(tab.id);

                if (mode === "mute" && !alreadyMuted) {
                    // Remove any duck first (mode may have just changed)
                    if (duckedByUs.has(tab.id)) {
                        sendRestoreMsg(tab.id);
                        duckedByUs.delete(tab.id);
                    }
                    muteTab(tab.id);
                } else if (mode === "duck" && !alreadyDucked) {
                    // Remove any hard mute first
                    if (mutedByUs.has(tab.id)) {
                        chrome.tabs.update(tab.id, { muted: false }, () => void chrome.runtime.lastError);
                        mutedByUs.delete(tab.id);
                    }
                    muteTab(tab.id);
                }
            }
        }
    } catch (err) {
        console.error("handleAudioFocus error:", err);
    }
}

// ─── Message listeners ─────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender) => {
    if (!sender.tab?.id) return;
    const tabId = sender.tab.id;

    if (msg.type === "MEDIA_PLAYING") {
        if (playingTabs.has(tabId)) return;
        playingTabs.add(tabId);
        if (!focusedTabId || tabId === activeTabId) focusedTabId = tabId;
        handleAudioFocus();

    } else if (msg.type === "MEDIA_STOPPED") {
        if (!playingTabs.has(tabId)) return;
        playingTabs.delete(tabId);
        if (focusedTabId === tabId) focusedTabId = null;
        if (playingTabs.size === 0) {
            unmutAll();
        } else {
            pickNewFocus();
            handleAudioFocus();
        }
    }
});

// ─── Tab event listeners ────────────────────────────────────────────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.audible === true) {
        playingTabs.add(tabId);
        if (!focusedTabId || tabId === activeTabId) focusedTabId = tabId;
        handleAudioFocus();
    }
    if (changeInfo.audible === false) {
        playingTabs.delete(tabId);
        if (focusedTabId === tabId) focusedTabId = null;
        if (playingTabs.size === 0) {
            unmutAll();
        } else {
            pickNewFocus();
            handleAudioFocus();
        }
    }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    activeTabId = activeInfo.tabId;
    if (playingTabs.has(activeInfo.tabId)) {
        focusedTabId = activeInfo.tabId;
        handleAudioFocus();
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    playingTabs.delete(tabId);
    mutedByUs.delete(tabId);
    duckedByUs.delete(tabId);
    if (focusedTabId === tabId) focusedTabId = null;
    if (playingTabs.size === 0) unmutAll();
    else handleAudioFocus();
});

setInterval(() => handleAudioFocus(), 2000);
handleAudioFocus();