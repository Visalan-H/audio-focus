# Audio Focus

A lightweight Chrome extension that automatically mutes background tabs so only one tab plays audio at a time.

<p align="center">
  <a href="https://github.com/Visalan-H/tab-audio-organizer/archive/refs/heads/main.zip" style="background-color:#000000;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Download ZIP</a>
</p>

## What it does

- Detects which tab is currently playing audio
- Keeps that tab unmuted
- Automatically mutes all other tabs
- Instantly restores audio when playback stops
- Transfers focus when you start playing audio in another tab

## Why use it

Prevents overlapping audio from multiple tabs. Useful when switching between videos, music, meetings, or any media-heavy browsing.

## How it works

A content script listens to `play`, `pause`, and `ended` events directly on media elements inside each page. This fires instantly when audio stops or starts, without waiting for Chrome's tab audible detection which can lag by several seconds.

The background service worker maintains a map of which tabs are playing and which tabs it has muted. When all audio stops, it unmutes those tabs immediately without querying the tab list again. Focus follows the active tab — if you start playing audio in the tab you are currently on, that tab takes priority.

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

- Click the extension icon to toggle ON or OFF
- When enabled, only one tab plays audio at a time and all others are muted automatically
- Switching to a tab that is already playing transfers audio focus to it
- Starting playback in your current tab transfers focus away from any background tab

## Notes

- Uses direct DOM event listeners for near-instant mute and unmute response
- Falls back to Chrome's `tab.audible` signal for tabs using the Web Audio API without media elements
- Works on any site with standard `<audio>` or `<video>` elements