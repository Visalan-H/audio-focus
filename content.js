const attached = new WeakSet();

function isAnyMediaPlaying() {
    return [...document.querySelectorAll("audio, video")].some(
        (m) => !m.paused && !m.ended && m.readyState > 2
    );
}
function notifyBackground() {
    const playing = isAnyMediaPlaying();
    chrome.runtime.sendMessage(
        { type: playing ? "MEDIA_PLAYING" : "MEDIA_STOPPED" },
        () => void chrome.runtime.lastError  
    );
}

function attachListeners(media) {
    if (attached.has(media)) return;
    attached.add(media);

    media.addEventListener("play", notifyBackground);
    media.addEventListener("pause", notifyBackground);
    media.addEventListener("ended", notifyBackground);
    media.addEventListener("emptied", notifyBackground);
}

document.querySelectorAll("audio, video").forEach(attachListeners);

const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;
            if (node.matches?.("audio, video")) attachListeners(node);
            node.querySelectorAll?.("audio, video").forEach(attachListeners);
        }
    }
});

observer.observe(document.documentElement, { childList: true, subtree: true }); 