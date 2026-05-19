// ─── Context guard ────────────────────────────────────────────────────────
function isContextValid() {
    try { return !!chrome.runtime?.id; } catch { return false; }
}

// Safe wrapper — guards before the call AND wraps the async lastError
// callback (which runs outside any try-catch and throws on dead context).
function safeSend(msg) {
    if (!isContextValid()) return;
    try {
        chrome.runtime.sendMessage(msg, () => {
            try { void chrome.runtime.lastError; } catch { }
        });
    } catch { }
}

// ─── Volume control state ─────────────────────────────────────────────────
let targetVolume = null;               // null = not ducking; 0..1 = duck level
const originalVolumes = new WeakMap(); // el → volume before we first touched it
const fadeTimers = new WeakMap(); // el → intervalId for in-progress fade

const FADE_STEP_MS = 30;
const FADE_DURATION = 600;

function fadeTo(el, toVolume, onDone) {
    if (fadeTimers.has(el)) {
        clearInterval(fadeTimers.get(el));
        fadeTimers.delete(el);
    }

    const from = el.volume;
    const delta = toVolume - from;
    if (Math.abs(delta) < 0.001) { el.volume = toVolume; onDone?.(); return; }

    const steps = Math.round(FADE_DURATION / FADE_STEP_MS);
    const stepSize = delta / steps;
    let current = from;

    const id = setInterval(() => {
        if (!isContextValid()) { clearInterval(id); fadeTimers.delete(el); return; }
        current += stepSize;
        if ((stepSize > 0 && current >= toVolume) ||
            (stepSize < 0 && current <= toVolume)) {
            el.volume = toVolume;
            clearInterval(id);
            fadeTimers.delete(el);
            onDone?.();
        } else {
            el.volume = Math.max(0, Math.min(1, current));
        }
    }, FADE_STEP_MS);

    fadeTimers.set(el, id);
}

// ─── Media detection ─────────────────────────────────────────────────────
const attached = new WeakSet();

function isAnyMediaPlaying() {
    // Exclude muted/zero-volume elements — autoplay muted videos on sites like
    // X or Reddit must not count as "playing audio", otherwise they block the
    // focused tab from regaining sound after the real video stops.
    return [...document.querySelectorAll("audio, video")].some(
        (m) => !m.paused && !m.ended && m.readyState > 2 && !m.muted && m.volume > 0
    );
}

function notifyBackground() {
    safeSend({ type: isAnyMediaPlaying() ? "MEDIA_PLAYING" : "MEDIA_STOPPED" });
}

function attachListeners(media) {
    if (attached.has(media)) return;
    attached.add(media);

    if (targetVolume !== null) {
        originalVolumes.set(media, media.volume);
        fadeTo(media, targetVolume);
    }

    media.addEventListener("play", notifyBackground);
    media.addEventListener("pause", notifyBackground);
    media.addEventListener("ended", notifyBackground);
    media.addEventListener("emptied", notifyBackground);
    // Re-check when a page mutes/unmutes the element programmatically
    media.addEventListener("volumechange", notifyBackground);
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

// ─── Volume message handler ───────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SET_VOLUME") {
        const newTarget = Math.max(0, Math.min(1, msg.volume));
        const wasAlreadyDucking = targetVolume !== null;
        targetVolume = newTarget;

        document.querySelectorAll("audio, video").forEach(el => {
            if (!wasAlreadyDucking) originalVolumes.set(el, el.volume);
            fadeTo(el, newTarget);
        });

    } else if (msg.type === "RESTORE_VOLUME") {
        targetVolume = null;

        document.querySelectorAll("audio, video").forEach(el => {
            const original = originalVolumes.has(el) ? originalVolumes.get(el) : el.volume;
            fadeTo(el, original, () => originalVolumes.delete(el));
        });
    }
});