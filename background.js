console.log("Background script started");

let enabled = true;

chrome.storage.local.get(["enabled"], (res) => {
    if (res.enabled !== undefined) {
        enabled = res.enabled;
    }
    console.log("Enabled state:", enabled);
});

async function handleAudioFocus() {
    console.log("Running audio focus");

    if (!enabled) {
        console.log("Disabled");
        return;
    }

    try {
        const tabs = await chrome.tabs.query({});
        console.log("Total tabs:", tabs.length);

        const audibleTabs = tabs.filter(tab => tab.audible);
        console.log("Audible tabs:", audibleTabs.map(t => t.id));

        if (audibleTabs.length === 0) {
            console.log("No audio → unmuting all");

            for (const tab of tabs) {
                if (tab.id !== undefined && tab.mutedInfo?.muted) {
                    chrome.tabs.update(tab.id, { muted: false });
                }
            }
            return;
        }

        const activeTab =
            audibleTabs.find(tab => tab.active) || audibleTabs[0];

        console.log("Active audio tab:", activeTab.id);

        for (const tab of tabs) {
            if (tab.id === undefined) continue;

            if (tab.id === activeTab.id) {
                if (tab.mutedInfo?.muted) {
                    chrome.tabs.update(tab.id, { muted: false });
                }
            } else {
                if (!tab.mutedInfo?.muted) {
                    chrome.tabs.update(tab.id, { muted: true });
                }
            }
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    console.log("onUpdated:", tabId, changeInfo);
    if (changeInfo.audible !== undefined) {
        handleAudioFocus();
    }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    console.log("onActivated:", activeInfo.tabId);
    handleAudioFocus();
});

chrome.tabs.onRemoved.addListener((tabId) => {
    console.log("onRemoved:", tabId);
    handleAudioFocus();
});

setInterval(() => {
    console.log("Polling...");
    handleAudioFocus();
}, 300);

handleAudioFocus();
