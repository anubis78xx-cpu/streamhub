"use strict";

// Store edition (Google Play): every catalog lookup goes through TMDB, see "TMDB" below.
// Built-in catalog. pkg = Android package (lets Chrome open the native app),
// search = URL prefix for a title search, tmdb = TMDB watch-provider ids (others are
// matched by name, see providerIdsOf).
const CATALOG = [
  { id: "netflix", name: "Netflix", color: "#E50914", pkg: "com.netflix.mediaclient", web: "https://www.netflix.com/browse", search: "https://www.netflix.com/search?q=", tmdb: [8] },
  { id: "prime", name: "Prime Video", color: "#00A8E1", pkg: "com.amazon.avod.thirdpartyclient", web: "https://www.primevideo.com", search: "https://www.primevideo.com/search/?phrase=", tmdb: [119, 9] },
  { id: "disney", name: "Disney+", color: "#113CCF", pkg: "com.disney.disneyplus", web: "https://www.disneyplus.com", search: "https://www.disneyplus.com/search?q=", tmdb: [337] },
  { id: "canal", name: "Canal+", color: "#1a1a1a", pkg: "com.canal.android.canal", web: "https://www.canalplus.com", tmdb: [381] },
  { id: "max", name: "Max", color: "#002BE7", pkg: "com.wbd.stream", web: "https://play.max.com", tmdb: [1899] },
  { id: "appletv", name: "Apple TV+", color: "#3a3a3c", web: "https://tv.apple.com", tmdb: [350] },
  { id: "paramount", name: "Paramount+", color: "#0064FF", web: "https://www.paramountplus.com", tmdb: [531] },
  { id: "crunchyroll", name: "Crunchyroll", color: "#F47521", pkg: "com.crunchyroll.crunchyroid", web: "https://www.crunchyroll.com", search: "https://www.crunchyroll.com/search?q=", tmdb: [283] },
  { id: "youtube", name: "YouTube", color: "#FF0000", pkg: "com.google.android.youtube", web: "https://www.youtube.com", search: "https://www.youtube.com/results?search_query=", tmdb: [192] },
  { id: "twitch", name: "Twitch", color: "#9146FF", pkg: "tv.twitch.android.app", web: "https://www.twitch.tv", search: "https://www.twitch.tv/search?term=" },
  { id: "francetv", name: "france.tv", color: "#2a4bd7", pkg: "fr.francetv.pluzz", web: "https://www.france.tv" },
  { id: "tf1", name: "TF1+", color: "#0b3a8f", pkg: "fr.tf1.mytf1", web: "https://www.tf1.fr" },
  { id: "m6", name: "M6+", color: "#5b2fd6", pkg: "fr.m6.m6replay", web: "https://www.m6.fr" },
  { id: "adn", name: "ADN", color: "#0096d6", web: "https://animationdigitalnetwork.com" },
  { id: "arte", name: "Arte", color: "#fa481c", pkg: "tv.arte.plus7", web: "https://www.arte.tv/fr/", search: "https://www.arte.tv/fr/search/?q=" },
  // Free services (live channels, replay and films with ads).
  { id: "pluto", name: "Pluto TV", color: "#1b1b1f", pkg: "tv.pluto.android", web: "https://pluto.tv/fr/live-tv" },
  { id: "molotov", name: "Molotov", color: "#1d1d2b", pkg: "tv.molotov.app", web: "https://www.molotov.tv" },
  { id: "rakuten", name: "Rakuten TV", color: "#bf0000", pkg: "tv.wuaki", web: "https://www.rakuten.tv/fr" },
  { id: "lequipe", name: "L'Équipe", color: "#d71920", pkg: "fr.lequipe.networkapp", web: "https://www.lequipe.fr/tv/" },
  { id: "madelen", name: "INA madelen", color: "#e6007e", web: "https://madelen.ina.fr" },
  { id: "deezer", name: "Deezer", color: "#121216", pkg: "deezer.android.app", web: "https://www.deezer.com/fr/", search: "https://www.deezer.com/fr/search/" },
  { id: "spotify", name: "Spotify", color: "#1DB954", pkg: "com.spotify.music", web: "https://open.spotify.com", search: "https://open.spotify.com/search/" },
];

// Each service shows its own site's icon (favicon), the way a browser bookmark does.
const favicon = site => `https://www.google.com/s2/favicons?domain=${new URL(site).hostname}&sz=128`;
const logoOf = svc => svc.logo || favicon(svc.web || svc.site);

// Logo image that hides itself if it fails to load (the colored background stays).
function logoImg(src, cls) {
  return el("img", { class: cls, src, alt: "", loading: "lazy", onerror: e => e.currentTarget.remove() });
}

// Free live channels that allow embedding. yt = YouTube channel id (verified 2026-10-25).
const LIVE = [
  { id: "arte", site: "https://www.arte.tv", name: "Arte", color: "#fa481c", embed: "https://www.arte.tv/embeds/fr/LIVE", open: "https://www.arte.tv/fr/direct/" },
  { id: "france24", site: "https://www.france24.com", name: "France 24", color: "#0a8fd6", yt: "UCCCPCZNChQdGa9EkATeye4g" },
  { id: "franceinfo", site: "https://www.francetvinfo.fr", name: "franceinfo", color: "#2b2b38", yt: "UCO6K_kkdP-lnSCiO3tPx7WA" },
  { id: "bfmtv", site: "https://www.bfmtv.com", name: "BFMTV", color: "#0047ba", yt: "UCXwDLMDV86ldKoFVc_g8P0g" },
  { id: "euronews", site: "https://fr.euronews.com", name: "Euronews", color: "#0d3b8c", yt: "UCW2QcKZiU8aUGg4yxCIditg" },
  { id: "tv5monde", site: "https://www.tv5monde.com", name: "TV5MONDE", color: "#c8102e", yt: "UCJsZHPR1jqKu-soDmKNMBFg" },
  { id: "publicsenat", site: "https://www.publicsenat.fr", name: "Public Sénat", color: "#8a1538", yt: "UCTa1bPArjpvNMgSHAb_pflA", note: "selon programme" },
];

const STORE_KEY = "streamhub.v1";
const IMG = "https://image.tmdb.org/t/p/w185";
const isAndroid = /Android/i.test(navigator.userAgent);
// Set when running inside the StreamHub APK (WebView shell), see android/.
const native = window.StreamHubNative || null;
// Set when running in the Windows app (desktop/streamhub_desktop.py opens index.html?app=desktop).
const desktop = new URLSearchParams(location.search).get("app") === "desktop";

// Opens a web page in a StreamHub site window: SiteActivity in the APK, a separate window
// on Windows (both with back and fullscreen buttons), a new tab elsewhere.
function openOutside(url) {
  if (native) native.openSite ? native.openSite(url) : (location.href = url);
  else if (desktop && window.pywebview) window.pywebview.api.open(url);
  else window.open(url, "_blank", "noopener");
}
// Version shown in the browser and the Windows app. The APK has its own numbering
// (versionName in android/app/build.gradle) and shows the installed one instead.
const APP_VERSION = "1.0";

// TMDB key of the app (free, from themoviedb.org/settings/api): tmdb-key.js, written by
// tools/make_key.py from TMDB_API_KEY in .env, never in git. A key typed in Settings replaces it.
const TMDB_APP_KEY = window.TMDB_APP_KEY || "";

// ---------- State ----------

function defaultState() {
  return { enabled: ["netflix", "prime", "disney", "youtube"], custom: [], watchlist: [], videos: [], sites: [], reading: {}, history: [], filters: {}, tmdbKey: "", vpnPkg: "", vpnName: "", adblock: true };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? Object.assign(defaultState(), JSON.parse(raw)) : defaultState();
  } catch (e) {
    return defaultState();
  }
}

let state = loadState();

// Sync bookkeeping, see "Sync between devices" further down. No server by default:
// the store edition syncs only when the user enters the address of their own sync server.
const SYNC_KEY = "streamhub.sync";
const SYNC_DEFAULT_URL = "";
const SETTINGS_FIELDS = ["enabled", "custom", "sites", "filters", "vpnPkg", "vpnName", "adblock"];
let stampSnap = snapOf(state);
let syncTimer = null;

function save() {
  stamp();
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { toast("Sauvegarde impossible sur cet appareil"); }
  scheduleSync();
}

function allServices() { return CATALOG.concat(state.custom); }
function myServices() { return allServices().filter(s => state.enabled.includes(s.id)); }
function serviceById(id) { return allServices().find(s => s.id === id); }

// ---------- Helpers ----------

const $ = sel => document.querySelector(sel);

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "style") node.style.cssText = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2500);
}

// Opens a URL in the service's native app when possible (Android Chrome intent),
// otherwise in the browser. If the app is not installed, Chrome uses the fallback URL.
function openInService(svc, url) {
  url = url || svc.web;
  if (isAndroid && svc.pkg) {
    const u = new URL(url);
    location.href = `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=${svc.pkg};S.browser_fallback_url=${encodeURIComponent(url)};end`;
  } else {
    openOutside(url);
  }
}

function searchUrl(svc, query) {
  return svc.search ? svc.search + encodeURIComponent(query) : svc.web;
}

function watchItem(item) {
  const svc = serviceById(item.service);
  if (!svc) { toast("Choisis d'abord un service pour ce titre"); return; }
  // item.url is the exact title page found by the smart search.
  openInService(svc, item.url || searchUrl(svc, item.title));
}

// ---------- Navigation ----------

function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + name));
  document.querySelectorAll(".nav").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  if (name === "home") renderHome();
  if (name === "list") renderWatchlist();
  if (name === "settings") { renderSettings(); renderSync(); }
  if (name === "search") renderSearchHint();
  if (name === "live") renderLive();
  else closePlayer();
  window.scrollTo(0, 0);
}

document.querySelectorAll(".nav").forEach(b => b.addEventListener("click", () => showView(b.dataset.view)));

// ---------- Home ----------

function renderHome() {
  const grid = $("#homeGrid");
  grid.replaceChildren();
  const mine = myServices();
  $("#homeEmpty").hidden = mine.length > 0;
  for (const s of mine) {
    grid.append(el("button", { class: "tile logo", style: `--brand:${s.color}`, onclick: () => openInService(s) },
      [logoImg(logoOf(s), "tile-logo"), el("span", {}, s.name)]));
  }

  const next = $("#homeNext");
  next.replaceChildren();
  const todo = state.watchlist.filter(i => !i.seen).sort((a, b) => !!b.newEps - !!a.newEps).slice(0, 5);
  $("#homeNextEmpty").hidden = todo.length > 0;
  todo.forEach(i => next.append(watchCard(i)));
  renderDiscover();
}

// ---------- Watchlist ----------

let listFilter = "todo";

document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => {
  listFilter = t.dataset.filter;
  document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === t));
  renderWatchlist();
}));

function inWatchlist(key) { return state.watchlist.some(i => i.key === key); }

function addToWatchlist(entry) {
  if (inWatchlist(entry.key)) { toast("Déjà dans ta liste"); return; }
  state.watchlist.unshift(Object.assign({ seen: false, addedAt: Date.now() }, entry));
  save();
  toast("Ajouté à ta liste");
}

function poster(path) {
  if (!path) return el("div", { class: "noposter" }, "🎬");
  return el("img", { src: path.startsWith("http") ? path : IMG + path, alt: "", loading: "lazy" });
}

function watchCard(item) {
  const select = el("select", {
    onchange: e => { item.service = e.target.value; delete item.url; save(); },
  }, [el("option", { value: "" }, "Service ?")].concat(
    myServices().map(s => el("option", { value: s.id, selected: s.id === item.service }, s.name))
  ));

  const actions = el("div", { class: "row wrap" }, [
    el("button", { class: "btn small", onclick: () => watchItem(item) }, "▶ Regarder"),
    select,
    item.type === "tv" ? el("button", { class: "btn mini", onclick: () => toggleEpisodes(item) }, openEps.has(item.key) ? "Fermer" : "📺 Épisodes") : null,
    el("button", { class: "btn mini", onclick: () => { item.seen = !item.seen; save(); refresh(); } }, item.seen ? "Pas vu" : "✓ Vu"),
    el("button", { class: "btn mini", onclick: () => {
      state.watchlist = state.watchlist.filter(x => x !== item); save(); refresh();
    } }, "✕"),
  ]);

  return el("div", { class: "card" + (item.seen ? " seen" : "") }, [
    poster(item.poster),
    el("div", { class: "body" }, [
      el("div", { class: "title" }, item.title),
      el("div", { class: "meta" }, [item.type === "tv" ? "Série" : item.type === "movie" ? "Film" : "", item.year].filter(Boolean).join(" · ")),
      ...seriesInfo(item),
      tmdbInfo(item),
      actions,
    ]),
  ]);
}

// Summary and rating from TMDB on each list card. Cached per device (not synced),
// so each title is looked up once.
const INFO_KEY = "streamhub.tmdbinfo";
let infoCache;
try { infoCache = JSON.parse(localStorage.getItem(INFO_KEY)) || {}; } catch (e) { infoCache = {}; }

function infoRow(info) {
  if (!info || (!info.note && !info.overview)) return [];
  return [
    info.note ? el("div", { class: "meta" }, `★ ${info.note}/10 sur TMDB` + (info.votes ? ` (${info.votes} votes)` : "")) : null,
    info.overview ? el("div", { class: "desc", onclick: e => e.currentTarget.classList.toggle("open") }, info.overview) : null,
  ];
}

function tmdbInfo(item) {
  const box = el("div", { class: "tmdb-info" });
  if (!tmdbReady()) return box;
  const cached = infoCache[item.key];
  if (cached) { box.append(...infoRow(cached)); return box; }
  fetchInfo(item).then(info => {
    infoCache[item.key] = info;
    try { localStorage.setItem(INFO_KEY, JSON.stringify(infoCache)); } catch (e) {}
    box.append(...infoRow(info));
  }).catch(() => {}); // offline or bad key: the card simply stays without it
  return box;
}

async function fetchInfo(item) {
  let r;
  const m = /^tmdb:(movie|tv):(\d+)$/.exec(item.key);
  if (m) {
    r = await tmdb(`/${m[1]}/${m[2]}`);
  } else {
    const type = item.type === "tv" || item.type === "movie" ? item.type : "multi";
    const params = { query: item.title };
    if (item.year && type !== "multi") params[type === "tv" ? "first_air_date_year" : "primary_release_year"] = item.year;
    const results = ((await tmdb(`/search/${type}`, params)).results || []).filter(x => type !== "multi" || ["movie", "tv"].includes(x.media_type));
    r = results[0];
  }
  if (!r) return { none: true };
  return { note: r.vote_count ? Math.round(r.vote_average * 10) / 10 : null, votes: r.vote_count || 0, overview: r.overview || "" };
}

function renderWatchlist() {
  const box = $("#watchlist");
  box.replaceChildren();
  const items = state.watchlist.filter(i => (listFilter === "seen") === !!i.seen);
  $("#listEmpty").hidden = items.length > 0;
  items.forEach(i => box.append(watchCard(i)));
}

function refresh() {
  const active = document.querySelector(".view.active").id.replace("view-", "");
  if (active === "home") renderHome();
  if (active === "list") renderWatchlist();
}

// ---------- Live and replay (embedded players) ----------

function ytLive(channelId) {
  return {
    embed: `https://www.youtube.com/embed/live_stream?channel=${channelId}&autoplay=1`,
    open: `https://www.youtube.com/channel/${channelId}/live`,
  };
}

// Turns a pasted link into an embeddable player URL, or null if unsupported.
function parseVideoLink(raw) {
  let u;
  try { u = new URL(raw.trim()); } catch (e) { return null; }
  const host = u.hostname.replace(/^(www|m)\./, "");
  const parts = u.pathname.split("/").filter(Boolean);
  const open = u.href;

  if (host === "youtube.com" || host === "youtu.be") {
    if (parts[0] === "channel" && parts[1]) return Object.assign({ source: "YouTube" }, ytLive(parts[1]));
    if (parts[0] && parts[0].startsWith("@")) return { error: "Pour une chaîne YouTube, colle le lien d'une vidéo ou du direct, pas la page @chaîne." };
    const id = host === "youtu.be" ? parts[0]
      : u.searchParams.get("v") || (["live", "shorts", "embed"].includes(parts[0]) ? parts[1] : null);
    return id ? { source: "YouTube", embed: `https://www.youtube.com/embed/${id}?autoplay=1`, open } : null;
  }
  if (host === "dailymotion.com" || host === "dai.ly") {
    const id = host === "dai.ly" ? parts[0] : parts[0] === "video" ? parts[1] : null;
    return id ? { source: "Dailymotion", embed: `https://www.dailymotion.com/embed/video/${id.split("_")[0]}?autoplay=1`, open } : null;
  }
  if (host === "twitch.tv") {
    // Twitch requires the embedding page's hostname as "parent".
    const parent = location.hostname || "localhost";
    if (parts[0] === "videos" && parts[1]) return { source: "Twitch", embed: `https://player.twitch.tv/?video=v${parts[1]}&parent=${parent}`, open };
    return parts[0] ? { source: "Twitch", embed: `https://player.twitch.tv/?channel=${parts[0]}&parent=${parent}`, open } : null;
  }
  if (host === "arte.tv") {
    // https://www.arte.tv/fr/videos/041743-002-A/slug/
    const i = parts.indexOf("videos");
    const id = i >= 0 ? parts[i + 1] : null;
    return id ? { source: "Arte", embed: `https://www.arte.tv/embeds/fr/${id}?autoplay=true`, open } : null;
  }
  return null;
}

// Opens a page in the matching native app if it is in the catalog, else the browser.
function openLink(url) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const svc = allServices().find(s => new URL(s.web).hostname.replace(/^www\./, "") === host);
  if (svc) openInService(svc, url);
  else openOutside(url);
}

let playing = null;

function play(item) {
  playing = item;
  $("#playerFrame").src = item.embed;
  $("#playerTitle").textContent = item.name;
  $("#player").hidden = false;
  window.scrollTo(0, 0);
}

function closePlayer() {
  playing = null;
  $("#playerFrame").src = "about:blank";
  $("#player").hidden = true;
}

$("#playerClose").addEventListener("click", closePlayer);
$("#playerOpen").addEventListener("click", () => { if (playing) openLink(playing.open); });

function renderLive() {
  const grid = $("#liveGrid");
  grid.replaceChildren();
  for (const ch of LIVE) {
    const item = ch.yt ? Object.assign({ name: ch.name }, ytLive(ch.yt)) : ch;
    grid.append(el("button", { class: "tile", style: `background:${ch.color}`, onclick: () => play(item) },
      [logoImg(logoOf(ch), "live-logo"), ch.name, ch.note ? el("small", {}, ch.note) : null]));
  }

  const box = $("#myVideos");
  box.replaceChildren();
  $("#myVideosEmpty").hidden = state.videos.length > 0;
  for (const v of state.videos) {
    box.append(el("div", { class: "card" }, [
      el("div", { class: "noposter" }, "▶"),
      el("div", { class: "body" }, [
        el("div", { class: "title" }, v.name),
        el("div", { class: "meta" }, v.source),
        el("div", { class: "row wrap" }, [
          el("button", { class: "btn small", onclick: () => play(v) }, "▶ Regarder ici"),
          el("button", { class: "btn mini", onclick: () => openLink(v.open) }, "Ouvrir dans l'app"),
          el("button", { class: "btn mini", onclick: () => {
            state.videos = state.videos.filter(x => x !== v); save(); renderLive();
          } }, "✕"),
        ]),
      ]),
    ]));
  }
}

$("#videoForm").addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const parsed = parseVideoLink(f.get("url"));
  if (!parsed) { toast("Lien non reconnu (YouTube, Dailymotion, Twitch ou Arte)"); return; }
  if (parsed.error) { toast(parsed.error); return; }
  const item = Object.assign({ id: "v" + Date.now(), name: f.get("name").trim() || parsed.source + " : " + f.get("url").trim() }, parsed);
  state.videos.unshift(item);
  save();
  e.target.reset();
  renderLive();
  play(item);
});

// ---------- Search ----------

// ---------- TMDB: catalog, where to watch in France, episodes ----------
// The store edition uses TMDB only (official API, free key). Its where-to-watch data
// comes from JustWatch, credited in Settings as TMDB asks.

// word -> [movie genre id, TV genre id], 0 when TMDB has no such genre on that side.
const TMDB_GENRES = {
  action: [28, 10759], comedie: [35, 35], horreur: [27, 0], epouvante: [27, 0], romance: [10749, 0], romantique: [10749, 0],
  "science-fiction": [878, 10765], sf: [878, 10765], fantastique: [14, 10765], fantasy: [14, 10765], drame: [18, 18], thriller: [53, 9648],
  documentaire: [99, 99], famille: [10751, 10751], enfant: [10751, 10762], policier: [80, 80], crime: [80, 80], guerre: [10752, 10768],
  musique: [10402, 0], musical: [10402, 0], historique: [36, 0], histoire: [36, 0], western: [37, 37], animation: [16, 16],
};
const SERVICE_ALIASES = {
  netflix: ["netflix"], prime: ["prime", "amazon"], disney: ["disney", "disney+"], canal: ["canal", "canal+"],
  max: ["max", "hbo"], appletv: ["apple"], paramount: ["paramount", "paramount+"], crunchyroll: ["crunchyroll", "crunchy"],
  adn: ["adn"], arte: ["arte"], tf1: ["tf1", "tf1+"],
};
const AUDIO_FR = ["vf", "francais", "francaise", "french", "double", "doublage", "doublee"];
const SUBS_FR = ["vostfr", "sous-titre", "sous-titree", "soustitre"];
const STOP = new Set(("trouve trouver moi me m des de du d la le les l un une sur en avec et ou qui que je veux voudrais " +
  "cherche chercher montre donne liste quels quelles quel quelle meilleur meilleurs bon bons a regarder voir dispo " +
  "disponible pour mon ma mes tout tous toutes stp svp version vo audio langue sous titre video tv plus uniquement " +
  "seulement juste only ils elles").split(" "));

const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const singular = w => w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;
const WEEK = 7 * 86400000;

const nativeCalls = {};
let nativeSeq = 0;
window.__nativeDone = (id, ok, text) => {
  const call = nativeCalls[id];
  delete nativeCalls[id];
  if (call) ok ? call.resolve(text) : call.reject(new Error(text));
};

const tmdbKey = () => (state.tmdbKey || TMDB_APP_KEY).trim();
const tmdbReady = () => !!tmdbKey();

async function tmdb(path, params = {}) {
  const key = tmdbKey();
  const url = new URL("https://api.themoviedb.org/3" + path);
  url.searchParams.set("language", "fr-FR");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const headers = {};
  // v4 read tokens are long JWTs, v3 keys are 32 hex chars.
  if (key.length > 40) headers.Authorization = "Bearer " + key;
  else url.searchParams.set("api_key", key);
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(res.status === 401 ? "Clé TMDB invalide" : "Erreur TMDB " + res.status);
  return res.json();
}

// ---- Services <-> TMDB providers ----
// TMDB's list of providers in France (cached a week) lets each service be matched by name,
// so services without fixed ids in CATALOG still work.

const PROV_KEY = "streamhub.providers";
let provList = null;
const provNorm = s => norm(s).replace(/\+/g, "plus").replace(/[^a-z0-9]/g, "");

async function loadProviderList() {
  if (provList) return provList;
  try {
    const c = JSON.parse(localStorage.getItem(PROV_KEY));
    if (c && Date.now() - c.at < WEEK) return (provList = c.list);
  } catch (e) { /* fetch it again */ }
  const lists = await Promise.all(["movie", "tv"].map(k => tmdb(`/watch/providers/${k}`, { watch_region: "FR" })));
  const byId = new Map();
  for (const d of lists) for (const p of d.results || []) byId.set(p.provider_id, p.provider_name);
  provList = [...byId].map(([id, name]) => ({ id, key: provNorm(name) }));
  try { localStorage.setItem(PROV_KEY, JSON.stringify({ at: Date.now(), list: provList })); } catch (e) { /* private mode */ }
  return provList;
}

// "Prime Video" also matches "Amazon Prime Video" and "... with Ads"; short names ("Max") must match exactly.
function providerIdsOf(svc) {
  const ids = new Set(svc.tmdb || []);
  const k = provNorm(svc.name);
  for (const p of provList || []) {
    if (p.key === k || (k.length >= 5 && p.key.includes(k))) ids.add(p.id);
  }
  return [...ids];
}

const myProviderIds = () => [...new Set(myServices().flatMap(providerIdsOf))];

function matchProvider(p) {
  return allServices().find(s => providerIdsOf(s).includes(p.provider_id) || provNorm(s.name) === provNorm(p.provider_name));
}

// Streaming offers of a title in France (subscription, free, with ads), cached for the session.
const providerCache = new Map();
function providersFR(r) {
  const k = r.media_type + ":" + r.id;
  if (!providerCache.has(k)) {
    providerCache.set(k, tmdb(`/${r.media_type}/${r.id}/watch/providers`).then(d => {
      const fr = (d.results || {}).FR || {};
      const seen = new Set();
      const list = []
        .concat((fr.flatrate || []).map(p => ({ p, kind: "" })))
        .concat((fr.free || []).map(p => ({ p, kind: " (gratuit)" })))
        .concat((fr.ads || []).map(p => ({ p, kind: " (avec pub)" })))
        .filter(x => !seen.has(x.p.provider_id) && seen.add(x.p.provider_id));
      return { list, link: fr.link || "" };
    }).catch(err => { providerCache.delete(k); throw err; }));
  }
  return providerCache.get(k);
}

// ---- Understanding the request ----

// Understands requests like "trouve moi des animés sur Crunchyroll".
function parseQuery(text) {
  const words = norm(text).replace(/sous[\s-]*titr/g, "sous-titr").replace(/[^a-z0-9+\-\s]/g, " ").split(/\s+/).filter(Boolean);
  const q = { services: [], genres: [], types: new Set(), audioFr: false, subsFr: false, anime: false, rest: [] };
  // "dessin animé" means animation in general; "animé" or "manga" alone means Japanese anime.
  const cartoon = words.some(w => w === "dessin" || w === "dessins");
  for (const raw of words) {
    const w = singular(raw);
    const svcId = Object.keys(SERVICE_ALIASES).find(id => SERVICE_ALIASES[id].includes(raw) || SERVICE_ALIASES[id].includes(w));
    if (svcId) { if (!q.services.includes(svcId)) q.services.push(svcId); continue; }
    if (["anime", "manga"].includes(w)) { q.genres.push("animation"); q.anime = !cartoon; continue; }
    if (w === "dessin") continue;
    if (w === "film") { q.types.add("movie"); continue; }
    if (w === "serie") { q.types.add("tv"); continue; }
    if (SUBS_FR.includes(raw) || SUBS_FR.includes(w)) { q.subsFr = true; continue; }
    if (AUDIO_FR.includes(raw) || AUDIO_FR.includes(w)) { q.audioFr = true; continue; }
    if (TMDB_GENRES[raw] || TMDB_GENRES[w]) { q.genres.push(TMDB_GENRES[raw] ? raw : w); continue; }
    if (STOP.has(raw) || STOP.has(w)) continue;
    q.rest.push(raw);
  }
  if (q.subsFr) q.audioFr = false;
  q.genres = [...new Set(q.genres)];
  q.named = q.services.map(serviceById).filter(Boolean);
  q.serviceNames = q.named.map(s => s.name);
  return q;
}

// Film, series or both: the request first, then the Type filter. A genre TMDB only has
// on one side (horror: films) drops the other side.
function wantedTypes(q) {
  const f = state.filters || {};
  let types = q.types.size ? [...q.types] : f.type === "MOVIE" ? ["movie"] : f.type === "SHOW" ? ["tv"] : ["movie", "tv"];
  if (q.genres.length) types = types.filter(t => q.genres.every(g => TMDB_GENRES[g][t === "movie" ? 0 : 1]));
  return types;
}

function describeQuery(q) {
  const parts = [];
  if (q.anime) parts.push("Animés japonais");
  else if (q.genres.includes("animation")) parts.push("Animation");
  if (q.types.size === 1) parts.push(q.types.has("movie") ? "Films" : "Séries");
  const others = q.genres.filter(g => g !== "animation");
  if (others.length) parts.push(others.join(", "));
  if (q.rest.length) parts.push(`« ${q.rest.join(" ")} »`);
  parts.push(q.serviceNames.length ? q.serviceNames.join(", ")
    : q.rest.length ? "tous les services" : myServices().length ? "tes abonnements" : "tous les services");
  return parts.join(" · ");
}

// TMDB discover parameters for the Filters panel.
function filterParams(type) {
  const f = state.filters || {};
  const date = type === "movie" ? "primary_release_date" : "first_air_date";
  const p = { sort_by: "popularity.desc" };
  if (f.score) { p["vote_average.gte"] = f.score; p["vote_count.gte"] = 100; }
  if (f.years) {
    const [min, max] = f.years.split("-");
    if (min) p[date + ".gte"] = `${min}-01-01`;
    if (max) p[date + ".lte"] = `${max}-12-31`;
  }
  if (f.runtime) p["with_runtime.lte"] = f.runtime;
  if (f.sort === "TOP") { p.sort_by = "vote_average.desc"; p["vote_count.gte"] = Math.max(p["vote_count.gte"] || 0, 300); }
  if (f.sort === "RECENT") { p.sort_by = date + ".desc"; if (!p[date + ".lte"]) p[date + ".lte"] = new Date().toISOString().slice(0, 10); }
  return p;
}

// The same rules, checked on text search results (TMDB's text search has no filters).
function matchesFilters(r, q) {
  const f = state.filters || {};
  const year = parseInt((r.release_date || r.first_air_date || "").slice(0, 4), 10);
  if (q.genres.length && !q.genres.every(g => (r.genre_ids || []).includes(TMDB_GENRES[g][r.media_type === "movie" ? 0 : 1]))) return false;
  if (q.anime && r.original_language !== "ja") return false;
  if (f.score && !(r.vote_average >= +f.score)) return false;
  if (f.years) {
    const [min, max] = f.years.split("-");
    if (!year || (min && year < +min) || (max && year > +max)) return false;
  }
  return true;
}

// ---- Search ----

let smart = null;

async function smartSearch(text) {
  const q = parseQuery(text);
  if (!q.rest.length && !q.genres.length && !q.types.size && !q.named.length && !activeFilters().length && text) {
    toast("Précise un titre, un genre ou un service");
    return;
  }
  const box = $("#searchResults");
  const filters = describeFilters();
  smart = { q, text, page: 0, done: false, found: 0, seen: new Set() };
  box.replaceChildren(el("p", { class: "hint" }, "Compris : " + describeQuery(q) + (filters ? " · " + filters : "")));
  if (q.audioFr || q.subsFr) {
    box.append(el("p", { class: "hint unknown" }, `La langue (${q.audioFr ? "VF" : "VOSTFR"}) n'est pas publiée par les plateformes : vérifie dans l'app avant de lancer.`));
  }
  try { await loadProviderList(); } catch (e) { /* titles still show, without service matching */ }
  await smartMore();
}

async function smartMore() {
  const box = $("#searchResults");
  const s = smart;
  const status = el("p", { class: "hint" }, "Recherche...");
  box.querySelector(".more")?.remove();
  box.append(status);
  const before = s.found;
  try {
    for (let i = 0; i < 3 && !s.done && s.found - before < 12; i++) {
      s.page++;
      const results = s.q.rest.length ? await searchPage(s) : await discoverPage(s);
      if (s !== smart) return; // a newer search started
      for (const r of results) {
        const k = r.media_type + ":" + r.id;
        if (s.seen.has(k)) continue;
        s.seen.add(k);
        s.found++;
        status.before(resultCard(r));
      }
    }
    status.remove();
    if (!s.found) box.append(el("p", { class: "hint" }, "Aucun titre trouvé avec ces critères."));
    if (!s.done) box.append(el("button", { class: "btn ghost more", onclick: smartMore }, "Voir plus"));
  } catch (err) {
    status.textContent = err.message;
    if (!s.found) simpleResults(s.text);
  }
}

// A title search ("One Piece"): TMDB's text search, then the request's genre, type and service.
async function searchPage(s) {
  const types = wantedTypes(s.q);
  if (!types.length) { s.done = true; return []; }
  const one = types.length === 1;
  const d = await tmdb(one ? `/search/${types[0]}` : "/search/multi", { query: s.q.rest.join(" "), include_adult: "false", page: s.page });
  if (s.page >= (d.total_pages || 1)) s.done = true;
  let list = (d.results || []).map(r => one ? Object.assign(r, { media_type: types[0] }) : r)
    .filter(r => (r.media_type === "movie" || r.media_type === "tv") && matchesFilters(r, s.q));
  if (s.q.named.length) {
    const ids = s.q.named.flatMap(providerIdsOf);
    const ok = await Promise.all(list.map(r => providersFR(r).then(fr => fr.list.some(x => ids.includes(x.p.provider_id))).catch(() => false)));
    list = list.filter((r, i) => ok[i]);
  }
  return list;
}

// A browse request ("films d'horreur sur Netflix"): TMDB discover, on the named services,
// else on the user's subscriptions. Films and series alternate.
async function discoverPage(s) {
  const types = wantedTypes(s.q);
  if (!types.length) { s.done = true; return []; }
  const ids = s.q.named.length ? s.q.named.flatMap(providerIdsOf) : myProviderIds();
  const pages = await Promise.all(types.map(t => {
    const p = Object.assign({ page: s.page, watch_region: "FR", with_watch_monetization_types: "flatrate|free|ads", include_adult: "false" }, filterParams(t));
    if (ids.length) p.with_watch_providers = ids.join("|");
    const g = s.q.genres.map(w => TMDB_GENRES[w][t === "movie" ? 0 : 1]).filter(Boolean);
    if (g.length) p.with_genres = [...new Set(g)].join(",");
    if (s.q.anime) p.with_original_language = "ja";
    return tmdb(`/discover/${t}`, p).then(d => ({ t, d }));
  }));
  s.done = pages.every(({ d }) => s.page >= (d.total_pages || 1));
  const out = [];
  const longest = Math.max(...pages.map(({ d }) => (d.results || []).length));
  for (let i = 0; i < longest; i++) {
    for (const { t, d } of pages) if ((d.results || [])[i]) out.push(Object.assign(d.results[i], { media_type: t }));
  }
  return out;
}

function renderSearchHint() {
  $("#searchHint").textContent = tmdbReady()
    ? "Écris ta demande comme tu parles : « animés sur Crunchyroll », « films d'horreur sur Netflix », « One Piece ». Sans titre ni service précisé, je cherche dans tes abonnements."
    : "Recherche simple : lance la recherche dans tes apps. Ajoute une clé TMDB dans Réglages pour voir où chaque titre est disponible.";
}

async function loadProviders(r, box) {
  box.replaceChildren(el("span", { class: "meta" }, "Recherche des services..."));
  try {
    const { list, link } = await providersFR(r);
    box.replaceChildren();
    if (!list.length) {
      box.append(el("span", { class: "meta" }, "Pas dispo en abonnement en France (peut-être en location)."));
      if (link) box.append(el("a", { href: link, target: "_blank", rel: "noopener", class: "meta" }, "Voir les options"));
      return null;
    }
    let mineMatch = null;
    const title = r.title || r.name;
    // The user's subscriptions first.
    const entries = list.map(({ p, kind }) => ({ p, kind, svc: matchProvider(p) }))
      .map(x => Object.assign(x, { mine: !!x.svc && state.enabled.includes(x.svc.id) }))
      .sort((a, b) => b.mine - a.mine);
    for (const { p, kind, svc, mine } of entries) {
      if (mine && !mineMatch) mineMatch = svc;
      box.append(el("button", {
        class: "chip" + (mine ? "" : " other"),
        style: mine ? `background:${svc.color}` : "",
        title: mine ? "Ouvrir" : svc ? "Pas dans tes abonnements" : "",
        onclick: svc ? () => openInService(svc, searchUrl(svc, title)) : null,
      }, [svc ? logoImg(logoOf(svc), "chip-logo") : null, (mine ? "✓ " : "") + p.provider_name + kind]));
    }
    return mineMatch;
  } catch (e) {
    box.replaceChildren(el("span", { class: "meta" }, e.message));
    return null;
  }
}

function resultCard(r) {
  const title = r.title || r.name;
  const year = (r.release_date || r.first_air_date || "").slice(0, 4);
  const key = `tmdb:${r.media_type}:${r.id}`;
  const providers = el("div", { class: "chips" });
  let bestService = null;

  const addBtn = el("button", { class: "btn small", onclick: () => {
    addToWatchlist({ key, title, year, type: r.media_type, poster: r.poster_path, service: bestService ? bestService.id : "" });
    addBtn.textContent = "✓ Dans ma liste";
  } }, inWatchlist(key) ? "✓ Dans ma liste" : "+ Ma liste");

  const card = el("div", { class: "card big" }, [
    poster(r.poster_path),
    el("div", { class: "body" }, [
      el("div", { class: "title" }, title),
      el("div", { class: "meta" }, [r.media_type === "tv" ? "Série" : "Film", year,
        r.vote_count ? `★ ${Math.round(r.vote_average * 10) / 10}/10` : null].filter(Boolean).join(" · ")),
      r.overview ? el("div", { class: "desc", onclick: e => e.currentTarget.classList.toggle("open") }, r.overview) : null,
      providers,
      el("div", { class: "row wrap" }, [addBtn, soundtrackBtn({ title, originalTitle: r.original_title || r.original_name })]),
    ]),
  ]);
  loadProviders(r, providers).then(s => { bestService = s; });
  return card;
}

function simpleResults(query) {
  const box = $("#searchResults");
  const mine = myServices();
  const key = "manual:" + query.toLowerCase();
  box.append(el("div", { class: "card" }, [
    el("div", { class: "noposter" }, "🔎"),
    el("div", { class: "body" }, [
      el("div", { class: "title" }, `« ${query} »`),
      el("div", { class: "meta" }, "Chercher dans :"),
      el("div", { class: "chips" }, mine.map(s =>
        el("button", { class: "chip", style: `background:${s.color}`, onclick: () => openInService(s, searchUrl(s, query)) }, s.name)
      )),
      el("div", { class: "row wrap" }, [
        el("button", { class: "btn small", onclick: () => addToWatchlist({ key, title: query, service: "" }) }, "+ Ma liste"),
      ]),
    ]),
  ]));
}

// ---------- Search: videos and the rest of the web ----------
// Videos come from Dailymotion's public API through the APK. Elsewhere: search links.

const VIDEO_SITES = [
  { name: "YouTube", color: "#FF0000", url: "https://www.youtube.com/results?search_query=" },
  { name: "Dailymotion", color: "#0D0D0D", url: "https://www.dailymotion.com/search/" },
  { name: "Arte", color: "#fa481c", url: "https://www.arte.tv/fr/search/?q=" },
];
const REPLAY_SITES = [
  { name: "france.tv", color: "#2a4bd7", url: "https://www.france.tv/recherche/?q=" },
  { name: "M6+", color: "#5b2fd6", url: "https://www.m6.fr/recherche?q=" },
  // TF1+ has no search page reachable by link: a Google search limited to the site instead.
  { name: "TF1+", color: "#0b3a8f", url: "https://www.google.com/search?q=site%3Atf1.fr+" },
  { name: "Twitch", color: "#9146FF", url: "https://www.twitch.tv/search?term=" },
  { name: "INA", color: "#e6007e", url: "https://www.ina.fr/recherche?q=" },
  { name: "LCP", color: "#00498f", url: "https://lcp.fr/recherche?search_api_fulltext=" },
  { name: "L'Équipe", color: "#d71920", url: "https://www.google.com/search?q=site%3Alequipe.fr+" },
];
const MUSIC_SITES = [
  { name: "Deezer", color: "#121216", url: "https://www.deezer.com/fr/search/" },
  { name: "Spotify", color: "#1DB954", url: "https://open.spotify.com/search/" },
  { name: "YouTube Music", color: "#FF0000", url: "https://music.youtube.com/search?q=" },
];
const WEB_ENGINES = [
  { name: "Google", color: "#4285F4", url: "https://www.google.com/search?q=" },
  { name: "DuckDuckGo", color: "#DE5833", url: "https://duckduckgo.com/?q=" },
  { name: "Bing", color: "#008373", url: "https://www.bing.com/search?q=" },
];

const videosAvailable = () => !!(native && native.get);

// ---- Video search inside the APK ----

function nativeGet(url) {
  return new Promise((resolve, reject) => {
    const id = String(++nativeSeq);
    nativeCalls[id] = { resolve, reject };
    native.get(url, id);
  });
}

const PER_SOURCE = 8;
const clock = sec => {
  if (!sec) return "";
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s2 = Math.floor(sec % 60);
  const mm = h ? String(m).padStart(2, "0") : m;
  return (h ? h + ":" : "") + mm + ":" + String(s2).padStart(2, "0");
};

async function dmVideos(q) {
  const params = new URLSearchParams({ search: q, limit: PER_SOURCE, localization: "fr_FR", sort: "relevance",
    fields: "title,url,thumbnail_360_url,duration,owner.screenname" });
  const data = JSON.parse(await nativeGet("https://api.dailymotion.com/videos?" + params));
  return (data.list || []).map(v => ({ source: "Dailymotion", title: v.title, url: v.url,
    thumb: v.thumbnail_360_url || "", duration: clock(v.duration), channel: v["owner.screenname"] || "" }));
}

async function nativeVideoSearch(q) {
  const errors = {};
  const videos = await dmVideos(q).catch(e => { errors.Dailymotion = e.message; return []; });
  return { videos, errors };
}

// The words that name the subject, without "trouve moi", "sur Netflix", "en VF"...
// For video sites the language is kept as a keyword ("one piece vf").
function subjectOf(text, withLang) {
  const q = parseQuery(text);
  const words = q.anime ? ["anime"].concat(q.rest) : q.rest;
  if (!words.length) return text;
  const lang = withLang ? (q.audioFr ? " vf" : q.subsFr ? " vostfr" : "") : "";
  return words.join(" ") + lang;
}

// Search engines open in the real browser on Windows: what they lead to is ordinary browsing.
function openInBrowser(url) {
  if (native) location.href = url; // handed to Android, which opens the browser
  else if (desktop && window.pywebview) window.pywebview.api.open_in_browser(url);
  else openOutside(url);
}

function siteChips(sites, query, opener) {
  return el("div", { class: "chips" }, sites.map(s =>
    el("button", { class: "chip", style: `background:${s.color}`, onclick: () => opener(s.url + encodeURIComponent(query)) }, s.name)));
}

function showSearchPane(id) {
  document.querySelectorAll(".srctab").forEach(t => t.classList.toggle("active", t.dataset.pane === id));
  document.querySelectorAll(".srcpane").forEach(p => { p.hidden = p.id !== id; });
}
document.querySelectorAll(".srctab").forEach(t => t.addEventListener("click", () => showSearchPane(t.dataset.pane)));

// A site search: the site's own search page when the user gave one, else Google limited to the site.
function siteSearchUrl(site, query) {
  if (site.search) return site.search.replace("{q}", encodeURIComponent(query));
  return "https://www.google.com/search?q=" + encodeURIComponent(`site:${new URL(site.url).hostname} ${query}`);
}

function mySitesSection(subject) {
  const sites = state.sites || [];
  return el("div", { class: "websection" }, [
    el("h3", {}, `Mes sites · « ${subject} »`),
    sites.length
      ? el("div", { class: "chips" }, sites.map(site =>
          el("button", { class: "chip", style: "background:var(--accent)", onclick: () => openOutside(siteSearchUrl(site, subject)) }, site.name)))
      : el("p", { class: "hint" }, "Ajoute tes sites vidéo dans Réglages pour chercher directement dessus."),
  ]);
}

function renderWebPane(text) {
  const subject = subjectOf(text);
  $("#searchWeb").replaceChildren(
    mySitesSection(subject),
    el("div", { class: "websection" }, [el("h3", {}, `Moteurs de recherche · « ${text} »`), siteChips(WEB_ENGINES, text, openInBrowser)]),
    el("div", { class: "websection" }, [el("h3", {}, `Replay et direct · « ${subject} »`), siteChips(REPLAY_SITES, subject, openLink)]),
    el("div", { class: "websection" }, [el("h3", {}, `Sites vidéo · « ${subjectOf(text, true)} »`), siteChips(VIDEO_SITES, subjectOf(text, true), openLink)]),
    el("div", { class: "websection" }, [el("h3", {}, `Musique · « ${subject} »`), siteChips(MUSIC_SITES, subject, openLink)]),
  );
}

function videoCard(v) {
  return el("button", { class: "vcard", title: v.title, onclick: () => openLink(v.url) }, [
    el("div", { class: "thumb" }, [
      v.thumb ? el("img", { src: v.thumb, alt: "" }) : null,
      v.duration ? el("span", { class: "dur" }, v.duration) : null,
    ]),
    el("div", { class: "vtitle" }, v.title),
    el("div", { class: "meta" }, [v.source, v.channel].filter(Boolean).join(" · ")),
  ]);
}

let videoSeq = 0;

async function searchVideos(text) {
  const pane = $("#searchVideos");
  const count = $("#videoCount");
  const subject = subjectOf(text, true);
  count.textContent = "";
  if (!videosAvailable()) {
    pane.replaceChildren(el("p", { class: "hint" }, `Chercher « ${subject} » directement sur :`), siteChips(VIDEO_SITES, subject, openLink));
    return;
  }
  const seq = ++videoSeq;
  pane.replaceChildren(el("p", { class: "hint" }, "Recherche sur Dailymotion..."));
  try {
    let data;
    if (native) {
      data = await nativeVideoSearch(subject);
    } else {
      const res = await fetch("/api/videos?q=" + encodeURIComponent(subject));
      if (!res.ok) throw new Error("Recherche vidéo indisponible (" + res.status + ")");
      data = await res.json();
    }
    if (seq !== videoSeq) return; // a newer search started
    const videos = data.videos || [];
    count.textContent = videos.length ? `(${videos.length})` : "";
    const grid = el("div", { class: "vgrid" }, videos.map(videoCard));
    // One filter chip per source that answered, plus "Toutes".
    const sources = [...new Set(videos.map(v => v.source))];
    const filters = el("div", { class: "vfilters" });
    const filterBy = (name, btn) => {
      filters.querySelectorAll(".chip").forEach(c => c.classList.toggle("other", c !== btn));
      grid.replaceChildren(...videos.filter(v => !name || v.source === name).map(videoCard));
    };
    for (const name of [null, ...sources]) {
      const n = name ? videos.filter(v => v.source === name).length : videos.length;
      const btn = el("button", { class: "chip" + (name ? " other" : ""), onclick: () => filterBy(name, btn) }, `${name || "Toutes"} (${n})`);
      filters.append(btn);
    }
    const failed = Object.keys(data.errors || {});
    pane.replaceChildren(
      el("p", { class: "hint" }, `Vidéos pour « ${subject} »` + (failed.length ? ` · ${failed.join(", ")} ne répond pas` : "")),
      videos.length ? filters : el("p", { class: "hint" }, "Aucune vidéo trouvée."),
      grid,
    );
  } catch (err) {
    if (seq !== videoSeq) return;
    pane.replaceChildren(el("p", { class: "hint" }, err.message + ". Chercher directement sur :"), siteChips(VIDEO_SITES, subject, openLink));
  }
}

// ---------- Search history ----------
// Most recent first, shown as chips under the search bar (at most 3 rows, CSS .history).
const HISTORY_MAX = 30;

function addHistory(query) {
  const key = query.toLowerCase();
  state.history = [query].concat(state.history.filter(h => h.toLowerCase() !== key)).slice(0, HISTORY_MAX);
  save();
  renderHistory();
}

function removeHistory(query) {
  state.history = state.history.filter(h => h !== query);
  save();
  renderHistory();
}

function renderHistory() {
  const box = $("#searchHistory");
  box.hidden = !state.history.length;
  box.replaceChildren(
    el("button", { class: "chip hchip clear", title: "Effacer l'historique", onclick: () => {
      if (confirm("Effacer tout l'historique de recherche ?")) { state.history = []; save(); renderHistory(); }
    } }, "🗑 Effacer"),
    ...state.history.map(h => el("span", { class: "chip hchip" }, [
      el("button", { class: "hrun", title: "Relancer cette recherche", onclick: () => {
        $("#searchInput").value = h;
        $("#searchForm").requestSubmit();
      } }, "🕘 " + h),
      el("button", { class: "hdel", title: "Retirer", "aria-label": "Retirer " + h, onclick: () => removeHistory(h) }, "×")
    ]))
  );
}
renderHistory();

$("#searchForm").addEventListener("submit", async e => {
  e.preventDefault();
  const query = $("#searchInput").value.trim();
  if (query) addHistory(query);
  const box = $("#searchResults");
  box.replaceChildren();
  $("#searchTabs").hidden = !query;
  showSearchPane("searchResults");
  // Filters alone (no text): browse the platforms with them, no video or web search.
  if (!query && activeFilters().length && tmdbReady()) { smartSearch(""); return; }
  if (!query) return;
  $("#searchInput").blur();
  renderWebPane(query);
  searchVideos(query);

  if (tmdbReady()) { smartSearch(query); return; }
  simpleResults(query);
});

// ---------- VPN (the user's own VPN app, whichever it is) ----------
// StreamHub does not route traffic itself. In the APK, Android says whether a VPN is on
// (native.vpnActive); the exit country comes from a public IP service, asked only while
// a VPN is on and at most every 10 minutes. The button opens the VPN app chosen in Settings,
// else Android's VPN settings.

let vpnChecked = 0;
let vpnCountry = { at: 0, text: "" };

const countryName = code => {
  try { return new Intl.DisplayNames(["fr"], { type: "region" }).of(code); } catch (e) { return code; }
};
// Several free services, tried in order: some refuse VPN addresses or limit calls per day.
const IP_SERVICES = [
  ["https://ipinfo.io/json", d => d.country && countryName(d.country)],
  ["https://freeipapi.com/api/json", d => d.countryName],
  ["https://ipwho.is/", d => d.success && d.country],
];

async function exitCountry() {
  if (Date.now() - vpnCountry.at < 600000) return vpnCountry.text;
  for (const [url, read] of IP_SERVICES) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const country = read(await r.json());
      if (country) { vpnCountry = { at: Date.now(), text: country }; return country; }
    } catch (e) { /* next service */ }
  }
  return "";
}

const vpnLabel = () => state.vpnName || "les réglages VPN";

async function checkVpn(force) {
  const btn = $("#vpnBtn");
  if (!native || !native.vpnActive) { btn.hidden = true; return; }
  if (!force && Date.now() - vpnChecked < 15000) return;
  vpnChecked = Date.now();
  const on = native.vpnActive();
  if (!on) {
    btn.className = "vpn off";
    btn.textContent = "🛡 VPN coupé";
    btn.title = "Aucun VPN actif. Clic : ouvrir " + vpnLabel();
    return;
  }
  btn.className = "vpn on";
  btn.textContent = "🛡 VPN";
  btn.title = "VPN actif. Clic : ouvrir " + vpnLabel();
  const country = await exitCountry();
  if (country) btn.textContent = `🛡 VPN · ${country}`;
}

function openVpn() {
  if (!native || !native.openVpn) return;
  if (!native.openVpn(state.vpnPkg || "")) {
    toast(`${state.vpnName || "Ton appli VPN"} est introuvable : choisis-la dans Réglages`);
    return;
  }
  // Connecting takes a few seconds: check again a little later.
  vpnCountry.at = 0;
  [8000, 20000, 40000].forEach(ms => setTimeout(() => checkVpn(true), ms));
}

// Settings: pick the VPN app among those installed on the phone.
function renderVpnSettings() {
  const box = $("#vpnBox");
  if (!native || !native.vpnApps) { box.hidden = true; return; }
  box.hidden = false;
  let apps = [];
  try { apps = JSON.parse(native.vpnApps()); } catch (e) { apps = []; }
  if (state.vpnPkg && !apps.some(a => a.pkg === state.vpnPkg)) apps.push({ pkg: state.vpnPkg, name: (state.vpnName || state.vpnPkg) + " (pas installée)" });
  const select = el("select", { onchange: e => {
    const app = apps.find(a => a.pkg === e.target.value);
    state.vpnPkg = app ? app.pkg : "";
    state.vpnName = app ? app.name.replace(/ \(pas installée\)$/, "") : "";
    save();
    checkVpn(true);
  } }, [el("option", { value: "" }, "Réglages VPN d'Android")].concat(
    apps.map(a => el("option", { value: a.pkg, selected: a.pkg === state.vpnPkg }, a.name))));
  $("#vpnPick").replaceChildren(select);
  $("#vpnNone").hidden = apps.length > 0;
}

$("#vpnBtn").addEventListener("click", openVpn);
window.addEventListener("focus", () => checkVpn(false));
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkVpn(false); });
checkVpn(true);
// Also catches a VPN switched on straight from its own app (no network call while it is off).
setInterval(() => { if (!document.hidden) checkVpn(true); }, 60000);

// ---------- Ad blocker of the in-app browser window (AdBlock.java, AdGuard DNS filter) ----------
// Only on the pages of the sites added in "Mes sites vidéo": no site added, no blocking.
// Never on YouTube, Google or the official platforms.

function applyAdblock() {
  if (!native || !native.setAdblock) return;
  const sites = (state.sites || []).map(s => s.url).filter(Boolean);
  const n = native.setAdblock(state.adblock, JSON.stringify(sites));
  $("#adblockText").textContent = !state.adblock ? "Bloquer les pubs sur mes sites (coupé)"
    : !sites.length ? "Bloquer les pubs sur mes sites (aucun site ajouté : inactif)"
    : `Bloquer les pubs sur mes ${sites.length > 1 ? sites.length + " sites" : "site"}` + (n ? ` (${n.toLocaleString("fr-FR")} domaines)` : " (liste en téléchargement)");
}

$("#adblockOn").addEventListener("change", e => { state.adblock = e.target.checked; save(); applyAdblock(); });
applyAdblock();

// ---------- Settings ----------

function renderSettings() {
  const box = $("#serviceToggles");
  box.replaceChildren();
  for (const s of allServices()) {
    const cb = el("input", { type: "checkbox", checked: state.enabled.includes(s.id), onchange: e => {
      state.enabled = e.target.checked ? state.enabled.concat(s.id) : state.enabled.filter(x => x !== s.id);
      save();
    } });
    const isCustom = state.custom.some(c => c.id === s.id);
    box.append(el("label", { class: "toggle" }, [
      cb,
      el("span", { class: "dot", style: `background:${s.color}` }, [logoImg(logoOf(s), "dot-logo")]),
      s.name,
      isCustom ? el("button", { class: "del", type: "button", title: "Supprimer", onclick: e => {
        e.preventDefault();
        state.custom = state.custom.filter(c => c.id !== s.id);
        state.enabled = state.enabled.filter(x => x !== s.id);
        save(); renderSettings();
      } }, "✕") : null,
    ]));
  }
  $("#tmdbKey").value = state.tmdbKey;
  $("#adblockBox").hidden = !(native && native.setAdblock);
  $("#adblockOn").checked = state.adblock;
  applyAdblock();
  renderVpnSettings();
  renderSites();
}

function renderSites() {
  const box = $("#siteList");
  box.replaceChildren(...(state.sites || []).map(site => el("div", { class: "site-row" }, [
    el("div", { class: "grow" }, [
      el("b", {}, site.name),
      el("span", { class: "meta" }, new URL(site.url).hostname + (site.search ? " · recherche directe" : " · recherche via Google")),
    ]),
    el("button", { class: "btn mini", onclick: () => openOutside(site.url) }, "Ouvrir"),
    el("button", { class: "del", title: "Supprimer", onclick: () => {
      state.sites = state.sites.filter(x => x !== site); save(); renderSites();
    } }, "✕"),
  ])));
  applyAdblock();  // the ad blocker works on exactly these sites
}

$("#siteForm").addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(e.target);
  let search = f.get("search").trim();
  if (search) {
    // The user searched the word "test" on the site: that word becomes the placeholder.
    if (!/test/i.test(search)) { toast("Dans l'adresse de recherche, le mot « test » est introuvable"); return; }
    search = search.replace(/test/i, "{q}");
  }
  state.sites = (state.sites || []).concat({ id: "site-" + Date.now(), name: f.get("name").trim(), url: f.get("url").trim(), search });
  save();
  e.target.reset();
  renderSites();
  toast("Site ajouté");
});

$("#customForm").addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const id = "custom-" + Date.now();
  state.custom.push({
    id,
    name: f.get("name").trim(),
    web: f.get("web").trim(),
    pkg: f.get("pkg").trim() || undefined,
    color: f.get("color"),
  });
  state.enabled.push(id);
  save();
  e.target.reset();
  renderSettings();
  toast("Service ajouté");
});

$("#tmdbForm").addEventListener("submit", e => {
  e.preventDefault();
  state.tmdbKey = $("#tmdbKey").value.trim();
  save();
  toast(state.tmdbKey ? "Clé enregistrée" : "Clé supprimée");
});

$("#exportBtn").addEventListener("click", () => {
  if (native) { native.exportData(JSON.stringify(state, null, 2)); return; }
  if (desktop && window.pywebview) { window.pywebview.api.export_data(JSON.stringify(state, null, 2)); return; }
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = el("a", { href: URL.createObjectURL(blob), download: "streamhub-sauvegarde.json" });
  document.body.append(a); a.click(); a.remove();
});

$("#importFile").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    state = Object.assign(defaultState(), JSON.parse(await file.text()));
    save(); renderSettings(); toast("Sauvegarde importée");
  } catch (err) {
    toast("Fichier invalide");
  }
  e.target.value = "";
});

$("#resetBtn").addEventListener("click", () => {
  if (!confirm("Effacer ta liste, tes services et ta clé ?" + (syncCfg().code ? " Ce sera effacé aussi sur tes appareils synchronisés." : ""))) return;
  state = defaultState(); save(); renderSettings(); toast("Tout est effacé");
});

// ---------- Discover: popular, new and coming soon on the user's services ----------
// From TMDB discover, one small request per service so each title knows its service.
// Rows are cached for 3 hours.

const DAY = 86400000;
const isoDay = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const tmdbPoster = path => path ? IMG + path : null;

// "aujourd'hui", "hier", "demain", else "lun. 20/10".
function dayLabel(dateStr) {
  const d = new Date(dateStr.slice(0, 10) + "T12:00:00");
  const diff = Math.round((d - new Date(isoDay(Date.now()) + "T12:00:00")) / DAY);
  if (diff === 0) return "aujourd'hui";
  if (diff === -1) return "hier";
  if (diff === 1) return "demain";
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

// A poster card in a horizontal row. Tap = open on the service, "+" = add to my list.
function posterCard(it) {
  const add = el("button", { class: "padd", title: "Ajouter à ma liste", onclick: e => {
    e.stopPropagation();
    addToWatchlist({ key: it.key, title: it.title, year: it.year, type: it.type, poster: it.posterPath,
      service: it.svc ? it.svc.id : "" });
    add.textContent = "✓";
  } }, inWatchlist(it.key) ? "✓" : "+");
  const open = () => { if (it.svc) openInService(it.svc, searchUrl(it.svc, it.title)); };
  return el("div", { class: "pcard", role: "button", tabindex: "0", title: it.title, onclick: open,
    onkeydown: e => { if (e.key === "Enter") open(); } }, [
    el("div", { class: "pimg" }, [
      it.poster ? el("img", { src: it.poster, alt: "", loading: "lazy" }) : el("div", { class: "noposter" }, "🎬"),
      it.svc ? el("span", { class: "psvc" }, logoImg(logoOf(it.svc), "chip-logo")) : null,
      add,
    ]),
    el("div", { class: "ptitle" }, it.title),
    el("div", { class: "psub" }, it.sub),
  ]);
}

function discoverItem(r, type, svc) {
  return {
    key: `tmdb:${type}:${r.id}`, title: r.title || r.name, type, svc,
    year: (r.release_date || r.first_air_date || "").slice(0, 4),
    posterPath: r.poster_path, poster: tmdbPoster(r.poster_path), pop: r.popularity || 0,
  };
}

async function fetchDiscover(svcs) {
  const today = isoDay(Date.now());
  const rows = { trending: [], fresh: [], upcoming: [] };
  const add = (row, d, type, svc, n) => {
    for (const r of (d.results || []).slice(0, n)) row.push(discoverItem(r, type, svc));
  };
  const jobs = [];
  for (const svc of svcs) {
    const ids = providerIdsOf(svc);
    if (!ids.length) continue;
    const base = { watch_region: "FR", with_watch_providers: ids.join("|"), with_watch_monetization_types: "flatrate|free|ads" };
    const get = (type, extra) => tmdb(`/discover/${type}`, Object.assign({}, base, extra));
    jobs.push(
      get("movie", { sort_by: "popularity.desc" }).then(d => add(rows.trending, d, "movie", svc, 6)),
      get("tv", { sort_by: "popularity.desc" }).then(d => add(rows.trending, d, "tv", svc, 6)),
      // New: films released in the last two months, series with an episode out this week.
      get("movie", { sort_by: "popularity.desc", "primary_release_date.gte": isoDay(Date.now() - 60 * DAY), "primary_release_date.lte": today })
        .then(d => add(rows.fresh, d, "movie", svc, 5)),
      get("tv", { sort_by: "popularity.desc", "air_date.gte": isoDay(Date.now() - 7 * DAY), "air_date.lte": today })
        .then(d => add(rows.fresh, d, "tv", svc, 6)),
      // Coming soon: series with an episode in the next two weeks.
      get("tv", { sort_by: "popularity.desc", "air_date.gte": isoDay(Date.now() + DAY), "air_date.lte": isoDay(Date.now() + 14 * DAY) })
        .then(d => add(rows.upcoming, d, "tv", svc, 5)),
    );
  }
  await Promise.all(jobs);

  // One title can be on several services: keep it once, most popular first.
  const dedupe = list => {
    const seen = new Set();
    return list.sort((a, b) => b.pop - a.pop).filter(it => !seen.has(it.key) && seen.add(it.key));
  };
  rows.trending = dedupe(rows.trending).slice(0, 24);
  for (const it of rows.trending) it.sub = it.svc.name;
  rows.fresh = dedupe(rows.fresh).slice(0, 30);
  for (const it of rows.fresh) it.sub = [it.svc.name, it.type === "tv" ? "nouvel épisode" : "film récent"].join(" · ");

  // The date of the next episode, for the first 15.
  rows.upcoming = dedupe(rows.upcoming).slice(0, 15);
  await Promise.all(rows.upcoming.map(async it => {
    try {
      const next = (await tmdb(`/tv/${it.key.split(":")[2]}`)).next_episode_to_air;
      if (next && next.air_date) {
        it.date = next.air_date;
        it.sub = [`S${next.season_number}E${next.episode_number}`, it.svc.name, dayLabel(next.air_date)].join(" · ");
      }
    } catch (e) { /* shown without a date */ }
    if (!it.sub) it.sub = it.svc.name;
  }));
  rows.upcoming.sort((a, b) => (a.date || "9").localeCompare(b.date || "9"));
  return rows;
}

let discoverCache = null;
let discoverLoading = null;

async function renderDiscover() {
  const box = $("#discover");
  const svcs = myServices();
  if (!tmdbReady() || !svcs.length) { box.replaceChildren(); return; }
  const sig = svcs.map(s => s.id).join(",");
  if (!discoverCache || discoverCache.sig !== sig || Date.now() - discoverCache.at > 3 * 3600e3) {
    if (!box.children.length) box.replaceChildren(el("p", { class: "hint" }, "Chargement des nouveautés..."));
    try {
      if (!discoverLoading || discoverLoading.sig !== sig) {
        discoverLoading = { sig, p: loadProviderList().then(() => fetchDiscover(svcs)) };
      }
      const rows = await discoverLoading.p;
      discoverCache = { sig, at: Date.now(), rows };
    } catch (err) {
      box.replaceChildren(el("p", { class: "hint" }, "Nouveautés indisponibles : " + err.message));
      return;
    } finally {
      discoverLoading = null;
    }
  }
  const r = discoverCache.rows;
  const row = (title, items, empty) => el("section", { class: "prow" }, [
    el("h2", { class: "mt" }, title),
    items.length ? el("div", { class: "pscroll" }, items.map(posterCard)) : el("p", { class: "hint" }, empty),
  ]);
  box.replaceChildren(
    row("🔥 Populaire sur tes abonnements", r.trending, "Rien pour le moment."),
    row("🆕 Nouveautés", r.fresh, "Aucune nouveauté ces derniers jours."),
    row("📅 Bientôt", r.upcoming, "Aucun épisode annoncé dans les 2 semaines."),
  );
}

// ---------- "Je ne sais pas quoi regarder": a random pick ----------

const pick = { type: "", short: false, from: "mine" };

function choiceRow(key, options) {
  return el("div", { class: "chips choice" }, options.map(([value, label]) =>
    el("button", { class: "chip" + (pick[key] === value ? "" : " other"), onclick: e => {
      pick[key] = value;
      e.currentTarget.parentNode.querySelectorAll(".chip").forEach(c => c.classList.toggle("other", c !== e.currentTarget));
    } }, label)));
}

function toggleRandom() {
  const box = $("#randomBox");
  if (!box.hidden) { box.hidden = true; return; }
  box.hidden = false;
  box.replaceChildren(
    choiceRow("type", [["", "Tout"], ["movie", "Film"], ["tv", "Série"]]),
    choiceRow("short", [[false, "Peu importe la durée"], [true, "Moins de 1 h 30"]]),
    choiceRow("from", [["mine", "Dans mes abonnements"], ["list", "Dans ma liste"]]),
    el("div", { class: "row center" }, el("button", { class: "btn", onclick: drawRandom }, "🎲 Tirer au sort")),
    el("div", { id: "randomResult", class: "list" }),
  );
}

async function drawRandom() {
  const out = $("#randomResult");
  if (pick.from === "list") {
    const items = state.watchlist.filter(i => !i.seen && (!pick.type || i.type === pick.type));
    if (!items.length) { out.replaceChildren(el("p", { class: "hint" }, "Rien à tirer dans ta liste avec ces critères.")); return; }
    out.replaceChildren(watchCard(items[Math.floor(Math.random() * items.length)]));
    return;
  }
  if (!tmdbReady()) { out.replaceChildren(el("p", { class: "hint" }, "Ajoute une clé TMDB dans Réglages d'abord.")); return; }
  out.replaceChildren(el("p", { class: "hint" }, "Je cherche..."));
  try {
    await loadProviderList();
    const ids = myProviderIds();
    if (!ids.length) { out.replaceChildren(el("p", { class: "hint" }, "Coche tes abonnements dans Réglages d'abord.")); return; }
    const type = pick.type || (Math.random() < 0.5 ? "movie" : "tv");
    const p = { watch_region: "FR", with_watch_providers: ids.join("|"), with_watch_monetization_types: "flatrate|free|ads",
      "vote_average.gte": 6.5, "vote_count.gte": 200, sort_by: "popularity.desc" };
    if (pick.short) p["with_runtime.lte"] = 90;
    // A random page among the first 20, then a random title on it.
    const first = await tmdb(`/discover/${type}`, p);
    const pages = Math.min(first.total_pages || 1, 20);
    const d = pages > 1 ? await tmdb(`/discover/${type}`, Object.assign({}, p, { page: 1 + Math.floor(Math.random() * pages) })) : first;
    const list = d.results || [];
    if (!list.length) { out.replaceChildren(el("p", { class: "hint" }, "Aucun titre avec ces critères.")); return; }
    const r = Object.assign(list[Math.floor(Math.random() * list.length)], { media_type: type });
    out.replaceChildren(resultCard(r), el("div", { class: "row center" }, el("button", { class: "btn ghost", onclick: drawRandom }, "🎲 Un autre")));
  } catch (err) {
    out.replaceChildren(el("p", { class: "hint" }, err.message));
  }
}

function soundtrackBtn(c) {
  const music = serviceById("deezer") && state.enabled.includes("deezer") ? serviceById("deezer") : serviceById("spotify");
  const query = (c.originalTitle || c.title) + " soundtrack";
  return el("button", { class: "btn mini", title: `Bande originale sur ${music.name}`, onclick: () => openInService(music, searchUrl(music, query)) }, "🎵 BO");
}

// ---------- Search filters (Plateformes tab) ----------

const FILTER_FIELDS = [
  ["type", "Type", [["", "Films et séries"], ["MOVIE", "Films"], ["SHOW", "Séries"]]],
  ["score", "Note", [["", "Toutes les notes"], ["6", "★ 6 et plus"], ["7", "★ 7 et plus"], ["8", "★ 8 et plus"]]],
  ["years", "Année", [["", "Toutes les années"], ["2024-", "2024 et après"], ["2020-", "2020 et après"], ["2010-2019", "2010 à 2019"], ["2000-2009", "2000 à 2009"], ["-1999", "Avant 2000"]]],
  ["runtime", "Durée", [["", "Toutes les durées"], ["90", "Moins de 1 h 30"], ["120", "Moins de 2 h"]]],
  ["sort", "Tri", [["", "Les plus populaires"], ["TOP", "Les mieux notés"], ["RECENT", "Les plus récents"]]],
];

const activeFilters = () => Object.entries(state.filters || {}).filter(([, v]) => v);

function renderFilters() {
  const n = activeFilters().length;
  $("#filterBtn").textContent = n ? `⚙ Filtres (${n})` : "⚙ Filtres";
  $("#filterBtn").classList.toggle("other", !n);
  const f = state.filters || {};
  $("#filterBox").replaceChildren(
    ...FILTER_FIELDS.map(([key, label, options]) => el("label", { class: "fsel" }, [
      el("span", {}, label),
      el("select", { onchange: e => { state.filters = Object.assign({}, state.filters, { [key]: e.target.value }); save(); renderFilters(); rerunSearch(); } },
        options.map(([v, text]) => el("option", { value: v, selected: (f[key] || "") === v }, text))),
    ])),
    el("button", { class: "btn mini", onclick: () => { state.filters = {}; save(); renderFilters(); rerunSearch(); } }, "Réinitialiser"),
  );
}

function rerunSearch() {
  if ($("#searchInput").value.trim() || activeFilters().length) $("#searchForm").requestSubmit();
}

function describeFilters() {
  return activeFilters().map(([k, v]) => {
    const field = FILTER_FIELDS.find(x => x[0] === k);
    return field ? (field[2].find(o => o[0] === v) || [])[1] : null;
  }).filter(Boolean).join(" · ");
}

// ---------- Episodes: progress per series and new episode alerts ----------

const epKey = (s, e) => s + "x" + e;
const tvId = item => (/^tmdb:tv:(\d+)$/.exec(item.key || "") || [])[1] || item.tmdbId || null;
const today = () => isoDay(Date.now());
// An episode without a date is announced, not out.
const aired = ep => !!ep.d && ep.d <= today();

// Series added by hand or imported have no TMDB id: found once by title and year.
async function resolveShowId(item) {
  if (tvId(item)) return tvId(item);
  if (item.type !== "tv" || item.tmdbTried) return null;
  item.tmdbTried = true;
  let d = await tmdb("/search/tv", item.year ? { query: item.title, first_air_date_year: item.year } : { query: item.title });
  if (!(d.results || []).length && item.year) d = await tmdb("/search/tv", { query: item.title });
  const list = d.results || [];
  const hit = list.find(r => [r.name, r.original_name].some(t => t && norm(t) === norm(item.title))) || list[0];
  if (hit) item.tmdbId = String(hit.id);
  save();
  return item.tmdbId || null;
}

// Seasons and episodes of one show: its details, then its seasons appended 20 at a time.
async function showSeasons(id) {
  const show = await tmdb(`/tv/${id}`);
  const nums = (show.seasons || []).map(x => x.season_number).filter(n => n > 0);
  const seasons = [];
  for (let i = 0; i < nums.length; i += 20) {
    const part = nums.slice(i, i + 20);
    const d = await tmdb(`/tv/${id}`, { append_to_response: part.map(n => "season/" + n).join(",") });
    for (const n of part) {
      const season = d["season/" + n];
      if (!season || !(season.episodes || []).length) continue;
      seasons.push({ n, eps: season.episodes.map(e => ({ n: e.episode_number, t: e.name, d: e.air_date || null })).sort((a, b) => a.n - b.n) });
    }
  }
  return seasons.sort((a, b) => a.n - b.n);
}

// Several shows, three at a time.
async function fetchEpisodes(ids) {
  const out = {};
  const queue = ids.slice();
  await Promise.all([0, 1, 2].map(async () => {
    while (queue.length) {
      const id = queue.shift();
      try { out[id] = await showSeasons(id); } catch (e) { /* next show */ }
    }
  }));
  return out;
}

// Stores the episode list and counts newly aired episodes since the last check.
function storeEpisodes(item, seasons) {
  item.eps = seasons;
  item.epsAt = Date.now();
  const count = seasons.reduce((n, s) => n + s.eps.filter(aired).length, 0);
  const added = item.aired !== undefined ? count - item.aired : 0;
  if (added > 0) item.newEps = (item.newEps || 0) + added;
  item.aired = count;
  return Math.max(added, 0);
}

function progress(item) {
  const watched = new Set(item.watched || []);
  let total = 0, done = 0, next = null, upcoming = null;
  for (const s of item.eps || []) for (const e of s.eps) {
    if (!aired(e)) { if (!upcoming) upcoming = { s: s.n, e: e.n, d: e.d }; continue; }
    total++;
    if (watched.has(epKey(s.n, e.n))) done++;
    else if (!next) next = { s: s.n, e: e.n };
  }
  return { total, done, next, upcoming };
}

const openEps = new Set();

async function toggleEpisodes(item) {
  const k = item.key;
  if (openEps.has(k)) { openEps.delete(k); refresh(); return; }
  openEps.add(k);
  if (item.newEps) { delete item.newEps; save(); updateBadges(); }
  refresh();
  if (!item.eps || Date.now() - (item.epsAt || 0) > 12 * 3600e3) {
    try {
      const id = await resolveShowId(item);
      if (!id) { item.epsError = tmdbReady() ? "Série introuvable sur TMDB." : "Ajoute une clé TMDB dans Réglages pour suivre les épisodes."; refresh(); return; }
      const res = await fetchEpisodes([id]);
      if (res[id]) storeEpisodes(item, res[id]);
      delete item.newEps;
      delete item.epsError;
      save();
    } catch (err) {
      item.epsError = err.message;
    }
    refresh();
  }
}

function setWatched(item, keys, on) {
  const set = new Set(item.watched || []);
  for (const k of keys) on ? set.add(k) : set.delete(k);
  item.watched = [...set];
  save();
  refresh();
}

function episodePanel(item) {
  if (item.epsError) return el("p", { class: "hint" }, item.epsError);
  if (!item.eps) return el("p", { class: "hint" }, "Chargement des épisodes...");
  const watched = new Set(item.watched || []);
  const p = progress(item);
  const current = item.epSeason || (p.next ? p.next.s : item.eps[item.eps.length - 1].n);
  const season = item.eps.find(s => s.n === current) || item.eps[0];
  // Everything aired up to this episode, across seasons.
  const upTo = (sn, en) => item.eps.flatMap(s => s.eps.filter(e => aired(e) && (s.n < sn || (s.n === sn && e.n <= en))).map(e => epKey(s.n, e.n)));
  const airedHere = season.eps.filter(aired).map(e => epKey(season.n, e.n));
  const allSeen = airedHere.length && airedHere.every(k => watched.has(k));
  return el("div", { class: "eps" }, [
    el("div", { class: "chips" }, item.eps.map(s => el("button", {
      class: "chip" + (s.n === season.n ? "" : " other"),
      onclick: () => { item.epSeason = s.n; save(); refresh(); },
    }, `S${s.n}`))),
    el("div", { class: "row wrap" }, [
      el("button", { class: "btn mini", onclick: () => setWatched(item, airedHere, !allSeen) }, allSeen ? "Saison pas vue" : "✓ Saison vue"),
    ]),
    el("div", { class: "chapters" }, season.eps.map(e => {
      const k = epKey(season.n, e.n);
      const isSeen = watched.has(k);
      const out = !aired(e);
      return el("div", { class: "chapter ep" + (isSeen ? " read" : "") + (out ? " future" : "") }, [
        el("button", { class: "epcheck", disabled: out, title: isSeen ? "Pas vu" : "Vu", onclick: () => setWatched(item, [k], !isSeen) }, isSeen ? "✓" : ""),
        el("span", { class: "grow" }, `${e.n}. ${e.t || "Épisode " + e.n}`),
        el("span", { class: "meta" }, e.d ? (out ? "sort " + dayLabel(e.d) : new Date(e.d + "T12:00:00").toLocaleDateString("fr-FR")) : ""),
        out || isSeen ? null : el("button", { class: "btn mini", title: "Tout marquer vu jusqu'à cet épisode", onclick: () => setWatched(item, upTo(season.n, e.n), true) }, "vu jusqu'ici"),
      ]);
    })),
  ]);
}

// Extra lines of a series card in My list: progress, new episodes, next release, episode panel.
function seriesInfo(item) {
  if (item.type !== "tv") return [];
  const out = [];
  if (item.eps) {
    const p = progress(item);
    const pct = p.total ? Math.round(100 * p.done / p.total) : 0;
    out.push(el("div", { class: "meta" }, [
      `${p.done}/${p.total} épisodes`,
      p.next && p.done ? ` · reprendre à S${p.next.s}E${p.next.e}` : "",
      p.upcoming ? ` · prochain : S${p.upcoming.s}E${p.upcoming.e} ${p.upcoming.d ? dayLabel(p.upcoming.d) : ""}` : "",
    ].join("")));
    out.push(el("div", { class: "pbar" }, el("span", { style: `width:${pct}%` })));
  }
  if (item.newEps) out.push(el("div", {}, el("span", { class: "badge new" }, item.newEps > 1 ? `🆕 ${item.newEps} nouveaux épisodes` : "🆕 1 nouvel épisode")));
  if (openEps.has(item.key)) out.push(episodePanel(item));
  return out;
}

// ---------- Alerts: new episodes in My list ----------
// Checked at start-up and every hour, at most every 6 hours.

async function checkUpdates(force) {
  updateBadges();
  if (!force && Date.now() - (state.lastCheck || 0) < 6 * 3600e3) return;
  if (!tmdbReady()) return;
  state.lastCheck = Date.now();
  save();
  let eps = 0;
  try {
    const shows = state.watchlist.filter(i => i.type === "tv");
    // A few title lookups per check, so a big imported list does not flood TMDB.
    for (const item of shows.filter(i => !tvId(i) && !i.tmdbTried).slice(0, 10)) await resolveShowId(item).catch(() => null);
    const ids = [...new Set(shows.map(tvId).filter(Boolean))];
    const res = await fetchEpisodes(ids);
    for (const item of shows) if (res[tvId(item)]) eps += storeEpisodes(item, res[tvId(item)]);
  } catch (e) { /* next time */ }

  save();
  updateBadges();
  refresh();
  if (eps) toast("🆕 " + (eps > 1 ? `${eps} nouveaux épisodes dans ta liste` : "1 nouvel épisode dans ta liste"));
}

function updateBadges() {
  const nav = document.querySelector('.nav[data-view="list"]');
  const n = state.watchlist.filter(i => i.newEps).length;
  let b = nav.querySelector(".nbadge");
  if (!n) { b?.remove(); return; }
  if (!b) { b = el("b", { class: "nbadge" }); nav.append(b); }
  b.textContent = n;
}

setTimeout(() => checkUpdates(), 4000);
setInterval(() => checkUpdates(), 3600e3);

// ---------- Import from TV Time, Trakt, Letterboxd or IMDb ----------

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === "," || ch === ";") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}

// Returns [{ title, year, type, seen }] from any of the supported export files.
function parseImport(text, filename) {
  const seen = /watched|history|seen|diary|ratings|vu/i.test(filename);
  const items = [];
  if (/^\s*[\[{]/.test(text)) {
    let data = JSON.parse(text);
    if (!Array.isArray(data)) data = Object.values(data).find(Array.isArray) || [];
    for (const o of data) {
      if (o.show) items.push({ title: o.show.title, year: o.show.year, type: "tv", seen });
      else if (o.movie) items.push({ title: o.movie.title, year: o.movie.year, type: "movie", seen });
      else if (o.title || o.name) items.push({ title: o.title || o.name, year: o.year, type: /show|serie|tv/i.test(o.type || "") ? "tv" : "movie", seen });
    }
  } else {
    const [head, ...rows] = parseCsv(text.replace(/^﻿/, ""));
    const h = head.map(x => x.trim().toLowerCase());
    const showCol = h.findIndex(x => ["tv_show_name", "series_name", "show_name", "series", "show"].includes(x));
    const titleCol = showCol >= 0 ? showCol : h.findIndex(x => ["title", "name", "movie_name", "film", "titre"].includes(x));
    if (titleCol < 0) throw new Error("Colonne du titre introuvable dans ce fichier");
    const yearCol = h.findIndex(x => ["year", "année", "annee", "release_year"].includes(x));
    const typeCol = h.findIndex(x => ["title type", "type", "media_type"].includes(x));
    const letterboxd = h.includes("letterboxd uri");
    for (const r of rows) {
      const title = (r[titleCol] || "").trim();
      if (!title) continue;
      const t = typeCol >= 0 ? r[typeCol] || "" : "";
      const type = showCol >= 0 || /tv|series|show|série/i.test(t) ? "tv" : letterboxd || /movie|film/i.test(t) ? "movie" : "";
      items.push({ title, year: yearCol >= 0 ? parseInt(r[yearCol], 10) || null : null, type, seen });
    }
  }
  const unique = new Map();
  for (const it of items) if (it.title) unique.set(norm(it.title) + "|" + it.type, it);
  return [...unique.values()];
}

async function importOther(file) {
  const status = $("#importOtherStatus");
  let list;
  try { list = parseImport(await file.text(), file.name).slice(0, 500); }
  catch (err) { status.textContent = "Import impossible : " + err.message; return; }
  if (!list.length) { status.textContent = "Aucun titre trouvé dans ce fichier."; return; }
  let done = 0, added = 0, matched = 0;
  const one = async it => {
    let entry = { key: "manual:" + norm(it.title), title: it.title, year: it.year || "", type: it.type, service: "" };
    if (tmdbReady()) {
      try {
        const type = it.type || "multi";
        const params = { query: it.title };
        if (it.year && type !== "multi") params[type === "tv" ? "first_air_date_year" : "primary_release_year"] = it.year;
        const d = await tmdb(`/search/${type}`, params);
        const list = (d.results || []).map(r => type === "multi" ? r : Object.assign(r, { media_type: type }))
          .filter(r => r.media_type === "movie" || r.media_type === "tv");
        const yearOf = r => parseInt((r.release_date || r.first_air_date || "").slice(0, 4), 10);
        const hit = list.find(r => it.year && Math.abs(yearOf(r) - it.year) <= 1)
          || list.find(r => [r.title, r.name, r.original_title, r.original_name].some(t => t && norm(t) === norm(it.title)))
          || (!it.year ? list[0] : null);
        if (hit) {
          entry = { key: `tmdb:${hit.media_type}:${hit.id}`, title: hit.title || hit.name, year: yearOf(hit) || "",
            type: hit.media_type, poster: hit.poster_path, service: "" };
          matched++;
        }
      } catch (e) { /* kept as a plain entry */ }
    }
    if (!inWatchlist(entry.key)) {
      state.watchlist.push(Object.assign({ seen: it.seen, addedAt: Date.now() }, entry));
      added++;
    }
    done++;
    status.textContent = `Import : ${done}/${list.length} titres...`;
  };
  // Three lookups at a time.
  const queue = list.slice();
  await Promise.all([0, 1, 2].map(async () => { while (queue.length) await one(queue.shift()); }));
  save();
  status.textContent = `Import terminé : ${added} titre${added > 1 ? "s" : ""} ajouté${added > 1 ? "s" : ""} à ta liste` +
    (tmdbReady() ? ` (${matched} reconnus avec affiche).` : ".");
  state.lastCheck = 0;
  checkUpdates();
}

$("#importOther").addEventListener("change", e => {
  const file = e.target.files[0];
  e.target.value = "";
  if (file) importOther(file);
});
$("#randomBtn").addEventListener("click", toggleRandom);
$("#filterBtn").addEventListener("click", () => { $("#filterBox").hidden = !$("#filterBox").hidden; });
renderFilters();

// ---------- Sync between devices ----------
// Optional: the data goes through a StreamHub sync server the user runs themselves
// (sync_server.py of the personal edition), under a secret code shared by the devices.
// No address, no sync: nothing leaves the device.
// Each list entry carries "u" (last change time), deletions leave a tombstone in
// state.removed, and settings and history carry a group time in state.u: two devices
// that changed different things both keep their changes.

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function syncCfg() {
  try { return Object.assign({ url: SYNC_DEFAULT_URL, code: "", v: 0, at: 0 }, JSON.parse(localStorage.getItem(SYNC_KEY) || "{}")); }
  catch (e) { return { url: SYNC_DEFAULT_URL, code: "", v: 0, at: 0 }; }
}
function saveSyncCfg(cfg) {
  try { localStorage.setItem(SYNC_KEY, JSON.stringify(cfg)); } catch (e) { /* private mode */ }
}

// ---- Change times, worked out by comparing with the previous save ----

function snapOf(st) {
  const strip = o => { const { u, ...rest } = o; return JSON.stringify(rest); };
  const snap = { items: {}, reading: {}, settings: "", history: JSON.stringify(st.history || []) };
  for (const i of st.watchlist || []) snap.items[i.key] = strip(i);
  for (const r of Object.values(st.reading || {})) snap.reading[r.id] = strip(r);
  snap.settings = JSON.stringify(SETTINGS_FIELDS.map(f => st[f]));
  return snap;
}


function stamp() {
  const now = Date.now();
  const snap = snapOf(state);
  const prev = stampSnap;
  state.removed = state.removed || {};
  state.u = state.u || {};
  for (const i of state.watchlist) if (prev.items[i.key] !== snap.items[i.key]) i.u = now;
  for (const r of Object.values(state.reading || {})) if (prev.reading[r.id] !== snap.reading[r.id]) r.u = now;
  for (const k of Object.keys(prev.items)) if (!(k in snap.items)) state.removed[k] = now;
  for (const k of Object.keys(prev.reading)) if (!(k in snap.reading)) state.removed["r:" + k] = now;
  if (prev.settings !== snap.settings) state.u.settings = now;
  if (prev.history !== snap.history) state.u.history = now;
  stampSnap = snap;
}

function mergeStates(a, b) {
  const out = Object.assign({}, a);
  const removed = Object.assign({}, b.removed || {});
  for (const [k, t] of Object.entries(a.removed || {})) removed[k] = Math.max(t, removed[k] || 0);
  // Tombstones are kept 90 days.
  for (const [k, t] of Object.entries(removed)) if (Date.now() - t > 90 * DAY) delete removed[k];
  out.removed = removed;

  const newer = (x, y) => !x ? y : !y ? x : (y.u || 0) > (x.u || 0) ? y : x;
  const items = new Map((a.watchlist || []).map(i => [i.key, i]));
  for (const i of b.watchlist || []) items.set(i.key, newer(items.get(i.key), i));
  out.watchlist = [...items.values()].filter(i => !((removed[i.key] || 0) > (i.u || 0)))
    .sort((x, y) => (y.addedAt || 0) - (x.addedAt || 0));

  const reading = Object.assign({}, a.reading || {});
  for (const r of Object.values(b.reading || {})) reading[r.id] = newer(reading[r.id], r);
  for (const r of Object.values(reading)) if ((removed["r:" + r.id] || 0) > (r.u || 0)) delete reading[r.id];
  out.reading = reading;

  const au = a.u || {}, bu = b.u || {};
  if ((bu.settings || 0) > (au.settings || 0)) for (const f of SETTINGS_FIELDS) if (f in b) out[f] = b[f];
  if ((bu.history || 0) > (au.history || 0)) out.history = b.history || [];
  // Same time (two devices linked for the first time): both histories, this device's first.
  else if ((bu.history || 0) === (au.history || 0)) {
    const seen = new Set();
    out.history = (a.history || []).concat(b.history || []).filter(h => !seen.has(h.toLowerCase()) && seen.add(h.toLowerCase())).slice(0, HISTORY_MAX);
  }
  out.u = { settings: Math.max(au.settings || 0, bu.settings || 0), history: Math.max(au.history || 0, bu.history || 0) };
  out.lastCheck = Math.max(a.lastCheck || 0, b.lastCheck || 0);
  return out;
}

// What goes to the server: everything except the TMDB key, which stays on each device.
function uploadable(st) {
  const { tmdbKey, ...rest } = st;
  return rest;
}

function applyState(next) {
  state = Object.assign(defaultState(), next);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  stampSnap = snapOf(state);
  const active = document.querySelector(".view.active").id.replace("view-", "");
  if (active === "settings") renderSettings();
  refresh();
  renderHistory();
  renderFilters();
  updateBadges();
}

// ---- Talking to the server ----

async function syncFetch(cfg, method, body) {
  const res = await fetch(cfg.url.replace(/\/+$/, "") + "/state", {
    method, cache: "no-store",
    headers: { Authorization: "Bearer " + cfg.code, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 409) return { conflict: true };
  if (!res.ok) throw new Error(res.status === 401 ? "Code de synchro refusé" : "Serveur de synchro : erreur " + res.status);
  return res.json();
}

let syncRunning = null;
let syncQueued = false;
let syncError = "";

function syncNow() {
  const cfg = syncCfg();
  if (!cfg.code || !cfg.url) return Promise.resolve();
  if (syncRunning) { syncQueued = true; return syncRunning; }
  syncRunning = (async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const remote = await syncFetch(cfg, "GET");
      // Another device wrote since our last sync: merge its changes into ours.
      if (remote.state && remote.v !== cfg.v) applyState(mergeStates(state, remote.state));
      const mine = uploadable(state);
      if (remote.state && JSON.stringify(remote.state) === JSON.stringify(mine)) { cfg.v = remote.v; break; }
      const put = await syncFetch(cfg, "PUT", { base: remote.v, state: mine });
      if (put.conflict) continue; // written in between: read again and merge
      cfg.v = put.v;
      break;
    }
    cfg.at = Date.now();
    syncError = "";
    saveSyncCfg(Object.assign(syncCfg(), { v: cfg.v, at: cfg.at }));
  })().catch(err => { syncError = err.message || "Serveur injoignable"; })
    .finally(() => {
      syncRunning = null;
      renderSyncStatus();
      if (syncQueued) { syncQueued = false; syncNow(); }
    });
  return syncRunning;
}

function scheduleSync() {
  if (!syncCfg().code || !syncCfg().url) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 2500);
}

// ---- Settings section ----

function newSyncCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const chars = [...bytes].map(b => CODE_CHARS[b % CODE_CHARS.length]).join("");
  return chars.match(/.{4}/g).join("-");
}

function cleanCode(raw) {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.length === 20 ? s.match(/.{4}/g).join("-") : null;
}

function renderSyncStatus() {
  const box = $("#syncStatus");
  if (!box) return;
  const cfg = syncCfg();
  if (!cfg.code) { box.textContent = ""; return; }
  box.className = "hint" + (syncError ? " sync-err" : "");
  box.textContent = syncRunning ? "Synchronisation..."
    : syncError ? "⚠ " + syncError
    : cfg.at ? "✓ Synchronisé à " + new Date(cfg.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "Pas encore synchronisé";
}

function renderSync() {
  const box = $("#syncBox");
  const cfg = syncCfg();
  const urlInput = el("input", { type: "url", value: cfg.url, placeholder: "https://mon-serveur/streamhub-sync" });
  const saveUrl = el("button", { class: "btn ghost", onclick: () => {
    const url = urlInput.value.trim();
    if (url && !/^https:\/\//.test(url)) { toast("L'adresse doit commencer par https://"); return; }
    saveSyncCfg(Object.assign(syncCfg(), { url, v: 0 }));
    renderSync();
    toast(url ? "Serveur enregistré" : "Synchro coupée");
  } }, "Enregistrer");
  const advanced = el("details", { class: "sync-adv" }, [el("summary", {}, "Adresse du serveur"),
    el("div", { class: "searchbar" }, [urlInput, saveUrl])]);

  // No server yet: only the address field.
  if (!cfg.url) {
    box.replaceChildren(el("div", { class: "searchbar" }, [urlInput, saveUrl]));
    return;
  }

  if (!cfg.code) {
    const input = el("input", { placeholder: "Code de l'autre appareil (XXXX-XXXX-XXXX-XXXX-XXXX)", autocomplete: "off", autocapitalize: "characters" });
    box.replaceChildren(
      el("button", { class: "btn", onclick: () => {
        saveSyncCfg(Object.assign(syncCfg(), { code: newSyncCode(), v: 0, at: 0 }));
        renderSync();
        syncNow();
        toast("Code créé : entre-le sur ton autre appareil");
      } }, "Créer un code (premier appareil)"),
      el("p", { class: "hint" }, "ou, si tu as déjà un code sur l'autre appareil :"),
      el("div", { class: "searchbar" }, [input, el("button", { class: "btn ghost", onclick: () => {
        const code = cleanCode(input.value);
        if (!code) { toast("Le code fait 20 caractères (5 groupes de 4)"); return; }
        saveSyncCfg(Object.assign(syncCfg(), { code, v: 0, at: 0 }));
        renderSync();
        // v = 0: the data already on the server is merged with this device's data.
        syncNow().then(() => toast(syncError ? syncError : "Appareil relié ✓"));
      } }, "Relier")]),
      advanced,
    );
    return;
  }

  const codeEl = el("code", { class: "sync-code" }, "••••-••••-••••-••••-" + cfg.code.slice(-4));
  box.replaceChildren(
    el("div", { class: "row wrap center" }, [
      el("span", {}, "Code : "), codeEl,
      el("button", { class: "btn mini", onclick: e => {
        const shown = codeEl.textContent === cfg.code;
        codeEl.textContent = shown ? "••••-••••-••••-••••-" + cfg.code.slice(-4) : cfg.code;
        e.currentTarget.textContent = shown ? "Afficher" : "Masquer";
      } }, "Afficher"),
      el("button", { class: "btn mini", onclick: async () => {
        try { await navigator.clipboard.writeText(cfg.code); toast("Code copié"); } catch (e) { toast(cfg.code); }
      } }, "Copier"),
    ]),
    el("p", { id: "syncStatus", class: "hint" }),
    el("div", { class: "row wrap center" }, [
      el("button", { class: "btn", onclick: () => { syncNow(); renderSyncStatus(); } }, "Synchroniser maintenant"),
      el("button", { class: "btn ghost", onclick: () => {
        if (!confirm("Arrêter la synchro sur cet appareil ? Tes données restent ici et sur le serveur.")) return;
        saveSyncCfg(Object.assign(syncCfg(), { code: "", v: 0, at: 0 }));
        renderSync();
      } }, "Arrêter la synchro"),
    ]),
    el("p", { class: "hint" }, "Sur l'autre appareil : Réglages > Synchro, colle ce code puis « Relier ». Garde ce code pour toi : il donne accès à ta liste."),
    advanced,
  );
  renderSyncStatus();
}

setTimeout(syncNow, 1500);
setInterval(syncNow, 60000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncNow(); });

// ---------- Install (PWA) ----------

$("#appVersion").textContent = (native && native.version ? native.version() : "") || APP_VERSION;

// Already an app inside the APK: no install button at all.
if (native || desktop) $("#installBtn").remove();

let installPrompt = null;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  installPrompt = e;
  if ($("#installBtn")) $("#installBtn").hidden = false;
});
$("#installBtn")?.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $("#installBtn").hidden = true;
});

if ("serviceWorker" in navigator && !native && !desktop) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

renderHome();
