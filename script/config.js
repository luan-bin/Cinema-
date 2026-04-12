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
  POSTER_MD:   "w342",
  POSTER_LG:   "w500",
  BACKDROP_MD: "w780",
  BACKDROP_LG: "w1280",
  PROFILE_SM:  "w185",

  // ─── Embed servers ────────────────────────────
  SERVERS: [
    { name: "Server 1", icon: "fa-circle-play", url: (id) => `https://www.2embed.cc/embed/${id}` },
    { name: "Server 2", icon: "fa-circle-play", url: (id) => `https://vidsrc.to/embed/movie/${id}` },
    { name: "Server 3", icon: "fa-circle-play", url: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1` },
  ],

  APP_NAME: "Eclipse Cinema",
  SITE_URL: "",
};

/* ──────────────────────────────────────────────
   IMAGE HELPERS
────────────────────────────────────────────── */
const imgUrl     = (path, size) => path ? `${ECLIPSE_CONFIG.IMG_BASE}/${size}${path}` : null;
const posterUrl  = (path, size = ECLIPSE_CONFIG.POSTER_MD)   => imgUrl(path, size) || "https://via.placeholder.com/342x513/161616/888?text=N%2FA";
const backdropUrl= (path, size = ECLIPSE_CONFIG.BACKDROP_LG) => imgUrl(path, size) || "";
const profileUrl = (path, size = ECLIPSE_CONFIG.PROFILE_SM)  => imgUrl(path, size) || "https://via.placeholder.com/185x278/161616/888?text=N%2FA";

/* ──────────────────────────────────────────────
   FORMAT HELPERS
────────────────────────────────────────────── */
const releaseYear  = (dateStr) => dateStr ? dateStr.slice(0, 4) : "N/A";
const formatDate   = (dateStr) => {
  if (!dateStr) return "N/A";
  try { return new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  catch { return dateStr; }
};
const formatRuntime = (minutes) => {
  if (!minutes) return "N/A";
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? `${h}g ${m}p` : `${m} phút`;
};
const formatMoney = (n) => {
  if (!n || n === 0) return "Chưa công bố";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
};
const starRating  = (score) => { const n = Math.round(score / 2); return "★".repeat(n) + "☆".repeat(5 - n); };
const escapeTitle = (title) => (title || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
const escapeHtml  = (s) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const timeAgo     = (timestamp) => {
  const diff = Date.now() - timestamp;
  const periods = [
    [365*24*60*60*1000,"năm"],[30*24*60*60*1000,"tháng"],[7*24*60*60*1000,"tuần"],
    [24*60*60*1000,"ngày"],[60*60*1000,"giờ"],[60*1000,"phút"],
  ];
  for (const [ms, label] of periods) if (diff >= ms) return `${Math.floor(diff/ms)} ${label} trước`;
  return "Vừa xong";
};

/* ──────────────────────────────────────────────
   TOAST NOTIFICATION
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

/* ══════════════════════════════════════════════
   LOCAL STORAGE — USER-AWARE  (FIX #2)
   ─────────────────────────────────────────────
   Khi đã đăng nhập: key = "cineverse_watchlist_<userId>"
   Khi chưa đăng nhập: key = "cineverse_watchlist" (như cũ)
   → Mỗi tài khoản có danh sách riêng biệt.
   → Khi đăng nhập lần đầu, tự động nhập danh sách
     guest (nếu có) vào tài khoản.
══════════════════════════════════════════════ */
const Storage = {

  /**
   * Tạo key có namespace theo user ID.
   * @param {string} key  - Base key, vd "cineverse_watchlist"
   * @returns {string}    - Key thực tế sẽ dùng trong localStorage
   */
  _userKey(key) {
    try {
      const s = JSON.parse(localStorage.getItem("cinema_session") || "null");
      // Chỉ dùng user-key khi session còn hạn
      if (s?.user?.id && Date.now() < s.expiresAt) {
        return `${key}_${s.user.id}`;
      }
    } catch { /* parse lỗi → dùng key gốc */ }
    return key;
  },

  /** Đọc mảng (trả [] nếu chưa có hoặc lỗi) */
  get(key) {
    try { return JSON.parse(localStorage.getItem(this._userKey(key)) || "[]"); }
    catch { return []; }
  },

  /** Ghi mảng */
  set(key, val) {
    localStorage.setItem(this._userKey(key), JSON.stringify(val));
  },

  /**
   * Toggle ID trong mảng.
   * @returns {boolean} true = đã thêm | false = đã xóa
   */
  toggle(key, id) {
    const list = this.get(key);
    const idx  = list.indexOf(id);
    if (idx === -1) list.push(id);
    else list.splice(idx, 1);
    this.set(key, list);
    return idx === -1;
  },

  /** Kiểm tra ID có trong danh sách */
  has: (key, id) => Storage.get(key).includes(id),

  /**
   * Migrate guest data vào tài khoản sau khi đăng nhập.
   * Gọi một lần ngay sau CinemaAuth.login() thành công.
   * @param {string[]} baseKeys - Mảng base key cần migrate
   */
  migrateGuestData(baseKeys = ["cineverse_watchlist", "cineverse_favorites"]) {
    for (const key of baseKeys) {
      const guestData = JSON.parse(localStorage.getItem(key) || "[]");
      if (!guestData.length) continue;

      const userKey    = this._userKey(key);
      const userData   = JSON.parse(localStorage.getItem(userKey) || "[]");
      const merged     = [...new Set([...userData, ...guestData])]; // deduplicate
      localStorage.setItem(userKey, JSON.stringify(merged));
      localStorage.removeItem(key); // xóa data guest sau khi migrate
      console.log(`[Storage] Migrated ${guestData.length} items: ${key} → ${userKey}`);
    }
  },
};
