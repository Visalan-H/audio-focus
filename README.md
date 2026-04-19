# Audio Focus

A lightweight Chrome extension that automatically mutes background tabs so only one tab plays audio at a time.

## What it does

* Detects which tab is currently playing audio
* Keeps that tab unmuted
* Automatically mutes all other tabs
* Restores audio when no tabs are playing

## Why use it

Prevents overlapping audio from multiple tabs.
Useful when switching between videos, music, meetings, or any media-heavy browsing.

## How it works

* Listens for tab audio activity (`tab.audible`)
* Prioritizes the active tab
* Applies muting and unmuting with minimal delay

## Installation

1. Go to `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select this project folder

## Usage

* Click the extension icon to toggle ON or OFF
* When enabled:

  * Only one tab can play audio at a time
  * Other tabs are muted automatically

## Notes

* Works best with sites like YouTube and Spotify
* Depends on Chrome’s `tab.audible` detection
* Behavior may vary slightly depending on the site
