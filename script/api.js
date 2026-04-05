/* ══════════════════════════════════════════════
   ECLIPSE CINEMA — api.js
   TMDB API wrapper — tách riêng khỏi config.js
   Phụ thuộc: config.js (load trước)
══════════════════════════════════════════════ */

/**
 * Gọi TMDB API với endpoint và params tùy chọn.
 * Tự động gắn api_key và language từ ECLIPSE_CONFIG.
 *
 * @param {string} endpoint  - Đường dẫn TMDB, vd: "/movie/popular"
 * @param {object} params    - Query params bổ sung, vd: { page: 2 }
 * @returns {Promise<object|null>} JSON response hoặc null nếu lỗi
 */
async function tmdbFetch(endpoint, params = {}) {
  // Kiểm tra API key trước khi gọi
  if (!ECLIPSE_CONFIG.API_KEY?.trim()) {
    console.error("[TMDB] Thiếu API key");
    showToast?.("Vui lòng thiết lập TMDB API");
    return null;
  }

  // Build URL với URLSearchParams
  const url = new URL(`${ECLIPSE_CONFIG.BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", ECLIPSE_CONFIG.API_KEY);
  url.searchParams.set("language", ECLIPSE_CONFIG.LANG);

  // Gắn các params bổ sung (bỏ qua giá trị null/undefined/chuỗi rỗng)
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== "") {
      url.searchParams.set(k, v);
    }
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.error(`[TMDB] Lỗi tại ${endpoint}:`, err);
    showToast?.(`Lỗi kết nối TMDB: ${err.message}`);
    return null;
  }
}

/* ──────────────────────────────────────────────
   SHORTHAND METHODS
   Các endpoint hay dùng, gọi nhanh hơn tmdbFetch
────────────────────────────────────────────── */
const EclipseApi = {
  /** Chi tiết một bộ phim theo ID */
  fetchMovie: (id) => tmdbFetch(`/movie/${id}`),

  /** Danh sách thể loại */
  fetchGenreList: () => tmdbFetch("/genre/movie/list"),

  /** Tìm kiếm phim theo từ khóa */
  searchMovie: (query, page = 1) => tmdbFetch("/search/movie", { query, page }),

  /** Phim đang chiếu (có thể lọc theo region) */
  fetchNowPlaying: (region) => tmdbFetch("/movie/now_playing", { region }),

  /** Discover phim với filters */
  discoverMovie: (params = {}) => tmdbFetch("/discover/movie", params),
};