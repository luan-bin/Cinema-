/* ══════════════════════════════════════════════
   ECLIPSE CINEMA — config.js
   Shared configuration — import vào mọi page
══════════════════════════════════════════════ */

const ECLIPSE_CONFIG = {
  // ─── TMDB ──────────────────────────────────
  API_KEY:     "ef29fa7a978b4e6593665f37c7b9110c",      // ← Thay bằng API key TMDB của bạn
  BASE_URL:    "https://api.themoviedb.org/3",
  IMG_BASE:    "https://image.tmdb.org/t/p",
  LANG:        "vi-VN",
  REGION:      "VN",

  // ─── Image sizes ───────────────────────────
  POSTER_SM:   "w185",
  POSTER_MD:   "w342",
  POSTER_LG:   "w500",
  BACKDROP_MD: "w780",
  BACKDROP_LG: "w1280",
  PROFILE_SM:  "w185",

  // ─── Embed servers ─────────────────────────
  // Thêm/bớt object trong mảng này để quản lý server tập trung
  SERVERS: [
    { name: "Server 1", icon: "fa-circle-play", url: (id) => `https://www.2embed.cc/embed/${id}` },
    { name: "Server 2", icon: "fa-circle-play", url: (id) => `https://vidsrc.to/embed/movie/${id}` },
    { name: "Server 3", icon: "fa-circle-play", url: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1` },
  ],

  // ─── App ───────────────────────────────────
  APP_NAME:    "Eclipse Cinema",
  SITE_URL:    "",   // ← Điền domain khi deploy, ví dụ: "https://eclipse.cinema"
};

/* ──────────────────────────────────────────────
   Image URL helpers
────────────────────────────────────────────── */
const imgUrl = (path, size) =>
  path ? `${ECLIPSE_CONFIG.IMG_BASE}/${size}${path}` : null;

const posterUrl = (path, size = ECLIPSE_CONFIG.POSTER_MD) =>
  imgUrl(path, size) || "https://via.placeholder.com/342x513/161616/888?text=N%2FA";

const backdropUrl = (path, size = ECLIPSE_CONFIG.BACKDROP_LG) =>
  imgUrl(path, size) || "";

const profileUrl = (path, size = ECLIPSE_CONFIG.PROFILE_SM) =>
  imgUrl(path, size) || "https://via.placeholder.com/185x278/161616/888?text=N%2FA";

/* ──────────────────────────────────────────────
   Formatting helpers
────────────────────────────────────────────── */
const releaseYear = (dateStr) =>
  dateStr ? dateStr.slice(0, 4) : "N/A";

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return dateStr; }
};

const formatRuntime = (minutes) => {
  if (!minutes) return "N/A";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}g ${m}p` : `${m} phút`;
};

const formatMoney = (n) => {
  if (!n || n === 0) return "Chưa công bố";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
};

const starRating = (score) => {
  const n = Math.round(score / 2);
  return "★".repeat(n) + "☆".repeat(5 - n);
};

const escapeTitle = (title) =>
  (title || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");

const escapeHtml = (s) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const timeAgo = (timestamp) => {
  const diff = Date.now() - timestamp;
  const periods = [
    [365 * 24 * 60 * 60 * 1000, "năm"],
    [30  * 24 * 60 * 60 * 1000, "tháng"],
    [7   * 24 * 60 * 60 * 1000, "tuần"],
    [     24 * 60 * 60 * 1000,  "ngày"],
    [          60 * 60 * 1000,  "giờ"],
    [               60 * 1000,  "phút"],
  ];
  for (const [ms, label] of periods) {
    if (diff >= ms) {
      const n = Math.floor(diff / ms);
      return `${n} ${label} trước`;
    }
  }
  return "Vừa xong";
};

/* ──────────────────────────────────────────────
   Toast — dùng chung (cần #toast element trong HTML)
────────────────────────────────────────────── */
let _toastTimer;
const showToast = (msg) => {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
};

/* ──────────────────────────────────────────────
   Watchlist / Favorites helpers
────────────────────────────────────────────── */
const Storage = {
  get:     (key)       => JSON.parse(localStorage.getItem(key) || "[]"),
  set:     (key, val)  => localStorage.setItem(key, JSON.stringify(val)),
  toggle:  (key, id)   => {
    const list = Storage.get(key);
    const idx  = list.indexOf(id);
    if (idx === -1) { list.push(id); }
    else            { list.splice(idx, 1); }
    Storage.set(key, list);
    return idx === -1; // true = added, false = removed
  },
  has: (key, id) => Storage.get(key).includes(id),
};