/* ══════════════════════════════════════════════
   ECLIPSE CINEMA — detail.js  (FIXED)
   Trang chi tiết phim: hero, tabs, cast, media, reviews
   Phụ thuộc: config.js → api.js → auth.js

   CHANGES:
   [Fix #4] toggleWatchlist / toggleFavorite disable nút trong khi xử lý
   [Fix #2] Storage user-aware xử lý ở config.js, không cần sửa ở đây
══════════════════════════════════════════════ */

// ─── Alias ngắn ───────────────────────────────
const tmdb     = tmdbFetch;
const poster   = posterUrl;
const backdrop = backdropUrl;
const profile  = profileUrl;
const year     = releaseYear;

/* ──────────────────────────────────────────────
   STATE
────────────────────────────────────────────── */
const state = {
  movieId:   null,
  movie:     null,
  credits:   null,
  images:    null,
  mediaType: "backdrops",
  lightbox:  { images: [], index: 0 },
  watchlist: Storage.get("cineverse_watchlist"),
  favorites: Storage.get("cineverse_favorites"),
};

/* ══════════════════════════════════════════════
   NAVBAR
══════════════════════════════════════════════ */

/**
 * Khởi tạo navbar cho trang detail: scroll effect, hamburger menu, user dropdown
 */
function initNavbar() {
  const navbar    = document.getElementById("navbar");
  const hamburger = document.getElementById("hamburger");
  const navLinks  = document.getElementById("navLinks");
  const avatarBtn = document.getElementById("userAvatarBtn");
  const userDD    = document.getElementById("userDropdown");
  if (!navbar) return;

  navbar.classList.add("scrolled");
  window.addEventListener("scroll", () =>
    navbar.classList.toggle("scrolled", window.scrollY > 20)
  );

  hamburger.addEventListener("click", () => {
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

  document.addEventListener("click", () => {
    userDD?.classList.remove("open");
    document.getElementById("searchResults")?.classList.remove("open");
  });

  document.querySelectorAll(".dropdown-toggle").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        btn.closest(".dropdown").classList.toggle("open");
      }
    });
  });
}

/* ══════════════════════════════════════════════
   SEARCH
══════════════════════════════════════════════ */
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
   GENRES DROPDOWN
══════════════════════════════════════════════ */
async function loadGenres() {
  const data = await tmdb("/genre/movie/list");
  if (!data) return;
  document.getElementById("genreList").innerHTML = data.genres.map((g) =>
    `<a href="index.html#popular" class="genre-item">${g.name}</a>`
  ).join("");
}

/* ══════════════════════════════════════════════
   HERO SECTION
══════════════════════════════════════════════ */
function renderHero(movie, credits) {
  document.title = `${movie.title} – ${ECLIPSE_CONFIG.APP_NAME}`;

  const director = credits?.crew?.find((c) => c.job === "Director");
  const inWL     = Storage.has("cineverse_watchlist", movie.id);
  const inFav    = Storage.has("cineverse_favorites", movie.id);
  const score    = movie.vote_average;

  // ── Backdrop ──
  const bdWrap = document.getElementById("detailBackdrop");
  if (movie.backdrop_path) {
    const img = document.createElement("img");
    img.src   = backdrop(movie.backdrop_path);
    img.alt   = movie.title;
    img.onload = () => bdWrap.classList.add("loaded");
    bdWrap.innerHTML = "";
    bdWrap.appendChild(img);
  } else {
    bdWrap.innerHTML = "";
  }

  // ── Poster ──
  document.getElementById("detailPoster").innerHTML =
    `<img src="${poster(movie.poster_path, ECLIPSE_CONFIG.POSTER_LG)}" alt="${movie.title}" loading="eager" />`;

  // ── Score Ring ──
  const circumference = 2 * Math.PI * 18;
  const scoreRing  = document.getElementById("detailScoreRing");
  const fillCircle = document.getElementById("scoreFillCircle");

  scoreRing.style.display = "flex";
  document.getElementById("scoreText").textContent = score.toFixed(1);

  fillCircle.style.strokeDasharray  = circumference;
  fillCircle.style.strokeDashoffset = circumference;
  requestAnimationFrame(() => setTimeout(() => {
    fillCircle.style.strokeDashoffset = circumference - (score / 10) * circumference;
  }, 100));
  fillCircle.classList.add(score >= 7 ? "high" : score >= 5 ? "mid" : "low");

  // ── Info ──
  const status  = movie.status === "Released" ? "Đã Chiếu" : (movie.status || "N/A");
  const lang    = (movie.original_language || "").toUpperCase();
  const runtime = formatRuntime(movie.runtime);

  document.getElementById("detailInfo").innerHTML = `
    <h1 class="detail-hero-title">${movie.title}</h1>
    ${movie.original_title && movie.original_title !== movie.title
      ? `<p class="detail-original-title">${movie.original_title}</p>` : ""}

    <div class="detail-badges">
      <span class="detail-badge badge-status">${status}</span>
      <span class="detail-badge badge-year">${year(movie.release_date)}</span>
      ${movie.runtime ? `<span class="detail-badge badge-runtime"><i class="fas fa-clock" style="margin-right:4px"></i>${runtime}</span>` : ""}
      <span class="detail-badge badge-lang">${lang}</span>
    </div>

    <div class="detail-rating-row">
      <div class="detail-tmdb-score">
        <div>
          <div class="tmdb-stars">${starRating(score)}</div>
          <div class="tmdb-vote-count">${movie.vote_count.toLocaleString()} đánh giá</div>
        </div>
        <div>
          <div class="tmdb-score-number">${score.toFixed(1)}</div>
          <div class="tmdb-score-label">TMDB<br>Score</div>
        </div>
      </div>
      ${movie.popularity ? `
        <div class="detail-divider"></div>
        <div class="detail-extra-scores">
          <div class="extra-score-item">
            <div class="extra-score-value">${Math.round(movie.popularity)}</div>
            <div class="extra-score-label">Popularity</div>
          </div>
        </div>` : ""}
    </div>

    ${director ? `
      <div class="detail-director-row">
        <div>
          <span class="director-label">Đạo Diễn</span>
          <span class="director-name">${director.name}</span>
        </div>
      </div>` : ""}

    <p class="detail-hero-overview">${movie.overview || "Chưa có mô tả tiếng Việt."}</p>

    <div class="detail-hero-actions">
      <button class="btn-primary" id="heroTrailerBtn" style="display:none;
        background:rgba(255,255,255,0.12);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.2)">
        <i class="fab fa-youtube"></i> Xem Trailer
      </button>
      <button class="btn-secondary" onclick="scrollToTab('overview')">
        <i class="fas fa-info-circle"></i> Chi Tiết
      </button>
      <button class="btn-icon ${inWL  ? "active-red"  : ""}" id="watchlistBtn"
        onclick="toggleWatchlist(${movie.id},'${escapeTitle(movie.title)}')" title="Xem Sau">
        <i class="fas fa-bookmark"></i>
      </button>
      <button class="btn-icon ${inFav ? "active-gold" : ""}" id="favoriteBtn"
        onclick="toggleFavorite(${movie.id},'${escapeTitle(movie.title)}')" title="Yêu thích">
        <i class="fas fa-heart"></i>
      </button>
      <button class="btn-icon" onclick="shareMovie()" title="Chia sẻ">
        <i class="fas fa-share-alt"></i>
      </button>
    </div>`;

  const infoEl = document.getElementById("detailInfo");
  Object.assign(infoEl.style, { opacity: "0", transform: "translateY(24px)", transition: "opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s" });
  requestAnimationFrame(() => Object.assign(infoEl.style, { opacity: "1", transform: "translateY(0)" }));
}

/* ══════════════════════════════════════════════
   TAB: OVERVIEW
══════════════════════════════════════════════ */
function renderOverview(movie) {
  const taglineEl = document.getElementById("detailTagline");
  if (movie.tagline) {
    taglineEl.textContent   = movie.tagline;
    taglineEl.style.display = "block";
  } else {
    taglineEl.style.display = "none";
  }

  document.getElementById("detailOverview").textContent =
    movie.overview || "Chưa có mô tả tiếng Việt.";

  const profit = (movie.revenue && movie.budget) ? movie.revenue - movie.budget : null;

  const statsRows = [
    ["Ngày Phát Hành", formatDate(movie.release_date)],
    ["Thời Lượng",     formatRuntime(movie.runtime)],
    ["Ngân Sách",      formatMoney(movie.budget)],
    ["Doanh Thu",      formatMoney(movie.revenue), "gold"],
    profit !== null
      ? ["Lợi Nhuận", formatMoney(Math.abs(profit)), profit > 0 ? "green" : "red"]
      : null,
    ["Ngôn Ngữ Gốc",  (movie.original_language || "").toUpperCase()],
    movie.imdb_id ? ["IMDb ID", movie.imdb_id] : null,
  ].filter(Boolean);

  document.getElementById("detailStats").innerHTML = statsRows.map(([label, value, cls = ""]) => `
    <li class="stat-item">
      <span class="stat-label">${label}</span>
      <span class="stat-value ${cls}">${value}</span>
    </li>`).join("");

  document.getElementById("detailGenres").innerHTML = movie.genres?.length
    ? movie.genres.map((g) => `<span class="genre-chip">${g.name}</span>`).join("")
    : `<span style="color:var(--grey);font-size:13px">Chưa có thể loại</span>`;

  const prodCard = document.getElementById("productionCard");
  if (movie.production_companies?.length) {
    prodCard.style.display = "block";
    document.getElementById("productionList").innerHTML =
      movie.production_companies.slice(0, 5).map((c) => `
        <div class="production-item">
          <div class="production-logo">
            ${c.logo_path
              ? `<img src="${imgUrl(c.logo_path, "w92")}" alt="${c.name}" />`
              : `<i class="fas fa-film logo-placeholder"></i>`}
          </div>
          <div>
            <div class="production-name">${c.name}</div>
            ${c.origin_country ? `<div class="production-country">${c.origin_country}</div>` : ""}
          </div>
        </div>`).join("");
  } else {
    prodCard.style.display = "none";
  }
}

/* ══════════════════════════════════════════════
   TRAILER
══════════════════════════════════════════════ */
function renderTrailer(videos) {
  const trailer = videos?.results?.find((v) => v.type === "Trailer" && v.site === "YouTube")
               || videos?.results?.find((v) => v.site === "YouTube");
  if (!trailer) return;

  const heroBtn = document.getElementById("heroTrailerBtn");
  if (heroBtn) {
    heroBtn.style.display = "inline-flex";
    heroBtn.onclick = () => {
      scrollToTab("overview");
      setTimeout(() => document.getElementById("trailerCard").scrollIntoView({ behavior: "smooth" }), 300);
    };
  }

  document.getElementById("trailerCard").style.display = "block";
  document.getElementById("trailerFrame").src =
    `https://www.youtube.com/embed/${trailer.key}?rel=0&modestbranding=1`;
}

/* ══════════════════════════════════════════════
   TAB: CAST & CREW
══════════════════════════════════════════════ */
function renderCast(credits) {
  if (!credits) return;

  const cast = credits.cast || [];
  const crew = credits.crew || [];
  const noImg = "https://via.placeholder.com/185x278/161616/888?text=N%2FA";

  const castCard = (a) => `
    <div class="cast-card">
      <div class="cast-photo">
        <img src="${profile(a.profile_path)}" alt="${a.name}" loading="lazy"
          onerror="this.src='${noImg}'" />
      </div>
      <div class="cast-name">${a.name}</div>
      <div class="cast-character">${a.character || ""}</div>
    </div>`;

  document.getElementById("castPreview").innerHTML = cast.length
    ? cast.slice(0, 6).map(castCard).join("")
    : `<p style="color:var(--grey);font-size:13px;grid-column:1/-1">Chưa có thông tin.</p>`;

  document.getElementById("castFullGrid").innerHTML = cast.length
    ? cast.slice(0, 30).map(castCard).join("")
    : `<p style="color:var(--grey);font-size:13px">Chưa có thông tin diễn viên.</p>`;

  const KEY_JOBS = ["Director", "Producer", "Executive Producer", "Screenplay", "Story",
                    "Director of Photography", "Original Music Composer", "Editor"];
  const filteredCrew = crew
    .filter((c) => KEY_JOBS.includes(c.job))
    .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id && x.job === c.job) === i)
    .slice(0, 18);

  document.getElementById("crewGrid").innerHTML = filteredCrew.length
    ? filteredCrew.map((c) => `
        <div class="crew-card">
          <img class="crew-photo" src="${profile(c.profile_path)}" alt="${c.name}" loading="lazy"
            onerror="this.src='${noImg}'" />
          <div class="crew-info">
            <div class="crew-name">${c.name}</div>
            <div class="crew-job">${c.job}</div>
          </div>
        </div>`).join("")
    : `<p style="color:var(--grey);font-size:13px">Chưa có thông tin đội ngũ.</p>`;
}

/* ══════════════════════════════════════════════
   KEYWORDS
══════════════════════════════════════════════ */
function renderKeywords(keywords) {
  const kws = keywords?.keywords || [];
  if (!kws.length) return;

  document.getElementById("keywordsCard").style.display = "block";
  document.getElementById("detailKeywords").innerHTML =
    kws.slice(0, 16).map((k) => `<span class="keyword-chip">${k.name}</span>`).join("");
}

/* ══════════════════════════════════════════════
   TAB: MEDIA
══════════════════════════════════════════════ */
function renderMedia(type = "backdrops") {
  const items   = state.images?.[type] || [];
  const grid    = document.getElementById("mediaGrid");
  const imgSize = type === "posters" ? "w342" : "w780";

  if (!items.length) {
    grid.innerHTML = `<p style="color:var(--grey);font-size:14px;padding:40px 0">Không có hình ảnh.</p>`;
    return;
  }

  state.lightbox.images = items.slice(0, 24).map((img) => imgUrl(img.file_path, "original"));

  grid.innerHTML = items.slice(0, 24).map((img, i) => `
    <div class="media-item" onclick="openLightbox(${i})">
      <img src="${imgUrl(img.file_path, imgSize)}" alt="Image ${i + 1}" loading="lazy" />
      <div class="media-overlay"><i class="fas fa-expand"></i></div>
    </div>`).join("");
}

document.getElementById("mediaFilter")?.addEventListener("click", (e) => {
  const tab = e.target.closest(".filter-tab");
  if (!tab) return;
  document.querySelectorAll("#mediaFilter .filter-tab").forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  state.mediaType = tab.dataset.media;
  renderMedia(state.mediaType);
});

/* ══════════════════════════════════════════════
   TAB: REVIEWS
══════════════════════════════════════════════ */
function renderReviews(reviews, movie) {
  const score = movie.vote_average;

  document.getElementById("scoreSummary").innerHTML = `
    <div class="score-big">${score.toFixed(1)}</div>
    <div class="score-stars-big">${starRating(score)}</div>
    <div class="score-votes">${movie.vote_count.toLocaleString()} lượt đánh giá</div>
    <div class="score-bars">
      ${[10,9,8,7,6,5,4,3,2,1].map((s) => `
        <div class="score-bar-row">
          <span class="score-bar-label">${s}</span>
          <div class="score-bar-track">
            <div class="score-bar-fill"
              style="width:${s <= Math.round(score) ? 100 - Math.abs(score - s) * 30 : 10}%">
            </div>
          </div>
        </div>`).join("")}
    </div>`;

  const results = reviews?.results || [];
  if (!results.length) {
    document.getElementById("reviewsList").innerHTML = `
      <div class="reviews-empty">
        <i class="fas fa-comment-slash"></i>
        Chưa có đánh giá nào cho bộ phim này.
      </div>`;
    return;
  }

  document.getElementById("reviewsList").innerHTML = results.slice(0, 10).map((r, idx) => {
    const rating = r.author_details?.rating || null;
    const isLong = (r.content || "").length > 400;

    return `
      <div class="review-card">
        <div class="review-header">
          <div class="reviewer-avatar">${(r.author || "?").slice(0, 2).toUpperCase()}</div>
          <div>
            <div class="reviewer-name">${r.author}</div>
            <div class="reviewer-meta"><i class="fas fa-calendar"></i> ${formatDate(r.created_at)}</div>
          </div>
          ${rating ? `<span class="reviewer-score">⭐ ${rating}/10</span>` : ""}
        </div>
        <div class="review-body ${isLong ? "collapsed" : ""}" id="review-body-${idx}">
          ${r.content || ""}
        </div>
        ${isLong
          ? `<div class="review-expand" onclick="toggleReview(${idx},this)">
               Đọc thêm <i class="fas fa-chevron-down"></i>
             </div>`
          : ""}
      </div>`;
  }).join("");
}

function toggleReview(idx, btn) {
  const body = document.getElementById(`review-body-${idx}`);
  body.classList.toggle("collapsed");
  btn.innerHTML = body.classList.contains("collapsed")
    ? `Đọc thêm <i class="fas fa-chevron-down"></i>`
    : `Thu gọn <i class="fas fa-chevron-up"></i>`;
}

/* ══════════════════════════════════════════════
   SIMILAR MOVIES
══════════════════════════════════════════════ */
function renderSimilar(similar) {
  const movies = similar?.results?.filter((m) => m.poster_path)?.slice(0, 12);
  if (!movies?.length) return;

  document.getElementById("similarSection").style.display = "block";
  const grid = document.getElementById("similarGrid");
  grid.innerHTML = movies.map((m) => `
    <div class="movie-card" onclick="location.href='detail.html?id=${m.id}'">
      <div class="movie-poster">
        <img src="${poster(m.poster_path)}" alt="${m.title}" loading="lazy" />
        <div class="movie-poster-overlay">
          <div class="play-btn"><i class="fas fa-play"></i></div>
        </div>
        <div class="movie-rating-badge">⭐ ${m.vote_average.toFixed(1)}</div>
      </div>
      <div class="movie-info">
        <p class="movie-title">${m.title}</p>
        <div class="movie-meta"><span class="movie-year">${year(m.release_date)}</span></div>
      </div>
    </div>`).join("");

  Array.from(grid.children).forEach((card, i) => {
    Object.assign(card.style, {
      opacity:    "0",
      transform:  "translateY(16px)",
      transition: `opacity 0.4s ease ${i * 0.05}s, transform 0.4s ease ${i * 0.05}s`,
    });
    setTimeout(() => Object.assign(card.style, { opacity: "1", transform: "translateY(0)" }), 100 + i * 50);
  });
}

/* ══════════════════════════════════════════════
   TABS SYSTEM
══════════════════════════════════════════════ */
function initTabs() {
  document.querySelectorAll(".detail-tab").forEach((btn) =>
    btn.addEventListener("click", () => switchTab(btn.dataset.tab))
  );
  document.querySelectorAll(".tab-switch-btn").forEach((btn) =>
    btn.addEventListener("click", () => btn.dataset.goto && scrollToTab(btn.dataset.goto))
  );
}

function switchTab(tabId) {
  document.querySelectorAll(".detail-tab").forEach((t)  => t.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach((p)    => p.classList.remove("active"));
  document.querySelector(`.detail-tab[data-tab="${tabId}"]`)?.classList.add("active");
  document.getElementById(`tab-${tabId}`)?.classList.add("active");

  if (tabId === "media" && !document.getElementById("mediaGrid").children.length) {
    renderMedia(state.mediaType);
  }
}

function scrollToTab(tabId) {
  switchTab(tabId);
  const bar = document.getElementById("detailTabsBar");
  window.scrollTo({
    top: bar.getBoundingClientRect().top + window.scrollY - 10,
    behavior: "smooth",
  });
}

/* ══════════════════════════════════════════════
   WATCHLIST & FAVORITES  (FIX #4)
   ─────────────────────────────────────────────
   Nút được disable trong 200ms sau khi bấm để:
   - Tránh double-click gây toggle 2 lần liên tiếp
   - Thể hiện phản hồi tức thì cho người dùng (opacity mờ)
══════════════════════════════════════════════ */

/**
 * [FIX #4] Helper: disable nút → chạy callback → re-enable
 * @param {HTMLElement} btn   - Nút cần lock
 * @param {Function}    fn    - Logic thực thi sau khi lock
 * @param {number}      delay - ms để giả lập "xử lý" (mặc định 200)
 */
function _withButtonLock(btn, fn, delay = 200) {
  if (!btn || btn.disabled) return; // đã đang lock → bỏ qua
  btn.disabled = true;
  btn.style.opacity = "0.5";
  btn.style.transform = "scale(0.92)";

  setTimeout(() => {
    fn(); // thực thi logic chính
    btn.disabled = false;
    btn.style.opacity = "";
    btn.style.transform = "";
  }, delay);
}

function toggleWatchlist(id, title) {
  const btn = document.getElementById("watchlistBtn");

  _withButtonLock(btn, () => {
    const added = Storage.toggle("cineverse_watchlist", id);
    state.watchlist = Storage.get("cineverse_watchlist");
    showToast(added ? `🔖 Đã thêm "${title}" vào xem sau` : `✖ Đã xóa "${title}" khỏi xem sau`);
    btn?.classList.toggle("active-red", added);
    btn && (btn.title = added ? "Bỏ xem sau" : "Xem Sau");
  });
}

function toggleFavorite(id, title) {
  const btn = document.getElementById("favoriteBtn");

  _withButtonLock(btn, () => {
    const added = Storage.toggle("cineverse_favorites", id);
    state.favorites = Storage.get("cineverse_favorites");
    showToast(added ? `❤️ Đã thêm "${title}" vào yêu thích` : `✖ Đã xóa "${title}" khỏi yêu thích`);
    btn?.classList.toggle("active-gold", added);
    btn && (btn.title = added ? "Bỏ yêu thích" : "Yêu thích");
  });
}

function shareMovie() {
  if (navigator.share) {
    navigator.share({ title: document.title, url: location.href }).catch(() => {});
  } else {
    navigator.clipboard.writeText(location.href).then(() => showToast("🔗 Đã sao chép link!"));
  }
}

/* ══════════════════════════════════════════════
   LIGHTBOX
══════════════════════════════════════════════ */
function openLightbox(index) {
  state.lightbox.index = index;
  document.getElementById("lightboxImg").src = state.lightbox.images[index] || "";
  document.getElementById("lightboxCounter").textContent =
    `${index + 1} / ${state.lightbox.images.length}`;
  document.getElementById("lightbox").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  document.getElementById("lightbox").classList.remove("open");
  document.body.style.overflow = "";
}

function lightboxNav(dir) {
  const total = state.lightbox.images.length;
  openLightbox((state.lightbox.index + dir + total) % total);
}

document.getElementById("lightboxClose")?.addEventListener("click", closeLightbox);
document.getElementById("lightboxPrev")?.addEventListener("click", () => lightboxNav(-1));
document.getElementById("lightboxNext")?.addEventListener("click", () => lightboxNav(1));
document.getElementById("lightbox")?.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeLightbox();
});

document.addEventListener("keydown", (e) => {
  if (!document.getElementById("lightbox")?.classList.contains("open")) return;
  if (e.key === "Escape")     closeLightbox();
  if (e.key === "ArrowLeft")  lightboxNav(-1);
  if (e.key === "ArrowRight") lightboxNav(1);
});

/* ══════════════════════════════════════════════
   BACK TO TOP
══════════════════════════════════════════════ */
function initBackToTop() {
  const btn = document.getElementById("backToTop");
  window.addEventListener("scroll", () => btn.classList.toggle("visible", scrollY > 500));
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* ══════════════════════════════════════════════
   ERROR STATE
══════════════════════════════════════════════ */
function showError() {
  document.getElementById("detailHero").innerHTML = `
    <div style="min-height:50vh;display:flex;flex-direction:column;align-items:center;
      justify-content:center;gap:16px;padding:80px 20px;text-align:center">
      <i class="fas fa-film" style="font-size:60px;color:var(--black4)"></i>
      <h2 style="font-family:var(--font-display);font-size:40px;color:var(--grey)">Không Tìm Thấy Phim</h2>
      <p style="color:var(--grey);font-size:14px">ID phim không hợp lệ hoặc không tồn tại.</p>
      <a href="index.html" class="btn-primary" style="margin-top:16px">
        <i class="fas fa-arrow-left"></i> Quay Lại Trang Chủ
      </a>
    </div>`;
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
async function init() {
  initNavbar();
  initSearch();
  initTabs();
  initBackToTop();
  loadGenres();

  const id = new URLSearchParams(location.search).get("id");
  if (!id) { showError(); return; }
  state.movieId = parseInt(id, 10);

  const [movie, credits, videos, images, reviews, similar, keywords] = await Promise.all([
    tmdb(`/movie/${id}`),
    tmdb(`/movie/${id}/credits`),
    tmdb(`/movie/${id}/videos`),
    tmdb(`/movie/${id}/images`, { include_image_language: "null,en" }),
    tmdb(`/movie/${id}/reviews`),
    tmdb(`/movie/${id}/similar`),
    tmdb(`/movie/${id}/keywords`),
  ]);

  if (!movie) { showError(); return; }

  state.movie   = movie;
  state.credits = credits;
  state.images  = images;

  renderHero(movie, credits);
  renderOverview(movie);
  renderTrailer(videos);
  renderCast(credits);
  renderKeywords(keywords);
  renderReviews(reviews, movie);
  renderSimilar(similar);
}

document.addEventListener("DOMContentLoaded", init);
