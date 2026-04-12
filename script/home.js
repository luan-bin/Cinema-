/* ══════════════════════════════════════════════
   ECLIPSE CINEMA — home.js  (FIXED)
   Trang chủ: hero carousel, các section phim, ticker
   Phụ thuộc: config.js → api.js → auth.js

   CHANGES:
   [Fix #1] Movie cards hiện nút bookmark phản chiếu trạng thái WL thực tế
   [Fix #4] Nút toggle bị disable trong 200ms để tránh double-click
   [Fix #2] Storage tự động dùng user-key (xử lý ở config.js)
══════════════════════════════════════════════ */

// ─── Alias ngắn ───────────────────────────────
const tmdb     = tmdbFetch;
const poster   = posterUrl;
const backdrop = backdropUrl;
const year     = releaseYear;

/* ──────────────────────────────────────────────
   STATE
────────────────────────────────────────────── */
const state = {
  heroMovies: [],
  heroIndex:  0,
  heroTimer:  null,
  watchlist:  Storage.get("cineverse_watchlist"),
  favorites:  Storage.get("cineverse_favorites"),
};

/* ══════════════════════════════════════════════
   [FIX #1] INJECT CSS cho card bookmark button
   Thêm vào <head> một lần duy nhất khi init
══════════════════════════════════════════════ */
function injectCardStyles() {
  if (document.getElementById("eclipse-card-styles")) return;
  const style = document.createElement("style");
  style.id = "eclipse-card-styles";
  style.textContent = `
    /* ── Bookmark button trên mỗi movie card ── */
    .card-wl-btn {
      position: absolute;
      top: 8px; right: 8px;
      width: 30px; height: 30px;
      border-radius: 50%;
      border: none;
      background: rgba(0,0,0,0.72);
      backdrop-filter: blur(6px);
      color: #888;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px;
      transition: opacity 0.2s ease, transform 0.2s ease, color 0.2s ease, background 0.2s ease;
      z-index: 3;
      opacity: 0;          /* ẩn mặc định, hiện khi hover card */
    }
    .movie-card:hover .card-wl-btn { opacity: 1; }
    .card-wl-btn.active            { color: #e50914; opacity: 1; }  /* đã lưu → luôn hiện, đỏ */
    .card-wl-btn:hover:not(:disabled) { transform: scale(1.15); background: rgba(0,0,0,0.9); }
    .card-wl-btn:disabled          { cursor: not-allowed; opacity: 0.4 !important; }

    /* ── Hero "Xem Sau" active state ── */
    .hero-actions .btn-secondary.wl-active {
      background: rgba(229,9,20,0.25);
      border-color: #e50914;
      color: #e50914;
    }
    .hero-actions .btn-secondary.wl-active i { color: #e50914; }
  `;
  document.head.appendChild(style);
}

/* ══════════════════════════════════════════════
   NAVBAR
══════════════════════════════════════════════ */

/**
 * Khởi tạo navbar: scroll effect, hamburger menu, user dropdown
 */
function initNavbar() {
  const navbar    = document.getElementById("navbar");
  const hamburger = document.getElementById("hamburger");
  const navLinks  = document.getElementById("navLinks");
  const avatarBtn = document.getElementById("userAvatarBtn");
  const userDD    = document.getElementById("userDropdown");
  if (!navbar) return;

  window.addEventListener("scroll", () =>
    navbar.classList.toggle("scrolled", window.scrollY > 60)
  );

  hamburger?.addEventListener("click", () => {
    navLinks.classList.toggle("open");
    const open = navLinks.classList.contains("open");
    hamburger.querySelectorAll("span").forEach((s, i) => {
      s.style.transform = open
        ? ["translateY(7px) rotate(45deg)", "", "translateY(-7px) rotate(-45deg)"][i] : "";
      if (i === 1) s.style.opacity = open ? "0" : "";
    });
  });

  avatarBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    userDD.classList.toggle("open");
  });

  document.querySelectorAll(".dropdown-toggle").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        btn.closest(".dropdown")?.classList.toggle("open");
      }
    });
  });

  document.addEventListener("click", () => {
    userDD?.classList.remove("open");
    document.getElementById("searchResults")?.classList.remove("open");
  });

  document.querySelectorAll(".nav-link[href^='#']").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelector(link.getAttribute("href"))?.scrollIntoView({ behavior: "smooth" });
      navLinks.classList.remove("open");
      document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });
}

/* ══════════════════════════════════════════════
   AUTH NAVBAR
══════════════════════════════════════════════ */

/**
 * Khởi tạo navbar cho user đã đăng nhập: hiển thị avatar, tên, logout
 * Nếu chưa đăng nhập, hiển thị link đăng nhập/đăng ký
 */
function initAuthNavbar() {
  if (!window.CinemaAuth) return;
  const session = CinemaAuth.getSession();

  if (session && CinemaAuth.isLoggedIn()) {
    const { firstName, lastName, email } = session.user;
    const initials = `${firstName[0]}${lastName[0]}`.toUpperCase();

    document.getElementById("userAvatarBtn").innerHTML = `
      <div style="width:100%;height:100%;background:var(--red);display:grid;place-items:center;
        font-family:var(--font-cond);font-size:13px;font-weight:700;color:#fff;letter-spacing:1px">
        ${initials}
      </div>`;
    document.querySelector(".user-name").textContent  = `${firstName} ${lastName}`;
    document.querySelector(".user-email").textContent = email;

    document.querySelector(".logout-link")?.addEventListener("click", (e) => {
      e.preventDefault();
      CinemaAuth.logout();
      showToast("Đã đăng xuất. Hẹn gặp lại! 👋");
      setTimeout(() => (window.location.href = "login.html"), 1200);
    });
  } else {
    const list = document.querySelector(".user-menu-list");
    if (list) {
      list.innerHTML = `
        <li><a href="login.html" style="color:var(--red)!important"><i class="fas fa-sign-in-alt"></i> Đăng Nhập</a></li>
        <li><a href="login.html"><i class="fas fa-user-plus"></i> Đăng Ký</a></li>`;
    }
  }
}

/* ══════════════════════════════════════════════
   SEARCH
══════════════════════════════════════════════ */

/**
 * Khởi tạo search box: toggle, input handler, debounce search
 */
function initSearch() {
  const btn     = document.getElementById("searchBtn");
  const input   = document.getElementById("searchInput");
  const results = document.getElementById("searchResults");
  let timer;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    input.classList.toggle("open");
    if (input.classList.contains("open")) input.focus();
  });

  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => doSearch(input.value.trim()), 400);
  });

  input.addEventListener("click",   (e) => e.stopPropagation());
  results.addEventListener("click", (e) => e.stopPropagation());
}

async function doSearch(query) {
  const results = document.getElementById("searchResults");
  if (!query) { results.classList.remove("open"); return; }

  results.innerHTML = `<div style="padding:14px;color:var(--grey);font-size:13px;text-align:center">Đang tìm...</div>`;
  results.classList.add("open");

  const data = await tmdb("/search/movie", { query });
  if (!data?.results?.length) {
    results.innerHTML = `<div style="padding:14px;color:var(--grey);font-size:13px;text-align:center">Không tìm thấy kết quả</div>`;
    return;
  }

  results.innerHTML = data.results.slice(0, 7).map((m) => `
    <div class="search-result-item" onclick="location.href='detail.html?id=${m.id}'">
      <img src="${poster(m.poster_path, "w92")}" alt="${m.title}" />
      <div class="search-result-info">
        <p>${m.title}</p>
        <span>${year(m.release_date)} &nbsp;⭐ ${m.vote_average.toFixed(1)}</span>
      </div>
    </div>`).join("");
}

/* ══════════════════════════════════════════════
   GENRE DROPDOWN
══════════════════════════════════════════════ */
async function loadGenres() {
  const genreContainer = document.getElementById("genreList");
  if (!genreContainer) return;

  const data = await tmdb("/genre/movie/list");
  if (!data) return;

  genreContainer.innerHTML = data.genres.map((g) =>
    `<a href="#" class="genre-item" onclick="filterByGenre(${g.id},'${g.name}');return false">${g.name}</a>`
  ).join("");
}

async function filterByGenre(id, name) {
  showToast(`🎬 Đang lọc: ${name}`);
  const data = await tmdb("/discover/movie", { with_genres: id, sort_by: "popularity.desc" });
  if (data) renderMovieCards(document.getElementById("popularGrid"), data.results.slice(0, 12));
}

/* ══════════════════════════════════════════════
   HERO CAROUSEL
   [FIX #1] Nút "Xem Sau" có class wl-active nếu phim đã trong WL
══════════════════════════════════════════════ */
async function loadHero() {
  const data = await tmdb("/trending/movie/week");
  if (!data) return;

  state.heroMovies = data.results.filter((m) => m.backdrop_path).slice(0, 8);
  renderHeroSlides();
  startHeroAutoplay();
}

function renderHeroSlides() {
  const carousel   = document.getElementById("heroCarousel");
  const indicators = document.getElementById("heroIndicators");

  carousel.innerHTML = state.heroMovies.map((m, i) => {
    // [FIX #1] Kiểm tra watchlist để đặt class active ngay khi render
    const inWL = Storage.has("cineverse_watchlist", m.id);

    return `
    <div class="hero-slide ${i === 0 ? "active" : ""}" data-index="${i}">
      <div class="hero-bg">
        <img src="${backdrop(m.backdrop_path)}" alt="${m.title}"
          loading="${i === 0 ? "eager" : "lazy"}" />
      </div>
      <div class="hero-content">
        <div class="hero-badges">
          <span class="hero-badge">Trending</span>
          <span class="hero-badge outline">${year(m.release_date)}</span>
          <span class="hero-rating">⭐ ${m.vote_average.toFixed(1)}</span>
        </div>
        <h1 class="hero-title">${m.title}</h1>
        <div class="hero-meta">
          <span><i class="fas fa-calendar"></i> ${formatDate(m.release_date)}</span>
          <span><i class="fas fa-fire"></i> Phổ biến</span>
          <span><i class="fas fa-language"></i> ${m.original_language.toUpperCase()}</span>
        </div>
        <p class="hero-overview">${m.overview || "Không có mô tả."}</p>
        <div class="hero-actions">
          <button class="btn-primary" onclick="location.href='detail.html?id=${m.id}'">
            <i class="fas fa-info-circle"></i> Xem Chi Tiết
          </button>
          <!-- [FIX #1] data-movieid để toggleWatchlist tìm và cập nhật nút -->
          <button class="btn-secondary ${inWL ? "wl-active" : ""}"
            data-hero-wl="${m.id}"
            title="${inWL ? "Bỏ xem sau" : "Xem sau"}"
            onclick="toggleWatchlist(${m.id},'${escapeTitle(m.title)}')">
            <i class="fas fa-bookmark"></i> ${inWL ? "Đã Lưu" : "Xem Sau"}
          </button>
        </div>
      </div>
    </div>`;
  }).join("");

  indicators.innerHTML = state.heroMovies.map((_, i) =>
    `<div class="hero-dot ${i === 0 ? "active" : ""}" onclick="goToSlide(${i})"></div>`
  ).join("");

  document.getElementById("heroPrev").onclick = () =>
    goToSlide((state.heroIndex - 1 + state.heroMovies.length) % state.heroMovies.length);
  document.getElementById("heroNext").onclick = () =>
    goToSlide((state.heroIndex + 1) % state.heroMovies.length);
}

function goToSlide(n) {
  document.querySelectorAll(".hero-slide").forEach((s) => s.classList.remove("active"));
  document.querySelectorAll(".hero-dot").forEach((d)   => d.classList.remove("active"));
  state.heroIndex = n;
  document.querySelectorAll(".hero-slide")[n]?.classList.add("active");
  document.querySelectorAll(".hero-dot")[n]?.classList.add("active");
  clearTimeout(state.heroTimer);
  startHeroAutoplay();
}

function startHeroAutoplay() {
  state.heroTimer = setTimeout(
    () => goToSlide((state.heroIndex + 1) % state.heroMovies.length),
    6000
  );
}

/* ══════════════════════════════════════════════
   TRENDING TICKER
══════════════════════════════════════════════ */
async function loadTicker() {
  const data = await tmdb("/movie/now_playing", { region: ECLIPSE_CONFIG.REGION });
  if (!data) return;

  const items = data.results.map((m) =>
    `<div class="ticker-item" onclick="location.href='detail.html?id=${m.id}'" style="cursor:pointer">
       <span>${m.vote_average.toFixed(1)} ⭐</span> ${m.title}
     </div>`
  ).join("");

  document.getElementById("tickerTrack").innerHTML = items + items;
}

/* ══════════════════════════════════════════════
   SECTIONS
══════════════════════════════════════════════ */
async function loadNowPlaying() {
  const data = await tmdb("/movie/now_playing", { region: ECLIPSE_CONFIG.REGION });
  if (data) renderMovieCards(document.getElementById("nowPlayingRow"), data.results.slice(0, 10));
}

async function loadPopular(type = "all") {
  const endpointMap = {
    day:  "/trending/movie/day",
    week: "/trending/movie/week",
    all:  "/movie/popular",
  };
  const data = await tmdb(endpointMap[type] || endpointMap.all);
  if (data) renderMovieCards(document.getElementById("popularGrid"), data.results.slice(0, 12));
}

async function loadUpcoming() {
  const data = await tmdb("/movie/upcoming", { region: ECLIPSE_CONFIG.REGION });
  if (!data) return;

  document.getElementById("upcomingList").innerHTML = data.results.slice(0, 8).map((m) => `
    <div class="upcoming-card" onclick="location.href='detail.html?id=${m.id}'">
      <img src="${poster(m.poster_path, "w92")}" alt="${m.title}" />
      <div class="upcoming-info">
        <p class="upcoming-title">${m.title}</p>
        <p class="upcoming-date"><i class="fas fa-calendar-alt"></i> ${formatDate(m.release_date)}</p>
        <p class="upcoming-overview">${m.overview || "Chưa có mô tả."}</p>
      </div>
    </div>`).join("");
}

async function loadTopRated() {
  const data = await tmdb("/movie/top_rated");
  if (!data) return;

  document.getElementById("topRatedGrid").innerHTML = data.results.slice(0, 10).map((m, i) => `
    <div class="top-rated-card" onclick="location.href='detail.html?id=${m.id}'">
      <img src="${backdrop(m.backdrop_path) || poster(m.poster_path)}" alt="${m.title}" />
      <div class="top-rated-overlay">
        <span class="top-rated-rank">${String(i + 1).padStart(2, "0")}</span>
        <p class="top-rated-title">${m.title}</p>
        <p class="top-rated-rating">⭐ ${m.vote_average.toFixed(1)} (${m.vote_count.toLocaleString()} đánh giá)</p>
      </div>
    </div>`).join("");
}

document.getElementById("popularFilter")?.addEventListener("click", (e) => {
  const tab = e.target.closest(".filter-tab");
  if (!tab) return;
  document.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  loadPopular(tab.dataset.filter);
});

/* ══════════════════════════════════════════════
   RENDER HELPERS
   Mỗi card có nút bookmark nhỏ ở góc, phản chiếu trạng thái WL
══════════════════════════════════════════════ */
function renderMovieCards(container, movies) {
  if (!container) return;

  container.innerHTML = movies.map((m) => {
    // Đọc trạng thái watchlist hiện tại
    const inWL = Storage.has("cineverse_watchlist", m.id);

    return `
    <div class="movie-card" onclick="location.href='detail.html?id=${m.id}'">
      <div class="movie-poster">
        <img src="${poster(m.poster_path)}" alt="${m.title}" loading="lazy"
          onerror="this.src='https://via.placeholder.com/342x513/161616/888?text=N%2FA'" />
        <div class="movie-poster-overlay">
          <div class="play-btn"><i class="fas fa-play"></i></div>
        </div>
        <div class="movie-rating-badge">⭐ ${m.vote_average.toFixed(1)}</div>

        <!-- Bookmark button: active (đỏ) nếu đã trong watchlist -->
        <button
          class="card-wl-btn ${inWL ? "active" : ""}"
          title="${inWL ? "Bỏ xem sau" : "Xem sau"}"
          onclick="event.stopPropagation(); toggleWatchlistCard(${m.id}, '${escapeTitle(m.title)}', this)">
          <i class="fas fa-bookmark"></i>
        </button>
      </div>
      <div class="movie-info">
        <p class="movie-title">${m.title}</p>
        <div class="movie-meta">
          <span class="movie-year">${year(m.release_date)}</span>
        </div>
      </div>
    </div>`;
  }).join("");
}

function showSkeletons(containerId, count = 6) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = Array(count).fill(`<div class="skeleton skeleton-card"></div>`).join("");
}

/* ══════════════════════════════════════════════
   WATCHLIST & FAVORITES
══════════════════════════════════════════════ */

/**
 * Toggle watchlist từ nút bookmark trên movie card (grid).
 */
function toggleWatchlistCard(id, title, btn) {
  if (btn.disabled) return;

  // Disable ngay lập tức
  btn.disabled = true;

  setTimeout(() => {
    const added = Storage.toggle("cineverse_watchlist", id);
    state.watchlist = Storage.get("cineverse_watchlist");

    // Cập nhật nút được bấm
    btn.classList.toggle("active", added);
    btn.title = added ? "Bỏ xem sau" : "Xem sau";
    btn.disabled = false;

    // Đồng bộ nút hero (nếu phim này đang hiển thị trên hero)
    _syncHeroWatchlistBtn(id, added);

    showToast(added ? `🔖 Đã thêm "${title}" vào xem sau` : `✖ Đã xóa "${title}" khỏi xem sau`);
  }, 200);
}

/** [FIX #1] Đồng bộ trạng thái nút hero "Xem Sau" cho một movie ID */
function _syncHeroWatchlistBtn(id, isAdded) {
  const btn = document.querySelector(`[data-hero-wl="${id}"]`);
  if (!btn) return;
  btn.classList.toggle("wl-active", isAdded);
  btn.title     = isAdded ? "Bỏ xem sau" : "Xem sau";
  btn.innerHTML = `<i class="fas fa-bookmark"></i> ${isAdded ? "Đã Lưu" : "Xem Sau"}`;
}

function toggleFavorite(id, title) {
  const added = Storage.toggle("cineverse_favorites", id);
  state.favorites = Storage.get("cineverse_favorites");
  showToast(added ? `❤️ Đã thêm "${title}" vào yêu thích` : `✖ Đã xóa "${title}" khỏi yêu thích`);
}

/* ══════════════════════════════════════════════
   SCROLL ANIMATIONS
══════════════════════════════════════════════ */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.style.opacity   = "1";
        e.target.style.transform = "translateY(0)";
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });

  document.querySelectorAll(".section-header, .promo-banner, .ticker-wrap").forEach((el) => {
    Object.assign(el.style, { opacity: "0", transform: "translateY(24px)", transition: "opacity 0.6s ease, transform 0.6s ease" });
    observer.observe(el);
  });
}

function observeCards(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  Array.from(container.children).forEach((card, i) => {
    Object.assign(card.style, {
      opacity:    "0",
      transform:  "translateY(20px)",
      transition: `opacity 0.4s ease ${i * 0.06}s, transform 0.4s ease ${i * 0.06}s`,
    });
    setTimeout(() => {
      card.style.opacity   = "1";
      card.style.transform = "translateY(0)";
    }, 100 + i * 60);
  });
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
async function init() {
  injectCardStyles(); // [FIX #1] Inject CSS cho card bookmark btn

  initNavbar();
  initAuthNavbar();
  initSearch();
  initScrollAnimations();

  showSkeletons("nowPlayingRow", 8);
  showSkeletons("popularGrid", 12);
  showSkeletons("topRatedGrid", 10);

  await Promise.all([
    loadGenres(),
    loadHero(),
    loadTicker(),
    loadNowPlaying().then(()  => observeCards("nowPlayingRow")),
    loadPopular().then(()     => observeCards("popularGrid")),
    loadUpcoming().then(()    => observeCards("upcomingList")),
    loadTopRated().then(()    => observeCards("topRatedGrid")),
  ]);
}

document.addEventListener("DOMContentLoaded", init);
