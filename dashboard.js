const grid = document.getElementById("grid");
const form = document.getElementById("addForm");
const input = document.getElementById("urlInput");
const sizeSel = document.getElementById("gridSize");
const countEl = document.getElementById("count");

let urls = [];
let size = "auto";
let collections = {};
let currentColl = "";
const collSel = document.getElementById("collSel");

function normalize(raw) {
  let u = raw.trim();
  if (!u) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) u = "https://" + u;
  try { return new URL(u).href; } catch { return null; }
}

// YouTube watch/share links can't be framed directly; use the embed player.
function youtubeId(href) {
  const u = new URL(href);
  const host = u.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtube.com" && u.pathname === "/watch") return u.searchParams.get("v");
  if (host === "youtu.be") return u.pathname.slice(1) || null;
  if (host === "youtube.com" && u.pathname.startsWith("/live/")) return u.pathname.split("/")[2] || null;
  return null;
}

// pageMode: load the normal watch page instead of the embed player, which
// sidesteps embed restrictions (errors 101/150/152/153).
function frameSrc(href, pageMode) {
  const u = new URL(href);
  if (pageMode) {
    const vid = youtubeId(href);
    if (vid) return `https://www.youtube.com/watch?v=${vid}&autoplay=1`;
    return href;
  }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  let id = null;
  if (host === "youtube.com" && u.pathname === "/watch") id = u.searchParams.get("v");
  else if (host === "youtu.be") id = u.pathname.slice(1);
  else if (host === "youtube.com" && u.pathname.startsWith("/live/")) id = u.pathname.split("/")[2];
  if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1`;
  return href;
}

function save() { chrome.storage.local.set({ urls, collections, currentColl }); }

function renderCollections() {
  collSel.innerHTML = '<option value="">— none —</option>';
  for (const name of Object.keys(collections).sort((a, b) => a.localeCompare(b))) {
    const o = document.createElement("option");
    o.value = name;
    o.textContent = `${name} (${collections[name].length})`;
    collSel.append(o);
  }
  collSel.value = collections[currentColl] ? currentColl : "";
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a * b) / gcd(a, b);

// How many tiles go in each row (empty cells count as tiles).
// Rows are filled left to right. If exactly one tile would be left over on the
// last row it keeps normal tile size and the rest of that row stays empty
// (7 -> 3 + 3 + 1); otherwise the last row's tiles share its width equally
// (5 -> 3 + 2 at 50% each).
function rowPlan() {
  if (size !== "auto") return Array(size).fill(size);
  const n = Math.min(Math.max(urls.length, 1), 64);
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const last = n - cols * (rows - 1);
  return Array.from({ length: rows }, (_, r) => (r < rows - 1 || last === 1 ? cols : last));
}

function layout(plan) {
  const cols = plan.reduce(lcm, 1);
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${plan.length}, 1fr)`;
  grid.style.gridAutoRows = "";
  grid.style.overflow = "hidden";
}

// Each URL keeps one live tile for as long as it stays in the list. Tiles are
// placed with explicit grid positions and never moved in the DOM, because
// moving or recreating an iframe reloads it (and restarts the video).
let tiles = []; // { href, el }

function makeTile(href) {
  const entry = { href, el: document.createElement("div") };
  const tile = entry.el;
  tile.className = "tile";

  let pageMode = !!youtubeId(href);
  const frame = document.createElement("iframe");
  frame.src = frameSrc(href, pageMode);
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";

  const tag = document.createElement("div");
  tag.className = "tag";
  const label = document.createElement("span");
  label.textContent = new URL(href).hostname;
  label.title = href;
  const full = button("⛶", "Fullscreen", () => tile.classList.toggle("full"));
  const reload = button("↻", "Reload", () => { frame.src = frameSrc(href, pageMode); });
  const mode = youtubeId(href) && button("YT", "Switch between embed player and full YouTube page", () => {
    pageMode = !pageMode;
    frame.src = frameSrc(href, pageMode);
  });
  const del = button("✕", "Remove", () => {
    const i = tiles.indexOf(entry);
    if (i < 0) return;
    urls.splice(i, 1);
    save();
    render();
  });
  tag.append(label, ...(mode ? [mode] : []), full, reload, del);
  tile.append(frame, tag);
  return entry;
}

function render() {
  const plan = rowPlan();
  const cols = plan.reduce(lcm, 1);
  const total = plan.reduce((s, k) => s + k, 0);
  const slots = plan.flatMap((k, r) =>
    Array.from({ length: k }, (_, j) => ({ row: r + 1, start: (j * cols) / k + 1, span: cols / k })));

  // Reuse the live tile for every URL still present; create only new ones.
  const pool = tiles.slice();
  const next = urls.slice(0, total).map((href) => {
    const k = pool.findIndex((t) => t.href === href);
    return k >= 0 ? pool.splice(k, 1)[0] : makeTile(href);
  });
  pool.forEach((t) => t.el.remove());
  grid.querySelectorAll(".tile.empty").forEach((el) => el.remove());

  const place = (el, s) => {
    el.style.gridRow = String(s.row);
    el.style.gridColumn = `${s.start} / span ${s.span}`;
  };
  next.forEach((t, i) => {
    place(t.el, slots[i]);
    if (!t.el.isConnected) grid.append(t.el);
  });
  for (let i = next.length; i < total; i++) {
    const empty = document.createElement("div");
    empty.className = "tile empty";
    place(empty, slots[i]);
    grid.append(empty);
  }
  tiles = next;

  const hidden = Math.max(0, urls.length - total);
  countEl.textContent = urls.length + " URL" + (urls.length === 1 ? "" : "s") + (hidden ? ` (${hidden} hidden)` : "");
  layout(plan);
}

function button(text, title, onClick) {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = text; b.title = title;
  b.addEventListener("click", onClick);
  return b;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const added = input.value.split(/[\s,]+/).map(normalize).filter(Boolean);
  if (!added.length) return;
  urls.push(...added);
  input.value = "";
  save();
  render();
});

sizeSel.addEventListener("change", () => {
  size = sizeSel.value === "auto" ? "auto" : Number(sizeSel.value);
  save();
  render();
});

document.getElementById("clearBtn").addEventListener("click", () => {
  if (!urls.length || !confirm("Remove all URLs?")) return;
  urls = [];
  save();
  render();
});

collSel.addEventListener("change", () => {
  currentColl = collSel.value;
  if (currentColl) urls = [...collections[currentColl]];
  save();
  render();
});

document.getElementById("saveCollBtn").addEventListener("click", () => {
  if (!urls.length) return alert("Add some URLs first.");
  const name = (prompt("Collection name:", currentColl) || "").trim();
  if (!name) return;
  if (collections[name] && name !== currentColl && !confirm(`Overwrite "${name}"?`)) return;
  collections[name] = [...urls];
  currentColl = name;
  save();
  renderCollections();
});

document.getElementById("delCollBtn").addEventListener("click", () => {
  if (!currentColl || !confirm(`Delete collection "${currentColl}"? (Current tiles stay.)`)) return;
  delete collections[currentColl];
  currentColl = "";
  save();
  renderCollections();
});


chrome.storage.local.get({ urls: [], collections: {}, currentColl: "" }, (s) => {
  collections = s.collections;
  currentColl = s.currentColl;
  urls = s.urls;
  sizeSel.value = "auto"; // always start in Auto-fit
  renderCollections();
  render();
});

// The toolbar button can push the current page's URL to the front while this tab is open.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.urls) return;
  const next = changes.urls.newValue || [];
  if (JSON.stringify(next) === JSON.stringify(urls)) return;
  urls = next;
  render();
});
