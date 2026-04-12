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
  hasMorePages: true, // Flag để kiểm tra còn trang không
};

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  initBrowse();
});

/**
 * Khởi tạo trang browse: tải genres, years, phim mặc định và thiết lập event listeners
 */
async function initBrowse() {
  // Tải genres và years
  await loadGenres();
  loadYears();

  // Load phim mặc định (popular)
  await loadMovies();

  // Event listeners
  document.getElementById("applyFiltersBtn")?.addEventListener("click", applyFilters);

  // Thêm infinite scroll
  window.addEventListener("scroll", handleScroll);
}

/* ══════════════════════════════════════════════
   LOAD GENRES & YEARS
══════════════════════════════════════════════ */
/**
 * Tải danh sách genres từ TMDB và populate vào select box
 */
async function loadGenres() {
  const data = await EclipseApi.fetchGenreList();
  if (!data?.genres) return;

  browseState.genres = data.genres;
  const select = document.getElementById("genreSelect");
  select.innerHTML = '<option value="">Tất cả</option>' +
    data.genres.map(g => `<option value="${g.id}">${g.name}</option>`).join("");
}

/**
 * Tạo danh sách năm từ năm hiện tại về 1900 và populate vào select box
 */
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
/**
 * Tải danh sách phim từ TMDB với các bộ lọc hiện tại
 * @param {number} page - Trang cần tải (mặc định 1)
 * @param {boolean} append - Có append vào grid hiện tại hay thay thế (mặc định false)
 */
async function loadMovies(page = 1, append = false) {
  if (browseState.isLoading) return;
  browseState.isLoading = true;

  const statusEl = document.getElementById("browseStatus");
  if (!append) {
    statusEl.textContent = "Đang tải...";
  } else {
    statusEl.textContent = "Đang tải thêm phim...";
  }

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
  browseState.hasMorePages = data.page < data.total_pages;

  renderMovies(data.results, append);
  if (!append) {
    updateResultsInfo(data);
  }

  statusEl.textContent = "";
  browseState.isLoading = false;
}

/**
 * Áp dụng bộ lọc mới và reset về trang 1
 */
function applyFilters() {
  browseState.currentPage = 1;
  browseState.hasMorePages = true;
  loadMovies(1, false);
}

/* ══════════════════════════════════════════════
   RENDER
══════════════════════════════════════════════ */

/**
 * Render danh sách phim vào grid
 * @param {Array} movies - Mảng các object phim từ TMDB
 * @param {boolean} append - Có append vào grid hay thay thế (mặc định false)
 */
function renderMovies(movies, append = false) {
  const grid = document.getElementById("browseGrid");
  if (!grid) return;

  if (!append) {
    if (!movies?.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--grey)">Không tìm thấy phim nào.</div>';
      return;
    }
    grid.innerHTML = "";
  }

  if (movies?.length) {
    const movieCards = movies.map(m => `
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

    if (append) {
      grid.insertAdjacentHTML("beforeend", movieCards);
    } else {
      grid.innerHTML = movieCards;
    }
  }
}

/**
 * Cập nhật thông tin kết quả tìm kiếm (tiêu đề và số lượng)
 * @param {Object} data - Response data từ TMDB
 */
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

/* ══════════════════════════════════════════════
   INFINITE SCROLL
══════════════════════════════════════════════ */

/**
 * Xử lý sự kiện scroll để tải thêm phim khi gần cuối trang
 * Trigger khi còn 200px đến bottom
 */
function handleScroll() {
  if (browseState.isLoading || !browseState.hasMorePages) return;

  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;

  // Load more khi cách bottom còn 200px
  if (documentHeight - (scrollTop + windowHeight) < 200) {
    loadMovies(browseState.currentPage + 1, true);
  }
}