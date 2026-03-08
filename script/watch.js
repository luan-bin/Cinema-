/* ══════════════════════════════════════════════
   ECLIPSE CINEMA — watch.js
   Watch Page — Full Logic
══════════════════════════════════════════════ */

// ─── CONFIG ───────────────────────────────────
const CONFIG = {
  API_KEY:    "ef29fa7a978b4e6593665f37c7b9110c",   // ← Thay bằng API key của bạn
  BASE_URL:   "https://api.themoviedb.org/3",
  IMG_BASE:   "https://image.tmdb.org/t/p",
  POSTER_W:   "w342",
  BACKDROP_W: "w1280",
  LANG:       "vi-VN",
};

// Embed servers — thêm/bớt thoải mái
const SERVERS = [
  { name: "Server 1",   icon: "fa-circle-play",  url: (id) => `https://www.2embed.cc/embed/${id}` },
  { name: "Server 2",   icon: "fa-circle-play",  url: (id) => `https://vidsrc.to/embed/movie/${id}` },
  { name: "Server 3",   icon: "fa-circle-play",  url: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1` },
];

// ─── STATE ────────────────────────────────────
const state = {
  movieId:       null,
  movie:         null,
  activeServer:  0,
  playing:       false,
  watchlist:     JSON.parse(localStorage.getItem("cineverse_watchlist") || "[]"),
  favorites:     JSON.parse(localStorage.getItem("cineverse_favorites") || "[]"),
};

// ─── HELPERS ──────────────────────────────────
async function tmdb(endpoint, params = {}) {
  const url = new URL(`${CONFIG.BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", CONFIG.API_KEY);
  url.searchParams.set("language", CONFIG.LANG);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) { console.error("TMDB:", err); return null; }
}

const poster   = (p, s = CONFIG.POSTER_W) => p ? `${CONFIG.IMG_BASE}/${s}${p}` : `https://via.placeholder.com/342x513/161616/888?text=N%2FA`;
const year     = (d) => d ? d.slice(0, 4) : "N/A";
const runtime  = (m) => { if (!m) return "N/A"; const h = Math.floor(m/60), mn = m%60; return h ? `${h}g ${mn}p` : `${mn}p`; };
const escTitle = (t) => (t || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");

function formatDate(d) {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const periods = [
    [365*24*60*60*1000, "năm"], [30*24*60*60*1000, "tháng"],
    [7*24*60*60*1000,   "tuần"], [24*60*60*1000,   "ngày"],
    [60*60*1000, "giờ"],         [60*1000,          "phút"],
  ];
  for (const [ms, label] of periods) {
    if (diff >= ms) { const n = Math.floor(diff/ms); return `${n} ${label} trước`; }
  }
  return "Vừa xong";
}

// ══════════════════════════════════════════════
//  NAVBAR
// ══════════════════════════════════════════════
function initNavbar() {
  const navbar    = document.getElementById("navbar");
  const hamburger = document.getElementById("hamburger");
  const navLinks  = document.getElementById("navLinks");
  const avatarBtn = document.getElementById("userAvatarBtn");
  const userDD    = document.getElementById("userDropdown");

  window.addEventListener("scroll", () => navbar.classList.toggle("scrolled", window.scrollY > 20));
  navbar.classList.add("scrolled");

  hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("open");
    const open = navLinks.classList.contains("open");
    hamburger.querySelectorAll("span").forEach((s, i) => {
      if (open) {
        if (i === 0) s.style.transform = "translateY(7px) rotate(45deg)";
        if (i === 1) s.style.opacity = "0";
        if (i === 2) s.style.transform = "translateY(-7px) rotate(-45deg)";
      } else { s.style.transform = ""; s.style.opacity = ""; }
    });
  });

  avatarBtn.addEventListener("click", (e) => { e.stopPropagation(); userDD.classList.toggle("open"); });
  document.addEventListener("click", () => {
    userDD.classList.remove("open");
    document.getElementById("searchResults").classList.remove("open");
  });
}

// ══════════════════════════════════════════════
//  SEARCH
// ══════════════════════════════════════════════
function initSearch() {
  const btn    = document.getElementById("searchBtn");
  const input  = document.getElementById("searchInput");
  const results= document.getElementById("searchResults");
  let timer;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    input.classList.toggle("open");
    if (input.classList.contains("open")) input.focus();
  });
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => doSearch(input.value.trim()), 400); });
  input.addEventListener("click", (e) => e.stopPropagation());
  results.addEventListener("click", (e) => e.stopPropagation());
}

async function doSearch(q) {
  const results = document.getElementById("searchResults");
  if (!q) { results.classList.remove("open"); return; }
  results.innerHTML = `<div style="padding:14px;color:var(--grey);font-size:13px;text-align:center">Đang tìm...</div>`;
  results.classList.add("open");
  const data = await tmdb("/search/movie", { query: q });
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
    </div>
  `).join("");
}

// ══════════════════════════════════════════════
//  GENRES DROPDOWN
// ══════════════════════════════════════════════
async function loadGenres() {
  const data = await tmdb("/genre/movie/list");
  if (!data) return;
  document.getElementById("genreList").innerHTML = data.genres.map((g) =>
    `<a href="index.html#popular" class="genre-item">${g.name}</a>`
  ).join("");
}

// ══════════════════════════════════════════════
//  PLAYER
// ══════════════════════════════════════════════
function buildServerBtns() {
  const wrap = document.getElementById("serverBtns");
  wrap.innerHTML = SERVERS.map((s, i) => `
    <button class="server-btn ${i === state.activeServer ? "active" : ""}"
      onclick="selectServer(${i})">
      <i class="fas ${s.icon}"></i> ${s.name}
    </button>
  `).join("");
}

function selectServer(idx) {
  state.activeServer = idx;
  buildServerBtns();

  // If already playing, swap iframe src immediately
  if (state.playing) loadPlayer();
}

function loadPlayer() {
  const id     = state.movieId;
  const server = SERVERS[state.activeServer];
  const frame  = document.getElementById("playerFrame");

  frame.src = server.url(id);
  frame.style.display = "block";

  document.getElementById("playerSkeleton").style.display = "none";
  document.getElementById("sourceSelector").style.display = "none";
  document.getElementById("playerControlsBar").style.display = "flex";

  // PCB title
  const title = state.movie?.title || "Đang phát";
  document.getElementById("pcbTitle").textContent =
    `▶  ${title}  —  ${server.name}`;

  state.playing = true;
  showToast(`▶ Đang phát với ${server.name}`);
}

function showSourceSelector(movie) {
  const sel = document.getElementById("sourceSelector");
  sel.style.display = "flex";
  document.getElementById("playerSkeleton").style.display = "none";

  // Poster
  const posterWrap = document.getElementById("sourcePoster");
  posterWrap.innerHTML = `<img src="${poster(movie.poster_path)}" alt="${movie.title}" />`;

  // Title + meta
  document.getElementById("sourceTitle").textContent = movie.title;
  document.getElementById("sourceMeta").innerHTML = `
    <span><i class="fas fa-star" style="color:var(--gold)"></i> ${movie.vote_average?.toFixed(1) || "N/A"}</span>
    <span><i class="fas fa-calendar"></i> ${year(movie.release_date)}</span>
    <span><i class="fas fa-clock"></i> ${runtime(movie.runtime)}</span>
    <span><i class="fas fa-language"></i> ${(movie.original_language || "").toUpperCase()}</span>
  `;

  // Server buttons
  buildServerBtns();

  // Play button
  document.getElementById("btnPlayNow").onclick = loadPlayer;

  // Change server button in controls bar
  document.getElementById("btnChangeServer").onclick = () => {
    document.getElementById("playerFrame").style.display = "none";
    document.getElementById("playerControlsBar").style.display = "none";
    sel.style.display = "flex";
    state.playing = false;
  };
}

// ══════════════════════════════════════════════
//  MOVIE INFO CARD
// ══════════════════════════════════════════════
function renderInfoCard(movie) {
  document.getElementById("wicSkeleton").style.display = "none";
  const content = document.getElementById("wicContent");
  content.style.display = "block";

  const inWL  = state.watchlist.includes(movie.id);
  const inFav = state.favorites.includes(movie.id);
  const genres= movie.genres?.map((g) => g.name) || [];

  document.getElementById("wicTitle").textContent = movie.title;

  document.getElementById("wicMeta").innerHTML = `
    <span class="rating"><i class="fas fa-star"></i> ${movie.vote_average?.toFixed(1)} (${movie.vote_count?.toLocaleString()})</span>
    <span><i class="fas fa-calendar"></i> ${formatDate(movie.release_date)}</span>
    <span><i class="fas fa-clock"></i> ${runtime(movie.runtime)}</span>
    <span><i class="fas fa-language"></i> ${(movie.original_language || "").toUpperCase()}</span>
  `;

  document.getElementById("wicOverview").textContent =
    movie.overview || "Chưa có mô tả tiếng Việt.";

  document.getElementById("wicTags").innerHTML =
    genres.map((g) => `<span class="wic-tag">${g}</span>`).join("");

  // Buttons
  const wlBtn  = document.getElementById("wlBtn");
  const favBtn = document.getElementById("favBtn");
  const detLink= document.getElementById("detailLink");

  if (inWL)  wlBtn.classList.add("active-red");
  if (inFav) favBtn.classList.add("active-gold");

  wlBtn.onclick  = () => toggleWatchlist(movie.id, escTitle(movie.title));
  favBtn.onclick = () => toggleFavorite(movie.id, escTitle(movie.title));
  document.getElementById("shareBtn").onclick = shareMovie;

  detLink.href = `detail.html?id=${movie.id}`;
}

// ══════════════════════════════════════════════
//  BREADCRUMB + TITLE + DETAIL LINKS
// ══════════════════════════════════════════════
function renderMeta(movie) {
  document.title = `${movie.title} – Eclipse Cinema`;

  document.getElementById("breadcrumbTitle").textContent = movie.title;
  document.getElementById("breadcrumbDetail").href = `detail.html?id=${movie.id}`;

  document.getElementById("pcbDetailLink").href = `detail.html?id=${movie.id}`;
}

// ══════════════════════════════════════════════
//  SIMILAR MOVIES
// ══════════════════════════════════════════════
function renderSimilar(movies) {
  const list = document.getElementById("similarList");
  const filtered = movies?.filter((m) => m.poster_path).slice(0, 15) || [];

  if (!filtered.length) {
    list.innerHTML = `<p style="color:var(--grey);font-size:13px;text-align:center;padding:20px 0">Không có phim tương tự</p>`;
    return;
  }

  list.innerHTML = filtered.map((m) => `
    <div class="similar-card" onclick="location.href='watch.html?id=${m.id}'">
      <div class="similar-poster">
        <img src="${poster(m.poster_path, "w185")}" alt="${m.title}" loading="lazy" />
      </div>
      <div class="similar-info">
        <div class="similar-title">${m.title}</div>
        <div class="similar-meta">
          <span class="similar-rating">⭐ ${m.vote_average?.toFixed(1)}</span>
          <span>${year(m.release_date)}</span>
        </div>
      </div>
      <div class="similar-watch-btn"><i class="fas fa-play"></i></div>
    </div>
  `).join("");
}

// ══════════════════════════════════════════════
//  COMMENTS
// ══════════════════════════════════════════════
function initComments() {
  const user = JSON.parse(localStorage.getItem("currentUser") || "null");
  const formWrap = document.getElementById("commentFormWrap");

  if (user) {
    // Logged in — show form
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username)}`;
    formWrap.innerHTML = `
      <form class="cmt-form" id="cmtForm" autocomplete="off">
        <div class="cmt-avatar">
          <img src="${avatarUrl}" alt="${user.username}" />
        </div>
        <div class="cmt-input-wrap">
          <input class="cmt-input" type="text" id="cmtInput"
            placeholder="Bình luận với tư cách ${user.username}..." required />
          <button class="cmt-send-btn" type="submit">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </form>
    `;

    document.getElementById("cmtForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const text = document.getElementById("cmtInput").value.trim();
      if (!text) return;
      document.getElementById("cmtInput").value = "";

      const all = JSON.parse(localStorage.getItem(`comments-${state.movieId}`) || "[]");
      all.unshift({ text, user: { username: user.username }, createdAt: Date.now() });
      localStorage.setItem(`comments-${state.movieId}`, JSON.stringify(all));
      renderComments();
      showToast("✅ Đã đăng bình luận!");
    });

  } else {
    // Guest
    formWrap.innerHTML = `
      <div class="cmt-guest-prompt" onclick="location.href='login.html'">
        <div class="cmt-guest-icon"><i class="fas fa-user"></i></div>
        <div class="cmt-guest-text">
          <p>Đăng nhập để bình luận</p>
          <span>Chia sẻ cảm nghĩ về bộ phim này</span>
        </div>
        <a href="login.html" class="cmt-guest-btn">
          <i class="fas fa-sign-in-alt"></i> Đăng Nhập
        </a>
      </div>
    `;
  }

  renderComments();
}

function renderComments() {
  const list = document.getElementById("commentsList");
  const all  = JSON.parse(localStorage.getItem(`comments-${state.movieId}`) || "[]");

  // Update count
  const countEl = document.getElementById("commentCount");
  if (countEl) countEl.textContent = all.length ? `${all.length} bình luận` : "";

  if (!all.length) {
    list.innerHTML = `
      <div class="comments-empty">
        <i class="fas fa-comment-slash"></i>
        Chưa có bình luận. Hãy là người đầu tiên!
      </div>
    `;
    return;
  }

  list.innerHTML = all.map((c) => {
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.user.username)}`;
    return `
      <div class="cmt-item">
        <div class="cmt-item-avatar">
          <img src="${c.user.photoURL || avatarUrl}" alt="${c.user.username}" />
        </div>
        <div class="cmt-item-body">
          <div class="cmt-bubble">
            <div class="cmt-username">${c.user.username}</div>
            <div class="cmt-text">${escapeHtml(c.text)}</div>
          </div>
          <div class="cmt-footer">
            <span class="cmt-time">${timeAgo(c.createdAt)}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function escapeHtml(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ══════════════════════════════════════════════
//  WATCHLIST & FAVORITES
// ══════════════════════════════════════════════
function toggleWatchlist(id, title) {
  const idx = state.watchlist.indexOf(id);
  const btn = document.getElementById("wlBtn");
  if (idx === -1) {
    state.watchlist.push(id);
    showToast(`🔖 Đã thêm "${title}" vào xem sau`);
    btn?.classList.add("active-red");
  } else {
    state.watchlist.splice(idx, 1);
    showToast(`✖ Đã xóa "${title}" khỏi xem sau`);
    btn?.classList.remove("active-red");
  }
  localStorage.setItem("cineverse_watchlist", JSON.stringify(state.watchlist));
}

function toggleFavorite(id, title) {
  const idx = state.favorites.indexOf(id);
  const btn = document.getElementById("favBtn");
  if (idx === -1) {
    state.favorites.push(id);
    showToast(`❤️ Đã thêm "${title}" vào yêu thích`);
    btn?.classList.add("active-gold");
  } else {
    state.favorites.splice(idx, 1);
    showToast(`✖ Đã xóa "${title}" khỏi yêu thích`);
    btn?.classList.remove("active-gold");
  }
  localStorage.setItem("cineverse_favorites", JSON.stringify(state.favorites));
}

function shareMovie() {
  if (navigator.share) {
    navigator.share({ title: document.title, url: location.href }).catch(() => {});
  } else {
    navigator.clipboard.writeText(location.href).then(() => showToast("🔗 Đã sao chép link!"));
  }
}

// ══════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════
let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}

// ══════════════════════════════════════════════
//  BACK TO TOP
// ══════════════════════════════════════════════
function initBackToTop() {
  const btn = document.getElementById("backToTop");
  window.addEventListener("scroll", () => btn.classList.toggle("visible", scrollY > 500));
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

// ══════════════════════════════════════════════
//  ERROR PAGE
// ══════════════════════════════════════════════
function showError(msg = "Không tìm thấy phim") {
  document.querySelector(".watch-layout").innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:120px 20px">
      <i class="fas fa-exclamation-circle" style="font-size:60px;color:var(--black4);display:block;margin-bottom:20px"></i>
      <h2 style="font-family:var(--font-display);font-size:40px;color:var(--grey);margin-bottom:12px">${msg}</h2>
      <p style="color:var(--grey);margin-bottom:28px;font-size:14px">ID phim không hợp lệ hoặc đã bị xóa.</p>
      <a href="index.html" class="btn-primary">
        <i class="fas fa-arrow-left"></i> Về Trang Chủ
      </a>
    </div>
  `;
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
async function init() {
  initNavbar();
  initSearch();
  initBackToTop();
  loadGenres();

  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  if (!id) { showError("Thiếu ID Phim"); return; }
  state.movieId = parseInt(id, 10);

  // Parallel fetch
  const [movie, similar] = await Promise.all([
    tmdb(`/movie/${id}`),
    tmdb(`/movie/${id}/similar`),
  ]);

  if (!movie) { showError("Không Tìm Thấy Phim"); return; }

  state.movie = movie;

  // Render everything
  renderMeta(movie);
  showSourceSelector(movie);
  renderInfoCard(movie);
  renderSimilar(similar?.results || []);
  initComments();
}

document.addEventListener("DOMContentLoaded", init);