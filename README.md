# x-video

A lightweight Chrome extension to rotate, mirror, and scale HTML5 videos on the web, with picture-in-picture floating playback.

## Features

- **Rotate**: clockwise / counterclockwise by 90°, or any angle (0°–360°)
- **Mirror**: flip horizontally
- **Scale / position**: overall scale, per-axis scale, and fine position offsets
- **Picture-in-Picture**: enter or exit floating playback in one click
- **Per-page memory**: settings are saved per URL and restored on revisit
- **Keyboard shortcuts**: control without opening the popup
- **EN / ZH UI**: follows the browser language (`en` / `zh_CN`)

Extra tweaks for common sites like YouTube, Vimeo, and Dailymotion; on other pages it targets the largest `<video>` element when possible.

## Install

### Load unpacked (recommended)

1. Clone or download this repository
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select this project root
5. The **x-video** toolbar icon means it installed successfully

Requires **Chrome 114+** (Manifest V3).

## Usage

1. Open a page with an HTML5 video
2. Click the extension icon to open the panel
3. Use quick actions, or expand **Advanced** for fine control

If you see “No video detected”, make sure the page has a playable HTML5 player (some sites with custom or encrypted players may not be detected).

### Shortcuts

| Action                      | Windows / Linux | macOS             |
| --------------------------- | --------------- | ----------------- |
| Rotate clockwise 90°        | `Ctrl+Shift+1`  | `MacCtrl+Shift+1` |
| Rotate counterclockwise 90° | `Ctrl+Shift+2`  | `MacCtrl+Shift+2` |
| Reset rotation              | `Ctrl+Shift+3`  | `MacCtrl+Shift+3` |
| Toggle picture-in-picture   | `Alt+P`         | `Alt+P`           |

Customize them at `chrome://extensions/shortcuts`.

## Permissions

| Permission  | Why                                                    |
| ----------- | ------------------------------------------------------ |
| `activeTab` | Access the current tab only when you use the extension |
| `scripting` | Inject rotate / PiP scripts into the page              |
| `storage`   | Save your view settings per page                       |

No accounts, browsing history, or uploads — settings stay in local `chrome.storage.local`.

## Project structure

```
x-video/
├── manifest.json      # Extension manifest (MV3)
├── background.js      # Shortcut and PiP entry
├── content.js         # Content script: load/save settings, apply transforms
├── rotate.js          # Video targeting and CSS transform
├── pip.js             # PiP toggle (page MAIN world)
├── popup.html / .js / .css
├── icons/
└── _locales/          # English / Simplified Chinese strings
```

## Development

Pure front-end extension — no build step. After editing, click **Reload** on the extension card at `chrome://extensions`.

## Contributing

Issues and PRs are welcome: site adapters, a11y, translations, or UX tweaks. Please manually verify rotate, reset, and PiP on a real video page before submitting.

## License

[MIT](LICENSE)
