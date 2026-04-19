console.log("Background script started");

let enabled = true;
let focusedTabId = null;
let activeTabId = null;
const playingTabs = new Set();
const mutedByUs = new Set();

chrome.storage.local.get(["enabled"], (res) => {
    if (chrome.runtime.lastError || !res) return;
    if (res.enabled !== undefined) enabled = res.enabled;
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) activeTabId = tabs[0].id;
});

function muteTab(tabId) {
    chrome.tabs.update(tabId, { muted: true }, () => void chrome.runtime.lastError);
    mutedByUs.add(tabId);
}

function unmuteTab(tabId) {
    chrome.tabs.update(tabId, { muted: false }, () => void chrome.runtime.lastError);
    mutedByUs.delete(tabId);
}

function unmutAll() {
    for (const tabId of mutedByUs) {
        chrome.tabs.update(tabId, { muted: false }, () => void chrome.runtime.lastError);
    }
    mutedByUs.clear();
    focusedTabId = null;
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

        pickNewFocus();

        if (!focusedTabId) {
            unmutAll();
            return;
        }

        for (const tab of tabs) {
            if (tab.id === undefined) continue;
            if (tab.id === focusedTabId) {
                if (tab.mutedInfo?.muted && mutedByUs.has(tab.id)) {
                    unmuteTab(tab.id);
                }
            } else {
                if (!tab.mutedInfo?.muted) {
                    muteTab(tab.id);
                }
            }
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

chrome.runtime.onMessage.addListener((msg, sender) => {
    if (!sender.tab?.id) return;
    const tabId = sender.tab.id;

    if (msg.type === "MEDIA_PLAYING") {
        if (playingTabs.has(tabId)) return;
        playingTabs.add(tabId);
        if (!focusedTabId || tabId === activeTabId) {
            focusedTabId = tabId;
        }
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
    if (focusedTabId === tabId) focusedTabId = null;
    if (playingTabs.size === 0) unmutAll();
    else handleAudioFocus();
});

setInterval(() => handleAudioFocus(), 2000);
handleAudioFocus();