// Runs on YouTube, but only inside a GridWatch tile (never on normal YouTube tabs).
// Strips the watch page down to the video, filling the tile, muted and playing.
(() => {
  const origins = Array.from(location.ancestorOrigins || []);
  if (window === window.top || !origins.includes(`chrome-extension://${chrome.runtime.id}`)) return;
  if (!location.pathname.startsWith("/watch")) return;

  const style = document.createElement("style");
  style.textContent = `
    html, body { overflow: hidden !important; background: #000 !important; }
    ytd-masthead, #masthead-container, #secondary, #below, #comments, #related,
    ytd-miniplayer, tp-yt-app-drawer, #guide, ytd-mini-guide-renderer, #chat,
    ytd-consent-bump-v2-lightbox, tp-yt-iron-overlay-backdrop, ytd-popup-container,
    .ytp-chrome-top, .ytp-pause-overlay, .ytp-ce-element { display: none !important; }
    #movie_player { position: fixed !important; inset: 0 !important; width: 100vw !important;
      height: 100vh !important; z-index: 2147483647 !important; background: #000 !important; }
    #movie_player video { position: absolute !important; left: 0 !important; top: 0 !important;
      width: 100% !important; height: 100% !important; object-fit: contain !important; }
  `;
  document.documentElement.append(style);

  setInterval(() => {
    const v = document.querySelector("video");
    if (!v) return;
    v.muted = true;
    if (v.paused && !v.ended) v.play().catch(() => {});
  }, 1500);
})();
