/* ══════════════════════════════════════════════
   CINEVERSE — home.js
   TMDB API Integration + All Interactions
══════════════════════════════════════════════ */

// ─── CONFIG ───────────────────────────────────
const CONFIG = {
  API_KEY: "ef29fa7a978b4e6593665f37c7b9110c",   // ← Thay bằng API key của bạn
  BASE_URL: "https://api.themoviedb.org/3",
  IMG_BASE: "https://image.tmdb.org/t/p",
  POSTER_W: "w342",
  BACKDROP_W: "w1280",
  LANG: "vi-VN",
};

// ─── STATE ────────────────────────────────────
const state = {
  heroMovies: [],
  heroIndex: 0,
  heroTimer: null,
  watchlist: JSON.parse(localStorage.getItem("cineverse_watchlist") || "[]"),
  favorites: JSON.parse(localStorage.getItem("cineverse_favorites") || "[]"),
};

// ─── TMDB FETCH ──────────────────────────────
async function tmdb(endpoint, params = {}) {
  const url = new URL(`${CONFIG.BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", CONFIG.API_KEY);
  url.searchParams.set("language", CONFIG.LANG);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.error("TMDB Error:", err);
    return null;
  }
}

// Helpers
const poster = (path, size = CONFIG.POSTER_W) =>
  path ? `${CONFIG.IMG_BASE}/${size}${path}` : "https://via.placeholder.com/342x513/161616/888?text=No+Image";

const backdrop = (path) =>
  path ? `${CONFIG.IMG_BASE}/${CONFIG.BACKDROP_W}${path}` : "";

const year = (date) => date ? date.slice(0, 4) : "N/A";

const stars = (rating) => {
  const n = Math.round(rating / 2);
  return "★".repeat(n) + "☆".repeat(5 - n);
};

// ── Navigate to detail page ──────────────────
function goToDetail(movieId) {
  window.location.href = `detail.html?id=${movieId}`;
}

function escapeTitle(title) {
  return (title || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// ══════════════════════════════════════════════
//  NAVBAR
// ══════════════════════════════════════════════
function initNavbar() {
  const navbar = document.getElementById("navbar");
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");
  const userAvatarBtn = document.getElementById("userAvatarBtn");
  const userDropdown = document.getElementById("userDropdown");

  // Scroll effect
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 60);
  });

  // Hamburger toggle
  hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("open");
    const open = navLinks.classList.contains("open");
    hamburger.querySelectorAll("span").forEach((s, i) => {
      if (open) {
        if (i === 0) s.style.transform = "translateY(7px) rotate(45deg)";
        if (i === 1) s.style.opacity = "0";
        if (i === 2) s.style.transform = "translateY(-7px) rotate(-45deg)";
      } else {
        s.style.transform = ""; s.style.opacity = "";
      }
    });
  });

  // User dropdown
  userAvatarBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle("open");
  });

  // Mobile dropdown toggles
  document.querySelectorAll(".dropdown-toggle").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        btn.closest(".dropdown").classList.toggle("open");
      }
    });
  });

  // Close menus on outside click
  document.addEventListener("click", () => {
    userDropdown.classList.remove("open");
    document.getElementById("searchResults").classList.remove("open");
  });

  // Smooth scroll for nav links
  document.querySelectorAll(".nav-link[href^='#']").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
        navLinks.classList.remove("open");
      }
      document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });
}

// ══════════════════════════════════════════════
//  AUTH — Kết nối Navbar với CinemaAuth
// ══════════════════════════════════════════════
function initAuthNavbar() {
  if (!window.CinemaAuth) return;

  const session = CinemaAuth.getSession();

  if (session && CinemaAuth.isLoggedIn()) {
    const { firstName, lastName, email } = session.user;
    const fullName = `${firstName} ${lastName}`;
    const initials = `${firstName[0]}${lastName[0]}`.toUpperCase();

    const avatarBtn = document.getElementById("userAvatarBtn");
    avatarBtn.innerHTML = `
      <div style="
        width:100%; height:100%;
        background: var(--red);
        display:grid; place-items:center;
        font-family: var(--font-cond);
        font-size: 13px; font-weight: 700;
        color: #fff; letter-spacing: 1px;
      ">${initials}</div>
    `;

    document.querySelector(".user-name").textContent = fullName;
    document.querySelector(".user-email").textContent = email;

    document.querySelector(".logout-link").addEventListener("click", (e) => {
      e.preventDefault();
      CinemaAuth.logout();
      showToast("Đã đăng xuất. Hẹn gặp lại! 👋");
      setTimeout(() => { window.location.href = "login.html"; }, 1200);
    });

  } else {
    document.querySelector(".user-name").textContent = "Khách";
    document.querySelector(".user-email").textContent = "Chưa đăng nhập";

    document.querySelector(".user-menu-list").innerHTML = `
      <li>
        <a href="login.html" style="color: var(--red) !important;">
          <i class="fas fa-sign-in-alt"></i> Đăng Nhập
        </a>
      </li>
      <li>
        <a href="login.html">
          <i class="fas fa-user-plus"></i> Đăng Ký
        </a>
      </li>
    `;
  }
}

// ══════════════════════════════════════════════
//  SEARCH
// ══════════════════════════════════════════════
function initSearch() {
  const searchBtn = document.getElementById("searchBtn");
  const searchInput = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");
  let debounceTimer;

  searchBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    searchInput.classList.toggle("open");
    if (searchInput.classList.contains("open")) searchInput.focus();
  });

  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => performSearch(searchInput.value.trim()), 400);
  });

  searchInput.addEventListener("click", (e) => e.stopPropagation());
  searchResults.addEventListener("click", (e) => e.stopPropagation());
}

async function performSearch(query) {
  const results = document.getElementById("searchResults");
  if (!query) { results.classList.remove("open"); return; }

  results.innerHTML = `<div style="padding:14px;color:var(--grey);font-size:13px;text-align:center">Đang tìm...</div>`;
  results.classList.add("open");

  const data = await tmdb("/search/movie", { query });
  if (!data || !data.results.length) {
    results.innerHTML = `<div style="padding:14px;color:var(--grey);font-size:13px;text-align:center">Không tìm thấy kết quả</div>`;
    return;
  }

  // ── Bấm vào kết quả search → sang detail.html ──
  results.innerHTML = data.results.slice(0, 7).map((m) => `
    <div class="search-result-item" onclick="goToDetail(${m.id})">
      <img src="${poster(m.poster_path, 'w92')}" alt="${m.title}" />
      <div class="search-result-info">
        <p>${m.title}</p>
        <span>${year(m.release_date)} &nbsp;⭐ ${m.vote_average.toFixed(1)}</span>
      </div>
    </div>
  `).join("");
}

// ══════════════════════════════════════════════
//  GENRES DROPDOWN
// ══════════════════════════════════════════════
async function loadGenres() {
  const data = await tmdb("/genre/movie/list");
  if (!data) return;

  const list = document.getElementById("genreList");
  list.innerHTML = data.genres.map((g) => `
    <a href="#" class="genre-item" onclick="filterByGenre(${g.id}, '${g.name}'); return false;">
      ${g.name}
    </a>
  `).join("");
}

async function filterByGenre(id, name) {
  showToast(`🎬 Đang lọc: ${name}`);
  const data = await tmdb("/discover/movie", { with_genres: id, sort_by: "popularity.desc" });
  if (!data) return;
  const grid = document.getElementById("popularGrid");
  renderMovieCards(grid, data.results.slice(0, 12));
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
  const carousel = document.getElementById("heroCarousel");
  const indicators = document.getElementById("heroIndicators");

  carousel.innerHTML = state.heroMovies.map((m, i) => `
    <div class="hero-slide ${i === 0 ? "active" : ""}" data-index="${i}">
      <div class="hero-bg">
        <img src="${backdrop(m.backdrop_path)}" alt="${m.title}" loading="${i === 0 ? 'eager' : 'lazy'}" />
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
          <button class="btn-primary" onclick="goToDetail(${m.id})">
            <i class="fas fa-play"></i> Xem Chi Tiết
          </button>
          <button class="btn-secondary" onclick="toggleWatchlist(${m.id}, '${escapeTitle(m.title)}')">
            <i class="fas fa-bookmark"></i> Xem Sau
          </button>
        </div>
      </div>
    </div>
  `).join("");

  indicators.innerHTML = state.heroMovies.map((_, i) => `
    <div class="hero-dot ${i === 0 ? "active" : ""}" onclick="goToSlide(${i})"></div>
  `).join("");

  document.getElementById("heroPrev").onclick = () => goToSlide((state.heroIndex - 1 + state.heroMovies.length) % state.heroMovies.length);
  document.getElementById("heroNext").onclick = () => goToSlide((state.heroIndex + 1) % state.heroMovies.length);
}

function goToSlide(n) {
  document.querySelectorAll(".hero-slide").forEach((s) => s.classList.remove("active"));
  document.querySelectorAll(".hero-dot").forEach((d) => d.classList.remove("active"));

  state.heroIndex = n;
  const slides = document.querySelectorAll(".hero-slide");
  const dots = document.querySelectorAll(".hero-dot");
  if (slides[n]) slides[n].classList.add("active");
  if (dots[n]) dots[n].classList.add("active");

  clearTimeout(state.heroTimer);
  startHeroAutoplay();
}

function startHeroAutoplay() {
  state.heroTimer = setTimeout(() => {
    goToSlide((state.heroIndex + 1) % state.heroMovies.length);
  }, 6000);
}

// ══════════════════════════════════════════════
//  TICKER
// ══════════════════════════════════════════════
async function loadTicker() {
  const data = await tmdb("/movie/now_playing", { region: "VN" });
  if (!data) return;
  const track = document.getElementById("tickerTrack");
  const items = data.results.map((m) => `
    <div class="ticker-item" onclick="goToDetail(${m.id})" style="cursor:pointer">
      <span>${m.vote_average.toFixed(1)} ⭐</span> ${m.title}
    </div>
  `).join("");
  track.innerHTML = items + items;
}

// ══════════════════════════════════════════════
//  NOW PLAYING
// ══════════════════════════════════════════════
async function loadNowPlaying() {
  const data = await tmdb("/movie/now_playing", { region: "VN" });
  if (!data) return;
  renderMovieCards(document.getElementById("nowPlayingRow"), data.results.slice(0, 10));
}

// ══════════════════════════════════════════════
//  POPULAR
// ══════════════════════════════════════════════
async function loadPopular(type = "all") {
  let data;
  if (type === "day") data = await tmdb("/trending/movie/day");
  else if (type === "week") data = await tmdb("/trending/movie/week");
  else data = await tmdb("/movie/popular");
  if (!data) return;
  renderMovieCards(document.getElementById("popularGrid"), data.results.slice(0, 12));
}

document.getElementById("popularFilter")?.addEventListener("click", (e) => {
  const tab = e.target.closest(".filter-tab");
  if (!tab) return;
  document.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  loadPopular(tab.dataset.filter);
});

// ══════════════════════════════════════════════
//  UPCOMING
// ══════════════════════════════════════════════
async function loadUpcoming() {
  const data = await tmdb("/movie/upcoming", { region: "VN" });
  if (!data) return;
  const container = document.getElementById("upcomingList");
  container.innerHTML = data.results.slice(0, 8).map((m) => `
    <div class="upcoming-card" onclick="goToDetail(${m.id})">
      <img src="${poster(m.poster_path, 'w92')}" alt="${m.title}" />
      <div class="upcoming-info">
        <p class="upcoming-title">${m.title}</p>
        <p class="upcoming-date"><i class="fas fa-calendar-alt"></i> ${formatDate(m.release_date)}</p>
        <p class="upcoming-overview">${m.overview || "Chưa có mô tả."}</p>
      </div>
    </div>
  `).join("");
}

// ══════════════════════════════════════════════
//  TOP RATED
// ══════════════════════════════════════════════
async function loadTopRated() {
  const data = await tmdb("/movie/top_rated");
  if (!data) return;
  const grid = document.getElementById("topRatedGrid");
  grid.innerHTML = data.results.slice(0, 10).map((m, i) => `
    <div class="top-rated-card" onclick="goToDetail(${m.id})">
      <img src="${backdrop(m.backdrop_path) || poster(m.poster_path)}" alt="${m.title}" />
      <div class="top-rated-overlay">
        <span class="top-rated-rank">${String(i + 1).padStart(2, "0")}</span>
        <p class="top-rated-title">${m.title}</p>
        <p class="top-rated-rating">⭐ ${m.vote_average.toFixed(1)} &nbsp;(${m.vote_count.toLocaleString()} đánh giá)</p>
      </div>
    </div>
  `).join("");
}

// ══════════════════════════════════════════════
//  RENDER MOVIE CARDS (reusable)
// ══════════════════════════════════════════════
function renderMovieCards(container, movies) {
  if (!container) return;
  container.innerHTML = movies.map((m) => `
    <div class="movie-card" onclick="goToDetail(${m.id})">
      <div class="movie-poster">
        <img
          src="${poster(m.poster_path)}"
          alt="${m.title}"
          loading="lazy"
          onerror="this.src='https://via.placeholder.com/342x513/161616/888?text=No+Image'"
        />
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
    </div>
  `).join("");
}

// Skeletons while loading
function showSkeletons(containerId, count = 6) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = Array(count).fill(
    `<div class="skeleton skeleton-card"></div>`
  ).join("");
}

// ══════════════════════════════════════════════
//  WATCHLIST & FAVORITES
// ══════════════════════════════════════════════
function toggleWatchlist(id, title) {
  const idx = state.watchlist.indexOf(id);
  if (idx === -1) {
    state.watchlist.push(id);
    showToast(`🔖 Đã thêm "${title}" vào danh sách xem sau`);
  } else {
    state.watchlist.splice(idx, 1);
    showToast(`✖ Đã xóa "${title}" khỏi danh sách xem sau`);
  }
  localStorage.setItem("cineverse_watchlist", JSON.stringify(state.watchlist));
}

function toggleFavorite(id, title) {
  const idx = state.favorites.indexOf(id);
  if (idx === -1) {
    state.favorites.push(id);
    showToast(`❤️ Đã thêm "${title}" vào yêu thích`);
  } else {
    state.favorites.splice(idx, 1);
    showToast(`✖ Đã xóa "${title}" khỏi yêu thích`);
  }
  localStorage.setItem("cineverse_favorites", JSON.stringify(state.favorites));
}

// ══════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return dateStr; }
}

// ══════════════════════════════════════════════
//  SCROLL ANIMATION (Intersection Observer)
// ══════════════════════════════════════════════
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });

  document.querySelectorAll(".section-header, .promo-banner, .ticker-wrap").forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(24px)";
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(el);
  });
}

function observeCards(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  Array.from(container.children).forEach((card, i) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    card.style.transition = `opacity 0.4s ease ${i * 0.06}s, transform 0.4s ease ${i * 0.06}s`;
    setTimeout(() => {
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, 100 + i * 60);
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
    loadNowPlaying().then(() => observeCards("nowPlayingRow")),
    loadPopular().then(() => observeCards("popularGrid")),
    loadUpcoming().then(() => observeCards("upcomingList")),
    loadTopRated().then(() => observeCards("topRatedGrid")),
  ]);
}

document.addEventListener("DOMContentLoaded", init);