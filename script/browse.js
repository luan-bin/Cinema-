/* ══════════════════════════════════════════════
   ECLIPSE CINEMA — browse.js
   Trang khám phá: filter theo genre/year/sort, grid phim
   Phụ thuộc: config.js → api.js → auth.js
══════════════════════════════════════════════ */

// ─── Alias ngắn ───────────────────────────────
const tmdb     = tmdbFetch;
const poster   = posterUrl;
const year     = releaseYear;

/* ──────────────────────────────────────────────
   STATE
────────────────────────────────────────────── */
const browseState = {
  currentPage: 1,
  totalPages:  1,
  isLoading:   false,
  genres:      [], // Danh sách genres từ TMDB
  years:       [], // Danh sách năm từ 2024 về 1900
};

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  initBrowse();
});

async function initBrowse() {
  // Tải genres và years
  await loadGenres();
  loadYears();

  // Load phim mặc định (popular)
  await loadMovies();

  // Event listeners
  document.getElementById("applyFiltersBtn")?.addEventListener("click", applyFilters);
}

/* ══════════════════════════════════════════════
   LOAD GENRES & YEARS
══════════════════════════════════════════════ */
async function loadGenres() {
  const data = await EclipseApi.fetchGenreList();
  if (!data?.genres) return;

  browseState.genres = data.genres;
  const select = document.getElementById("genreSelect");
  select.innerHTML = '<option value="">Tất cả</option>' +
    data.genres.map(g => `<option value="${g.id}">${g.name}</option>`).join("");
}

function loadYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= 1900; y--) {
    years.push(y);
  }
  browseState.years = years;
  const select = document.getElementById("yearSelect");
  select.innerHTML = '<option value="">Tất cả</option>' +
    years.map(y => `<option value="${y}">${y}</option>`).join("");
}

/* ══════════════════════════════════════════════
   LOAD MOVIES
══════════════════════════════════════════════ */
async function loadMovies(page = 1) {
  if (browseState.isLoading) return;
  browseState.isLoading = true;

  const statusEl = document.getElementById("browseStatus");
  statusEl.textContent = "Đang tải...";

  const params = {
    page,
    sort_by: document.getElementById("sortSelect")?.value || "popularity.desc",
  };

  const genreId = document.getElementById("genreSelect")?.value;
  if (genreId) params.with_genres = genreId;

  const year = document.getElementById("yearSelect")?.value;
  if (year) params.primary_release_year = year;

  const data = await EclipseApi.discoverMovie(params);

  if (!data) {
    statusEl.textContent = "Lỗi tải dữ liệu. Vui lòng thử lại.";
    browseState.isLoading = false;
    return;
  }

  browseState.currentPage = data.page;
  browseState.totalPages  = data.total_pages;

  renderMovies(data.results);
  updateResultsInfo(data);

  statusEl.textContent = "";
  browseState.isLoading = false;
}

function applyFilters() {
  browseState.currentPage = 1;
  loadMovies(1);
}

/* ══════════════════════════════════════════════
   RENDER
══════════════════════════════════════════════ */
function renderMovies(movies) {
  const grid = document.getElementById("browseGrid");
  if (!grid) return;

  if (!movies?.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--grey)">Không tìm thấy phim nào.</div>';
    return;
  }

  grid.innerHTML = movies.map(m => `
    <div class="movie-card" onclick="location.href='detail.html?id=${m.id}'">
      <div class="movie-poster">
        <img src="${poster(m.poster_path)}" alt="${m.title}" loading="lazy"
          onerror="this.src='https://via.placeholder.com/342x513/161616/888?text=N%2FA'" />
        <div class="movie-poster-overlay">
          <div class="play-btn"><i class="fas fa-play"></i></div>
        </div>
        <div class="movie-rating-badge">⭐ ${m.vote_average.toFixed(1)}</div>
      </div>
      <div class="movie-info">
        <p class="movie-title">${m.title}</p>
        <div class="movie-meta">
          <span class="movie-year">${year(m.release_date)}</span>
        </div>
      </div>
    </div>`).join("");
}

function updateResultsInfo(data) {
  const titleEl  = document.getElementById("resultsTitle");
  const countEl  = document.getElementById("resultsCount");

  if (titleEl) {
    const genreId = document.getElementById("genreSelect")?.value;
    const yearVal = document.getElementById("yearSelect")?.value;
    let title = "Tất cả phim";

    if (genreId) {
      const genre = browseState.genres.find(g => g.id == genreId);
      title = genre ? genre.name : "Thể loại";
    }
    if (yearVal) title += ` (${yearVal})`;

    titleEl.textContent = title;
  }

  if (countEl) {
    countEl.textContent = `${data.total_results.toLocaleString()} phim`;
  }
}