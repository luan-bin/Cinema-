/* ══════════════════════════════════════════════
   ECLIPSE CINEMA — home.js
   Phụ thuộc: config.js (load trước trong HTML)
══════════════════════════════════════════════ */

// ─── STATE ────────────────────────────────────
const state = {
  heroMovies: [],
  heroIndex:  0,
  heroTimer:  null,
  watchlist:  Storage.get("cineverse_watchlist"),
  favorites:  Storage.get("cineverse_favorites"),
};

// Alias ngắn dùng trong file này
const tmdb     = tmdbFetch;
const poster   = posterUrl;
const backdrop = backdropUrl;
const year     = releaseYear;

// ══════════════════════════════════════════════
//  NAVBAR
// ══════════════════════════════════════════════
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

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("open");
      const open = navLinks.classList.contains("open");
      hamburger.querySelectorAll("span").forEach((s, i) => {
        if (open) {
          if (i === 0) s.style.transform = "translateY(7px) rotate(45deg)";
          if (i === 1) s.style.opacity   = "0";
          if (i === 2) s.style.transform = "translateY(-7px) rotate(-45deg)";
        } else { s.style.transform = ""; s.style.opacity = ""; }
      });
    });
  }

  if (avatarBtn && userDD) {
    avatarBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      userDD.classList.toggle("open");
    });
  }

  document.querySelectorAll(".dropdown-toggle").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        btn.closest(".dropdown")?.classList.toggle("open");
      }
    });
  });

  document.addEventListener("click", () => {
    if (userDD) userDD.classList.remove("open");
    document.getElementById("searchResults")?.classList.remove("open");
  });

  document.querySelectorAll(".nav-link[href^='#']").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute("href"));
      if (target) { target.scrollIntoView({ behavior: "smooth" }); navLinks.classList.remove("open"); }
      document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });
}

// ══════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════
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
    document.querySelector(".logout-link").addEventListener("click", (e) => {
      e.preventDefault();
      CinemaAuth.logout();
      showToast("Đã đăng xuất. Hẹn gặp lại! 👋");
      setTimeout(() => { window.location.href = "login.html"; }, 1200);
    });
  } else {
    const userNameEl = document.querySelector(".user-name");
    const userEmailEl = document.querySelector(".user-email");
    const userMenuListEl = document.querySelector(".user-menu-list");
    if (userNameEl) userNameEl.textContent = "Khách";
    if (userEmailEl) userEmailEl.textContent = "Chưa đăng nhập";
    if (userMenuListEl) {
      userMenuListEl.innerHTML = `
        <li><a href="login.html" style="color:var(--red)!important"><i class="fas fa-sign-in-alt"></i> Đăng Nhập</a></li>
        <li><a href="login.html"><i class="fas fa-user-plus"></i> Đăng Ký</a></li>`;
    }
  }
}

// ══════════════════════════════════════════════
//  SEARCH
// ══════════════════════════════════════════════
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
  input.addEventListener("input",  () => { clearTimeout(timer); timer = setTimeout(() => doSearch(input.value.trim()), 400); });
  input.addEventListener("click",   (e) => e.stopPropagation());
  results.addEventListener("click", (e) => e.stopPropagation());
}

async function doSearch(query) {
  const results = document.getElementById("searchResults");
  if (!results) return;
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

// ══════════════════════════════════════════════
//  GENRES
// ══════════════════════════════════════════════
async function loadGenres() {
  const data = await tmdb("/genre/movie/list");
  if (!data) return;
  document.getElementById("genreList").innerHTML = data.genres.map((g) =>
    `<a href="#" class="genre-item" onclick="filterByGenre(${g.id},'${g.name}');return false">${g.name}</a>`
  ).join("");
}

async function filterByGenre(id, name) {
  showToast(`🎬 Đang lọc: ${name}`);
  const data = await tmdb("/discover/movie", { with_genres: id, sort_by: "popularity.desc" });
  if (!data) return;
  renderMovieCards(document.getElementById("popularGrid"), data.results.slice(0, 12));
}

// ══════════════════════════════════════════════
//  HERO CAROUSEL
// ══════════════════════════════════════════════
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

  carousel.innerHTML = state.heroMovies.map((m, i) => `
    <div class="hero-slide ${i === 0 ? "active" : ""}" data-index="${i}">
      <div class="hero-bg">
        <img src="${backdrop(m.backdrop_path)}" alt="${m.title}" loading="${i === 0 ? "eager" : "lazy"}" />
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
          <button class="btn-secondary" onclick="toggleWatchlist(${m.id},'${escapeTitle(m.title)}')">
            <i class="fas fa-bookmark"></i> Xem Sau
          </button>
        </div>
      </div>
    </div>`).join("");

  indicators.innerHTML = state.heroMovies.map((_, i) =>
    `<div class="hero-dot ${i === 0 ? "active" : ""}" onclick="goToSlide(${i})"></div>`
  ).join("");

  document.getElementById("heroPrev").onclick = () => goToSlide((state.heroIndex - 1 + state.heroMovies.length) % state.heroMovies.length);
  document.getElementById("heroNext").onclick = () => goToSlide((state.heroIndex + 1) % state.heroMovies.length);
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
  state.heroTimer = setTimeout(() =>
    goToSlide((state.heroIndex + 1) % state.heroMovies.length), 6000
  );
}

// ══════════════════════════════════════════════
//  TICKER
// ══════════════════════════════════════════════
async function loadTicker() {
  const data = await tmdb("/movie/now_playing", { region: ECLIPSE_CONFIG.REGION });
  if (!data) return;
  const items = data.results.map((m) =>
    `<div class="ticker-item" onclick="location.href='detail.html?id=${m.id}'" style="cursor:pointer">
       <span>${m.vote_average.toFixed(1)} ⭐</span> ${m.title}
     </div>`
  ).join("");
  const track = document.getElementById("tickerTrack");
  track.innerHTML = items + items;
}

// ══════════════════════════════════════════════
//  SECTIONS
// ══════════════════════════════════════════════
async function loadNowPlaying() {
  const data = await tmdb("/movie/now_playing", { region: ECLIPSE_CONFIG.REGION });
  if (data) renderMovieCards(document.getElementById("nowPlayingRow"), data.results.slice(0, 10));
}

async function loadPopular(type = "all") {
  const endpoint = type === "day"  ? "/trending/movie/day"
                 : type === "week" ? "/trending/movie/week"
                 : "/movie/popular";
  const data = await tmdb(endpoint);
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

// ══════════════════════════════════════════════
//  RENDER CARD
// ══════════════════════════════════════════════
function renderMovieCards(container, movies) {
  if (!container) return;
  container.innerHTML = movies.map((m) => `
    <div class="movie-card" onclick="location.href='detail.html?id=${m.id}'">
      <div class="movie-poster">
        <img src="${poster(m.poster_path)}" alt="${m.title}" loading="lazy"
          onerror="this.src='https://via.placeholder.com/342x513/161616/888?text=N%2FA'" />
        <div class="movie-poster-overlay"><div class="play-btn"><i class="fas fa-play"></i></div></div>
        <div class="movie-rating-badge">⭐ ${m.vote_average.toFixed(1)}</div>
      </div>
      <div class="movie-info">
        <p class="movie-title">${m.title}</p>
        <div class="movie-meta"><span class="movie-year">${year(m.release_date)}</span></div>
      </div>
    </div>`).join("");
}

function showSkeletons(id, count = 6) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = Array(count).fill(`<div class="skeleton skeleton-card"></div>`).join("");
}

// ══════════════════════════════════════════════
//  WATCHLIST & FAVORITES
// ══════════════════════════════════════════════
function toggleWatchlist(id, title) {
  const added = Storage.toggle("cineverse_watchlist", id);
  state.watchlist = Storage.get("cineverse_watchlist");
  showToast(added ? `🔖 Đã thêm "${title}" vào xem sau` : `✖ Đã xóa "${title}" khỏi xem sau`);
}

function toggleFavorite(id, title) {
  const added = Storage.toggle("cineverse_favorites", id);
  state.favorites = Storage.get("cineverse_favorites");
  showToast(added ? `❤️ Đã thêm "${title}" vào yêu thích` : `✖ Đã xóa "${title}" khỏi yêu thích`);
}

// ══════════════════════════════════════════════
//  SCROLL ANIMATION
// ══════════════════════════════════════════════
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
    el.style.opacity    = "0";
    el.style.transform  = "translateY(24px)";
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(el);
  });
}

function observeCards(id) {
  const container = document.getElementById(id);
  if (!container) return;
  Array.from(container.children).forEach((card, i) => {
    card.style.opacity    = "0";
    card.style.transform  = "translateY(20px)";
    card.style.transition = `opacity 0.4s ease ${i * 0.06}s, transform 0.4s ease ${i * 0.06}s`;
    setTimeout(() => { card.style.opacity = "1"; card.style.transform = "translateY(0)"; }, 100 + i * 60);
  });
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
async function init() {
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