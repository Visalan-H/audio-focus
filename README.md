# Audio Focus

A lightweight Chrome extension that keeps one tab's audio in focus — automatically silencing or lowering the volume of every other tab.

<p align="center">
  <a href="https://github.com/Visalan-H/tab-audio-organizer/archive/refs/heads/main.zip" style="background-color:#000000;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Download ZIP</a>
</p>

## What it does

- Features a minimal, high-contrast dark UI inspired by Linear's design system
- Detects which tab is currently playing audio
- Keeps that tab at full volume
- Applies your chosen mode to all other tabs automatically
- Smoothly fades volume changes in and out instead of cutting instantly
- Instantly restores audio when playback stops
- Transfers focus when you switch to a tab or start playing audio in it

## Modes

### Mute
Completely mutes all background tabs using Chrome's native mute API. The speaker icon on the tab turns grey. Audio is restored the moment the focused tab stops playing.

### Duck
Lowers the volume of background tabs to a level you choose (1–99%), rather than silencing them completely. The volume slider in the popup sets the target level. Changes fade smoothly — both when ducking and when restoring — so there is no jarring cut.

Each element's original volume is saved before ducking and restored precisely to that value, so a tab that was already playing at 50% does not get bumped up to 100% when focus moves away from it.

## Why use it

Prevents overlapping audio from multiple tabs without losing track of what is playing in the background. Duck mode is useful when you want to stay aware of background audio — a meeting, a playlist, a stream — while keeping your focused tab clearly dominant.

## How it works

A content script listens to `play`, `pause`, and `ended` events directly on media elements inside each page. This fires instantly when audio stops or starts, without waiting for Chrome's tab audible detection which can lag by several seconds.

The background service worker maintains a set of which tabs are playing and which it has muted or ducked. When focus changes, it sends a `SET_VOLUME` message to the content script in each background tab, which fades the `.volume` property of every `<audio>` and `<video>` element over 600 ms. On restore, it fades each element back to its original volume. A `MutationObserver` catches dynamically added media elements and applies the current duck level to them immediately.

The extension falls back to Chrome's `tab.audible` signal for tabs that use the Web Audio API without standard media elements.

## Installation

- Download ZIP: [Download the main branch ZIP](https://github.com/Visalan-H/tab-audio-organizer/archive/refs/heads/main.zip)
- Extract the ZIP to a folder on your computer.
- In Chrome, Edge, or Brave:
  1. Go to `chrome://extensions/`
  2. Enable Developer mode (top-right toggle)
  3. Click "Load unpacked"
  4. Select the extracted folder (the one containing `manifest.json`)

Alternatively, clone the repository and load the project folder directly.

## Usage

- Click the extension icon to open the popup
- Use the power button to enable or disable the extension
- Select **Mute** or **Duck** mode with the mode buttons
- In Duck mode, drag the slider to set how loud background tabs should be (1–99%)
- Switching to a tab that is already playing transfers audio focus to it
- Starting playback in your current tab transfers focus away from any background tab

## Notes

- Volume fades over 600 ms for a smooth, natural transition
- Duck mode restores each tab to its original volume, not a hardcoded maximum
- Uses direct DOM event listeners for near-instant response
- Falls back to Chrome's `tab.audible` signal for Web Audio API tabs
- Works on any site with standard `<audio>` or `<video>` elements