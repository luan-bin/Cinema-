/* ══════════════════════════════════════════════
   ECLIPSE CINEMA — config.js
   Shared configuration — import vào mọi page
   Thứ tự load: config.js → api.js → auth.js → [page].js
══════════════════════════════════════════════ */

const ECLIPSE_CONFIG = {
  // ─── TMDB API ────────────────────────────────
  API_KEY:     "ef29fa7a978b4e6593665f37c7b9110c",
  BASE_URL:    "https://api.themoviedb.org/3",
  IMG_BASE:    "https://image.tmdb.org/t/p",
  LANG:        "vi-VN",
  REGION:      "VN",

  // ─── Kích thước ảnh (TMDB size tokens) ────────
  POSTER_SM:   "w185",
  POSTER_MD:   "w342",   // default cho card
  POSTER_LG:   "w500",
  BACKDROP_MD: "w780",
  BACKDROP_LG: "w1280",  // default cho hero/detail
  PROFILE_SM:  "w185",   // ảnh diễn viên

  // ─── Embed servers (stream phim) ──────────────
  // Thêm/bớt object trong mảng để quản lý tập trung
  SERVERS: [
    { name: "Server 1", icon: "fa-circle-play", url: (id) => `https://www.2embed.cc/embed/${id}` },
    { name: "Server 2", icon: "fa-circle-play", url: (id) => `https://vidsrc.to/embed/movie/${id}` },
    { name: "Server 3", icon: "fa-circle-play", url: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1` },
  ],

  // ─── App meta ──────────────────────────────────
  APP_NAME: "Eclipse Cinema",
  SITE_URL: "",  // Điền domain khi deploy, vd: "https://eclipse.cinema"
};

/* ──────────────────────────────────────────────
   IMAGE HELPERS
   Tạo full URL ảnh từ path trả về bởi TMDB
────────────────────────────────────────────── */

/** Base builder — dùng nội bộ */
const imgUrl = (path, size) =>
  path ? `${ECLIPSE_CONFIG.IMG_BASE}/${size}${path}` : null;

/** Poster phim — fallback placeholder nếu không có ảnh */
const posterUrl = (path, size = ECLIPSE_CONFIG.POSTER_MD) =>
  imgUrl(path, size) || "https://via.placeholder.com/342x513/161616/888?text=N%2FA";

/** Backdrop (ảnh ngang) — trả về chuỗi rỗng nếu không có */
const backdropUrl = (path, size = ECLIPSE_CONFIG.BACKDROP_LG) =>
  imgUrl(path, size) || "";

/** Ảnh profile diễn viên/crew */
const profileUrl = (path, size = ECLIPSE_CONFIG.PROFILE_SM) =>
  imgUrl(path, size) || "https://via.placeholder.com/185x278/161616/888?text=N%2FA";

/* ──────────────────────────────────────────────
   FORMAT HELPERS
   Chuyển đổi dữ liệu thô TMDB → chuỗi hiển thị
────────────────────────────────────────────── */

/** Lấy năm từ chuỗi ngày "YYYY-MM-DD" → "YYYY" */
const releaseYear = (dateStr) =>
  dateStr ? dateStr.slice(0, 4) : "N/A";

/** Format ngày theo locale Việt Nam */
const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch {
    return dateStr; // trả nguyên nếu parse lỗi
  }
};

/** Chuyển phút → "Xg Yp" (vd: 148 → "2g 28p") */
const formatRuntime = (minutes) => {
  if (!minutes) return "N/A";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}g ${m}p` : `${m} phút`;
};

/** Format số tiền USD → "$123.4M", "$1.23B" v.v. */
const formatMoney = (n) => {
  if (!n || n === 0) return "Chưa công bố";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
};

/** Chuyển điểm 0–10 → chuỗi sao ★★★☆☆ (5 sao) */
const starRating = (score) => {
  const n = Math.round(score / 2); // 10 điểm → 5 sao
  return "★".repeat(n) + "☆".repeat(5 - n);
};

/** Escape nháy đơn/kép trong title để nhúng vào HTML attribute */
const escapeTitle = (title) =>
  (title || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");

/** Escape HTML entities để tránh XSS */
const escapeHtml = (s) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** "X phút/giờ/ngày trước" từ timestamp (ms) */
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
    if (diff >= ms) return `${Math.floor(diff / ms)} ${label} trước`;
  }
  return "Vừa xong";
};

/* ──────────────────────────────────────────────
   TOAST NOTIFICATION
   Hiển thị thông báo góc dưới phải, tự ẩn sau 3s
   Yêu cầu: element #toast trong HTML
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
   LOCAL STORAGE HELPERS
   Quản lý Watchlist & Favorites dưới dạng mảng ID
   Keys: "cineverse_watchlist", "cineverse_favorites"
────────────────────────────────────────────── */
const Storage = {
  /** Đọc mảng từ localStorage (trả [] nếu chưa có) */
  get: (key) => JSON.parse(localStorage.getItem(key) || "[]"),

  /** Ghi mảng vào localStorage */
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),

  /**
   * Toggle một ID trong mảng
   * @returns {boolean} true = đã thêm | false = đã xóa
   */
  toggle: (key, id) => {
    const list = Storage.get(key);
    const idx  = list.indexOf(id);
    if (idx === -1) list.push(id);
    else list.splice(idx, 1);
    Storage.set(key, list);
    return idx === -1;
  },

  /** Kiểm tra ID có trong danh sách không */
  has: (key, id) => Storage.get(key).includes(id),
};