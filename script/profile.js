/* ══════════════════════════════════════════════
   ECLIPSE CINEMA — profile.js
   Trang hồ sơ: watchlist, favorites, chỉnh sửa thông tin
   Phụ thuộc: config.js → api.js → auth.js
══════════════════════════════════════════════ */

// ─── Alias ngắn ───────────────────────────────
const tmdb   = tmdbFetch;
const poster = posterUrl;
const year   = releaseYear;

/** State: lưu cache mảng ID để tính tổng */
const profileState = {
  watchlistIds: [],
  favoriteIds:  [],
};

/* ══════════════════════════════════════════════
   NAVBAR — scroll effect + hamburger + user dropdown
══════════════════════════════════════════════ */
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

  hamburger?.addEventListener("click", () => {
    navLinks.classList.toggle("open");
    const open = navLinks.classList.contains("open");
    hamburger.querySelectorAll("span").forEach((s, i) => {
      s.style.transform = open
        ? ["translateY(7px) rotate(45deg)", "", "translateY(-7px) rotate(-45deg)"][i]
        : "";
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
}

/* ══════════════════════════════════════════════
   AUTH — kiểm tra đăng nhập, hiển thị thông tin user
══════════════════════════════════════════════ */
function initAuth() {
  if (!window.CinemaAuth) return;
  const session = CinemaAuth.getSession();

  // ── Chưa đăng nhập → hiện banner yêu cầu đăng nhập ──
  if (!session || !CinemaAuth.isLoggedIn()) {
    const hero    = document.getElementById("profileHero");
    const content = document.querySelector(".profile-content");

    if (hero) {
      hero.innerHTML = `
        <div class="profile-card" style="justify-content:space-between;gap:18px;">
          <div style="display:flex;align-items:center;gap:16px;">
            <div class="profile-avatar-wrap">
              <img src="https://api.dicebear.com/7.x/initials/svg?seed=Guest" alt="Guest" />
            </div>
            <div class="profile-main">
              <h1 class="profile-name">Bạn chưa đăng nhập</h1>
              <p class="profile-email">Đăng nhập để xem watchlist, yêu thích và chỉnh sửa hồ sơ.</p>
            </div>
          </div>
          <div class="profile-actions">
            <a href="login.html" class="btn-primary">
              <i class="fas fa-sign-in-alt"></i> Đăng Nhập
            </a>
          </div>
        </div>`;
    }
    if (content) content.innerHTML = "";
    showToast?.("Vui lòng đăng nhập để truy cập hồ sơ.");
    return;
  }

  // ── Đã đăng nhập → điền thông tin ──
  const { firstName, lastName, email, createdAt, avatar } = session.user;
  const fullName    = `${firstName} ${lastName}`;
  const initials    = `${firstName[0]}${lastName[0]}`.toUpperCase();
  const avatarSrc   = avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`;
  const joinedText  = createdAt
    ? (() => { try { return new Date(createdAt).toLocaleDateString("vi-VN"); } catch { return createdAt; } })()
    : "Không rõ";

  // Navbar avatar → initials
  document.getElementById("userAvatarBtn").innerHTML = `
    <div style="width:100%;height:100%;background:var(--red);display:grid;place-items:center;
      font-family:var(--font-cond);font-size:13px;font-weight:700;color:#fff;letter-spacing:1px">
      ${initials}
    </div>`;
  document.querySelector(".user-name").textContent  = fullName;
  document.querySelector(".user-email").textContent = email;

  // Logout
  document.querySelector(".logout-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    CinemaAuth.logout();
    showToast?.("Đã đăng xuất. Hẹn gặp lại!");
    setTimeout(() => (window.location.href = "login.html"), 1000);
  });

  // Profile hero section
  document.getElementById("profileAvatar").src         = avatarSrc;
  document.getElementById("profileName").textContent    = fullName;
  document.getElementById("profileEmail").textContent   = email;
  document.getElementById("infoEmail").textContent      = email;
  document.getElementById("infoName").textContent       = fullName;
  document.getElementById("infoJoined").textContent     = joinedText;
  document.getElementById("profileSince").innerHTML     = `<i class="fas fa-clock"></i> Thành viên từ ${joinedText}`;

  // Pre-fill settings form
  document.getElementById("firstName").value   = firstName;
  document.getElementById("lastName").value    = lastName;
  document.getElementById("avatarUrl").value   = avatar || "";
}

/* ══════════════════════════════════════════════
   SEARCH — inline dropdown với debounce
══════════════════════════════════════════════ */
function initSearch() {
  const btn     = document.getElementById("searchBtn");
  const input   = document.getElementById("searchInput");
  const results = document.getElementById("searchResults");
  if (!btn || !input || !results) return;

  let timer;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    input.classList.toggle("open");
    if (input.classList.contains("open")) input.focus();
  });

  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (!q) { results.classList.remove("open"); results.innerHTML = ""; return; }
    timer = setTimeout(() => _doSearch(q), 400);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = input.value.trim();
      if (q) window.location.href = `search.html?q=${encodeURIComponent(q)}`;
    }
  });

  input.addEventListener("click",   (e) => e.stopPropagation());
  results.addEventListener("click", (e) => e.stopPropagation());
}

async function _doSearch(query) {
  const results = document.getElementById("searchResults");
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
   TABS — chuyển giữa Overview / Watchlist / Favorites / Settings
   Hỗ trợ URL hash (#watchlist, #favorites, v.v.)
══════════════════════════════════════════════ */
function initTabs() {
  document.querySelectorAll(".profile-tab").forEach((tab) =>
    tab.addEventListener("click", () => {
      switchSection(tab.dataset.section);
      history.replaceState(null, "", `#${tab.dataset.section}`);
    })
  );

  // Đọc hash từ URL khi load (vd: profile.html#favorites)
  const hash = location.hash.replace("#", "");
  if (hash) switchSection(hash);
}

function switchSection(sectionId) {
  document.querySelectorAll(".profile-tab").forEach((t)    => t.classList.remove("active"));
  document.querySelectorAll(".profile-section").forEach((s) => s.classList.remove("active"));
  document.querySelector(`#section-${sectionId}`)?.classList.add("active");
  document.querySelector(`.profile-tab[data-section="${sectionId}"]`)?.classList.add("active");
}

/* ══════════════════════════════════════════════
   COLLECTIONS — tải watchlist & favorites từ localStorage
══════════════════════════════════════════════ */
async function loadCollections() {
  profileState.watchlistIds = Storage.get("cineverse_watchlist");
  profileState.favoriteIds  = Storage.get("cineverse_favorites");

  // Cập nhật số lượng stats
  document.getElementById("statWatchlist").textContent = profileState.watchlistIds.length;
  document.getElementById("statFavorites").textContent = profileState.favoriteIds.length;

  const total = profileState.watchlistIds.length + profileState.favoriteIds.length;
  document.getElementById("profileStats").innerHTML =
    `<i class="fas fa-film"></i> ${total} phim trong thư viện`;

  // Tải song song cả hai danh sách
  await Promise.all([loadList("watchlist"), loadList("favorites")]);
}

/**
 * Tải chi tiết phim cho một danh sách (watchlist hoặc favorites).
 * Gọi TMDB song song cho tất cả ID bằng Promise.all.
 */
async function loadList(type) {
  const ids    = type === "watchlist" ? profileState.watchlistIds : profileState.favoriteIds;
  const gridId = type === "watchlist" ? "watchlistGrid"           : "favoritesGrid";
  const emptyId = type === "watchlist" ? "watchlistEmpty"         : "favoritesEmpty";

  const grid  = document.getElementById(gridId);
  const empty = document.getElementById(emptyId);
  if (!grid || !empty) return;

  // Danh sách trống
  if (!ids.length) {
    empty.style.display = "block";
    grid.innerHTML = "";
    return;
  }

  // Hiện skeleton trong lúc tải
  empty.style.display = "none";
  grid.innerHTML = Array(ids.length)
    .fill('<div class="skeleton skeleton-card"></div>')
    .join("");

  try {
    // Gọi API song song
    const movies = await Promise.all(ids.map((id) => tmdb(`/movie/${id}`)));
    grid.innerHTML = _renderMovieCards(movies.filter(Boolean));
  } catch {
    grid.innerHTML = `<p style="color:var(--grey);font-size:13px;padding:16px 0">Không thể tải danh sách phim.</p>`;
  }
}

/** Tạo HTML cho lưới movie cards */
function _renderMovieCards(movies) {
  return movies
    .filter((m) => m?.id)
    .map((m) => `
      <div class="movie-card" onclick="location.href='detail.html?id=${m.id}'">
        <div class="movie-poster">
          <img src="${poster(m.poster_path)}" alt="${m.title}" loading="lazy" />
          <div class="movie-poster-overlay">
            <div class="play-btn"><i class="fas fa-play"></i></div>
          </div>
          <div class="movie-rating-badge">⭐ ${m.vote_average?.toFixed(1) ?? "N/A"}</div>
        </div>
        <div class="movie-info">
          <p class="movie-title">${m.title}</p>
          <div class="movie-meta">
            <span class="movie-year">${year(m.release_date)}</span>
          </div>
        </div>
      </div>`)
    .join("");
}

/* ══════════════════════════════════════════════
   PROFILE FORM — lưu thay đổi firstName/lastName/avatar
══════════════════════════════════════════════ */
function initProfileForm() {
  const form = document.getElementById("profileForm");
  if (!form || !window.CinemaAuth) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const result = CinemaAuth.updateProfile({
      firstName: document.getElementById("firstName").value.trim(),
      lastName:  document.getElementById("lastName").value.trim(),
      avatar:    document.getElementById("avatarUrl").value.trim(),
    });

    showToast?.(result.message);

    // Nếu thành công → cập nhật lại giao diện ngay
    if (result.success) initAuth();
  });
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
async function init() {
  initNavbar();
  initSearch();
  initAuth();
  initTabs();
  initProfileForm();
  await loadCollections();
}

document.addEventListener("DOMContentLoaded", init);