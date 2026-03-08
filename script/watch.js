/* ══════════════════════════════════════════════
   ECLIPSE CINEMA — watch.js
   Phụ thuộc: config.js (load trước trong HTML)
══════════════════════════════════════════════ */

// Alias
const tmdb   = tmdbFetch;
const poster = posterUrl;
const year   = releaseYear;

// ─── STATE ────────────────────────────────────
const state = {
  movieId:      null,
  movie:        null,
  activeServer: 0,
  playing:      false,
  watchlist:    Storage.get("cineverse_watchlist"),
  favorites:    Storage.get("cineverse_favorites"),
};

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
        if (i === 1) s.style.opacity   = "0";
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
  const btn     = document.getElementById("searchBtn");
  const input   = document.getElementById("searchInput");
  const results = document.getElementById("searchResults");
  let timer;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    input.classList.toggle("open");
    if (input.classList.contains("open")) input.focus();
  });
  input.addEventListener("input",   () => { clearTimeout(timer); timer = setTimeout(() => doSearch(input.value.trim()), 400); });
  input.addEventListener("click",    (e) => e.stopPropagation());
  results.addEventListener("click",  (e) => e.stopPropagation());
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
    </div>`).join("");
}

// ══════════════════════════════════════════════
//  GENRES
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
  document.getElementById("serverBtns").innerHTML =
    ECLIPSE_CONFIG.SERVERS.map((s, i) => `
      <button class="server-btn ${i === state.activeServer ? "active" : ""}"
        onclick="selectServer(${i})">
        <i class="fas ${s.icon}"></i> ${s.name}
      </button>`).join("");
}

function selectServer(idx) {
  state.activeServer = idx;
  buildServerBtns();
  if (state.playing) loadPlayer();
}

function loadPlayer() {
  const server = ECLIPSE_CONFIG.SERVERS[state.activeServer];
  const frame  = document.getElementById("playerFrame");
  frame.src = server.url(state.movieId);
  frame.style.display = "block";

  document.getElementById("playerSkeleton").style.display    = "none";
  document.getElementById("sourceSelector").style.display    = "none";
  document.getElementById("playerControlsBar").style.display = "flex";

  const title = state.movie?.title || "Đang phát";
  document.getElementById("pcbTitle").textContent = `▶  ${title}  —  ${server.name}`;
  state.playing = true;
  showToast(`▶ Đang phát với ${server.name}`);
}

function showSourceSelector(movie) {
  const sel = document.getElementById("sourceSelector");
  sel.style.display = "flex";
  document.getElementById("playerSkeleton").style.display = "none";

  document.getElementById("sourcePoster").innerHTML =
    `<img src="${poster(movie.poster_path)}" alt="${movie.title}" />`;
  document.getElementById("sourceTitle").textContent = movie.title;
  document.getElementById("sourceMeta").innerHTML = `
    <span><i class="fas fa-star" style="color:var(--gold)"></i> ${movie.vote_average?.toFixed(1) || "N/A"}</span>
    <span><i class="fas fa-calendar"></i> ${year(movie.release_date)}</span>
    <span><i class="fas fa-clock"></i> ${formatRuntime(movie.runtime)}</span>
    <span><i class="fas fa-language"></i> ${(movie.original_language || "").toUpperCase()}</span>`;

  buildServerBtns();

  document.getElementById("btnPlayNow").onclick = loadPlayer;
  document.getElementById("btnChangeServer").onclick = () => {
    document.getElementById("playerFrame").style.display          = "none";
    document.getElementById("playerControlsBar").style.display    = "none";
    sel.style.display = "flex";
    state.playing = false;
  };
}

// ══════════════════════════════════════════════
//  MOVIE INFO CARD
// ══════════════════════════════════════════════
function renderInfoCard(movie) {
  document.getElementById("wicSkeleton").style.display = "none";
  document.getElementById("wicContent").style.display  = "block";

  const inWL  = Storage.has("cineverse_watchlist", movie.id);
  const inFav = Storage.has("cineverse_favorites", movie.id);

  document.getElementById("wicTitle").textContent = movie.title;
  document.getElementById("wicMeta").innerHTML = `
    <span class="rating"><i class="fas fa-star"></i> ${movie.vote_average?.toFixed(1)} (${movie.vote_count?.toLocaleString()})</span>
    <span><i class="fas fa-calendar"></i> ${formatDate(movie.release_date)}</span>
    <span><i class="fas fa-clock"></i> ${formatRuntime(movie.runtime)}</span>
    <span><i class="fas fa-language"></i> ${(movie.original_language || "").toUpperCase()}</span>`;

  document.getElementById("wicOverview").textContent = movie.overview || "Chưa có mô tả tiếng Việt.";
  document.getElementById("wicTags").innerHTML =
    (movie.genres || []).map((g) => `<span class="wic-tag">${g.name}</span>`).join("");

  const wlBtn  = document.getElementById("wlBtn");
  const favBtn = document.getElementById("favBtn");
  const detLink= document.getElementById("detailLink");

  if (inWL)  wlBtn.classList.add("active-red");
  if (inFav) favBtn.classList.add("active-gold");

  wlBtn.onclick  = () => toggleWatchlist(movie.id, escapeTitle(movie.title));
  favBtn.onclick = () => toggleFavorite(movie.id, escapeTitle(movie.title));
  document.getElementById("shareBtn").onclick = shareMovie;
  detLink.href = `detail.html?id=${movie.id}`;
}

// ══════════════════════════════════════════════
//  META (breadcrumb + title)
// ══════════════════════════════════════════════
function renderMeta(movie) {
  document.title = `${movie.title} – ${ECLIPSE_CONFIG.APP_NAME}`;
  document.getElementById("breadcrumbTitle").textContent      = movie.title;
  document.getElementById("breadcrumbDetail").href            = `detail.html?id=${movie.id}`;
  document.getElementById("pcbDetailLink").href               = `detail.html?id=${movie.id}`;
}

// ══════════════════════════════════════════════
//  SIMILAR
// ══════════════════════════════════════════════
function renderSimilar(movies) {
  const list     = document.getElementById("similarList");
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
    </div>`).join("");
}

// ══════════════════════════════════════════════
//  COMMENTS
// ══════════════════════════════════════════════
function initComments() {
  const user     = JSON.parse(localStorage.getItem("currentUser") || "null");
  const formWrap = document.getElementById("commentFormWrap");

  if (user) {
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username)}`;
    formWrap.innerHTML = `
      <form class="cmt-form" id="cmtForm" autocomplete="off">
        <div class="cmt-avatar"><img src="${avatarUrl}" alt="${user.username}" /></div>
        <div class="cmt-input-wrap">
          <input class="cmt-input" type="text" id="cmtInput"
            placeholder="Bình luận với tư cách ${user.username}..." required />
          <button class="cmt-send-btn" type="submit"><i class="fas fa-paper-plane"></i></button>
        </div>
      </form>`;

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
    formWrap.innerHTML = `
      <div class="cmt-guest-prompt" onclick="location.href='login.html'">
        <div class="cmt-guest-icon"><i class="fas fa-user"></i></div>
        <div class="cmt-guest-text">
          <p>Đăng nhập để bình luận</p>
          <span>Chia sẻ cảm nghĩ về bộ phim này</span>
        </div>
        <a href="login.html" class="cmt-guest-btn"><i class="fas fa-sign-in-alt"></i> Đăng Nhập</a>
      </div>`;
  }

  renderComments();
}

function renderComments() {
  const list = document.getElementById("commentsList");
  const all  = JSON.parse(localStorage.getItem(`comments-${state.movieId}`) || "[]");

  const countEl = document.getElementById("commentCount");
  if (countEl) countEl.textContent = all.length ? `${all.length} bình luận` : "";

  if (!all.length) {
    list.innerHTML = `
      <div class="comments-empty">
        <i class="fas fa-comment-slash"></i>
        Chưa có bình luận. Hãy là người đầu tiên!
      </div>`;
    return;
  }

  list.innerHTML = all.map((c) => {
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.user.username)}`;
    return `
      <div class="cmt-item">
        <div class="cmt-item-avatar"><img src="${c.user.photoURL || avatarUrl}" alt="${c.user.username}" /></div>
        <div class="cmt-item-body">
          <div class="cmt-bubble">
            <div class="cmt-username">${c.user.username}</div>
            <div class="cmt-text">${escapeHtml(c.text)}</div>
          </div>
          <div class="cmt-footer">
            <span class="cmt-time">${timeAgo(c.createdAt)}</span>
          </div>
        </div>
      </div>`;
  }).join("");
}

// ══════════════════════════════════════════════
//  WATCHLIST & FAVORITES
// ══════════════════════════════════════════════
function toggleWatchlist(id, title) {
  const added = Storage.toggle("cineverse_watchlist", id);
  state.watchlist = Storage.get("cineverse_watchlist");
  showToast(added ? `🔖 Đã thêm "${title}" vào xem sau` : `✖ Đã xóa "${title}" khỏi xem sau`);
  document.getElementById("wlBtn")?.classList.toggle("active-red", added);
}

function toggleFavorite(id, title) {
  const added = Storage.toggle("cineverse_favorites", id);
  state.favorites = Storage.get("cineverse_favorites");
  showToast(added ? `❤️ Đã thêm "${title}" vào yêu thích` : `✖ Đã xóa "${title}" khỏi yêu thích`);
  document.getElementById("favBtn")?.classList.toggle("active-gold", added);
}

function shareMovie() {
  if (navigator.share) navigator.share({ title: document.title, url: location.href }).catch(() => {});
  else navigator.clipboard.writeText(location.href).then(() => showToast("🔗 Đã sao chép link!"));
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
//  ERROR
// ══════════════════════════════════════════════
function showError(msg = "Không tìm thấy phim") {
  document.querySelector(".watch-layout").innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:120px 20px">
      <i class="fas fa-exclamation-circle" style="font-size:60px;color:var(--black4);display:block;margin-bottom:20px"></i>
      <h2 style="font-family:var(--font-display);font-size:40px;color:var(--grey);margin-bottom:12px">${msg}</h2>
      <p style="color:var(--grey);margin-bottom:28px;font-size:14px">ID phim không hợp lệ hoặc đã bị xóa.</p>
      <a href="index.html" class="btn-primary"><i class="fas fa-arrow-left"></i> Về Trang Chủ</a>
    </div>`;
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
async function init() {
  initNavbar();
  initSearch();
  initBackToTop();
  loadGenres();

  const id = new URLSearchParams(location.search).get("id");
  if (!id) { showError("Thiếu ID Phim"); return; }
  state.movieId = parseInt(id, 10);

  const [movie, similar] = await Promise.all([
    tmdb(`/movie/${id}`),
    tmdb(`/movie/${id}/similar`),
  ]);

  if (!movie) { showError("Không Tìm Thấy Phim"); return; }
  state.movie = movie;

  renderMeta(movie);
  showSourceSelector(movie);
  renderInfoCard(movie);
  renderSimilar(similar?.results || []);
  initComments();
}

document.addEventListener("DOMContentLoaded", init);