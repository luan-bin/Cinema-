/* ══════════════════════════════════════════════
   ECLIPSE CINEMA — api.js
   TMDB API wrapper, tách riêng khỏi config.js
══════════════════════════════════════════════ */

async function tmdbFetch(endpoint, params = {}) {
  const url = new URL(`${ECLIPSE_CONFIG.BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", ECLIPSE_CONFIG.API_KEY);
  url.searchParams.set("language", ECLIPSE_CONFIG.LANG);
  Object.entries(params).forEach(([k, v]) => {
    if (v || v === 0 || v === false) url.searchParams.set(k, v);
  });

  if (!ECLIPSE_CONFIG.API_KEY || ECLIPSE_CONFIG.API_KEY.trim() === "") {
    console.error("[TMDB] missing API key");
    showToast?.("Vui lòng thiết lập TMDB API key trong config.js");
    return null;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.error(`[TMDB] ${endpoint}`, err);
    showToast?.(`Lỗi kết nối đến TMDB: ${err.message}`);
    return null;
  }
}

/* Helper API methods (tuỳ chọn) */
const EclipseApi = {
  fetchMovie: (id) => tmdbFetch(`/movie/${id}`),
  fetchGenreList: () => tmdbFetch(`/genre/movie/list`),
  searchMovie: (query, page = 1) => tmdbFetch(`/search/movie`, { query, page }),
  fetchNowPlaying: (region) => tmdbFetch(`/movie/now_playing`, { region }),
};
