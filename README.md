# GridWatch

A Chrome extension (Manifest V3) that turns a browser tab into a CCTV-style wall. Add any number of URLs and watch them all at once in a grid of equal tiles, each one a live page.

## Features

- **Live tile wall** – every URL gets its own iframe tile that stays loaded (and keeps playing) while you add or remove other tiles.
- **Auto-fit grid** – tiles are laid out to fill the screen. Choose a fixed grid (2×2 up to 8×8) from the **Grid** dropdown if you prefer.
- **One-click add** – click the toolbar icon on any `http(s)` page to put that page first in the wall and open GridWatch full screen.
- **Bulk add** – paste several URLs at once, separated by spaces, commas or new lines. Missing `https://` is added for you.
- **Collections** – save the current set of URLs under a name, switch between saved sets, or delete them.
- **Per-tile controls** – fullscreen (⛶), reload (↻) and remove (✕). YouTube tiles also get a **YT** toggle between the embed player and the full watch page.
- **YouTube support** – YouTube watch, `youtu.be` and `/live/` links play muted and autoplaying. Inside a tile the watch page is stripped down to just the video.
- **Framing blocked sites** – response headers that stop pages being framed (`X-Frame-Options`, `Content-Security-Policy`) are removed for frames loaded from the extension's own page.

## Install

1. Clone or download this folder.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the `GridWatch` folder.
4. Pin the GridWatch icon to the toolbar.

## Usage

1. Click the toolbar icon. GridWatch opens full screen (or focuses the existing tab).
2. Paste one or more URLs into the box and press **Add**.
3. Pick a grid size, or leave it on **Auto-fit**.
4. Use **Save** to store the current URLs as a collection, and the **Collection** dropdown to load one later.

## Project structure

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension manifest, permissions and content script registration |
| `background.js` | Toolbar click handler and the `declarativeNetRequest` rules that allow framing |
| `dashboard.html` / `.css` / `.js` | The wall UI: toolbar, grid layout, tiles, collections |
| `yt-tile.js` | Content script that trims YouTube watch pages down to the video inside a tile |
| `icons/` | Extension icons |

## Permissions

- `storage` – saves your URLs and collections locally.
- `tabs` – finds and focuses an existing GridWatch tab.
- `declarativeNetRequest` and `<all_urls>` – remove framing-blocking headers and set a `Referer` for YouTube embeds, only for requests made by GridWatch's own page.

## Notes

- Everything is stored locally with `chrome.storage.local`. Nothing is sent anywhere.
- Some sites may still fail to load in a tile, for example when they use JavaScript frame-busting.
- Stripping security headers applies only to frames inside GridWatch, but only add sites you trust.
