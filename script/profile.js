/* ══════════════════════════════════════════════
   ECLIPSE CINEMA — profile.js  (FIXED)
   Trang hồ sơ: watchlist, favorites, chỉnh sửa thông tin
   Phụ thuộc: config.js → api.js → auth.js

   CHANGES:
   [Fix #3] Pagination: hiện 12 phim/lần, có nút "Tải thêm"
            → Giảm số request TMDB và tránh layout bị dồn dập
   [Fix #2] Storage user-aware xử lý ở config.js
══════════════════════════════════════════════ */

// ─── Alias ngắn ───────────────────────────────
const tmdb   = tmdbFetch;
const poster = posterUrl;
const year   = releaseYear;

/* ──────────────────────────────────────────────
   [FIX #3] PAGINATION CONFIG
────────────────────────────────────────────── */
const CARDS_PER_PAGE = 12; // Số phim hiển thị mỗi lần tải

/** State phân trang cho từng danh sách */
const listPage = {
  watchlist: 1,
  favorites: 1,
};

/** State: cache mảng ID */
const profileState = {
  watchlistIds: [],
  favoriteIds:  [],
};

/* ══════════════════════════════════════════════
   NAVBAR
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
}

/* ══════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════ */

/**
 * Khởi tạo authentication: kiểm tra đăng nhập, hiển thị profile hoặc redirect
 */
function initAuth() {
  console.log("[initAuth] Start...");

  if (!window.CinemaAuth) {
    console.error("[initAuth] CinemaAuth not found!");
    return;
  }

  const session = CinemaAuth.getSession();
  console.log("[initAuth] Session:", session);

  if (!session || !CinemaAuth.isLoggedIn()) {
    console.log("[initAuth] Not logged in");
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
    return;
  }

  console.log("[initAuth] User logged in, filling info...");

  const { firstName, lastName, email, createdAt, avatar, id } = session.user;
  const fullName  = `${firstName} ${lastName}`;
  const initials  = `${firstName[0]}${lastName[0]}`.toUpperCase();
  const avatarSrc = avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`;
  const joinedText = createdAt
    ? (() => { try { return new Date(createdAt).toLocaleDateString("vi-VN"); } catch { return createdAt; } })()
    : "Không rõ";

  document.getElementById("userAvatarBtn").innerHTML = `
    <div style="width:100%;height:100%;background:var(--red);display:grid;place-items:center;
      font-family:var(--font-cond);font-size:13px;font-weight:700;color:#fff;letter-spacing:1px">
      ${initials}
    </div>`;
  document.querySelector(".user-name").textContent  = fullName;
  document.querySelector(".user-email").textContent = email;

  document.querySelector(".logout-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    CinemaAuth.logout();
    showToast?.("Đã đăng xuất. Hẹn gặp lại!");
    setTimeout(() => (window.location.href = "login.html"), 1000);
  });

  const profileAvatar = document.getElementById("profileAvatar");
  if (profileAvatar) profileAvatar.src = avatarSrc;

  const profileName = document.getElementById("profileName");
  if (profileName) profileName.textContent = fullName;

  const profileEmail = document.getElementById("profileEmail");
  if (profileEmail) profileEmail.textContent = email;

  const profileBadge = document.getElementById("profileBadge");
  if (profileBadge) {
    const daysOld = createdAt ? Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    profileBadge.textContent = daysOld > 365 ? "Loyal Member" : daysOld > 30 ? "Active Member" : "Member";
  }

  const profileIdEl      = document.getElementById("profileId");
  const profileIdValueEl = document.getElementById("profileIdValue");
  if (profileIdEl && profileIdValueEl) {
    profileIdEl.style.display  = "inline-flex";
    profileIdValueEl.textContent = id ? id.substring(0, 12) : "N/A";
  }

  const editBtn = document.getElementById("editProfileBtn");
  if (editBtn) {
    editBtn.style.display = "inline-flex";
    editBtn.addEventListener("click", () => switchSection("settings"));
  }

  document.getElementById("infoEmail").textContent  = email;
  document.getElementById("infoName").textContent   = fullName;
  document.getElementById("infoJoined").textContent = joinedText;
  document.getElementById("infoId").textContent     = id ? id.substring(0, 20) + "..." : "N/A";
  document.getElementById("profileSince").innerHTML = `<i class="fas fa-clock"></i> Thành viên từ ${joinedText}`;

  document.getElementById("firstName").value  = firstName;
  document.getElementById("lastName").value   = lastName;
  document.getElementById("avatarUrl").value  = avatar || "";
}

/* ══════════════════════════════════════════════
   SEARCH
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
   TABS
══════════════════════════════════════════════ */
function initTabs() {
  document.querySelectorAll(".profile-tab").forEach((tab) =>
    tab.addEventListener("click", () => {
      switchSection(tab.dataset.section);
      history.replaceState(null, "", `#${tab.dataset.section}`);
    })
  );

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
   COLLECTIONS — tải watchlist & favorites
══════════════════════════════════════════════ */
async function loadCollections() {
  profileState.watchlistIds = Storage.get("cineverse_watchlist");
  profileState.favoriteIds  = Storage.get("cineverse_favorites");

  document.getElementById("statWatchlist").textContent = profileState.watchlistIds.length;
  document.getElementById("statFavorites").textContent = profileState.favoriteIds.length;

  const total = profileState.watchlistIds.length + profileState.favoriteIds.length;
  const statTotal = document.getElementById("statTotal");
  if (statTotal) statTotal.textContent = total;
  document.getElementById("profileStats").innerHTML = `<i class="fas fa-film"></i> ${total} phim`;

  // [FIX #3] Reset page counter khi tải lại
  listPage.watchlist = 1;
  listPage.favorites = 1;

  await Promise.all([loadList("watchlist", 1), loadList("favorites", 1)]);
}

/* ══════════════════════════════════════════════
   [FIX #3] LOAD LIST VỚI PAGINATION
   ─────────────────────────────────────────────
   - Hiện 12 phim đầu tiên ngay lập tức
   - Nút "Tải thêm" xuất hiện nếu còn phim
   - Mỗi lần bấm: gọi TMDB cho 12 phim tiếp theo
   - Nút tự ẩn khi đã hết phim
══════════════════════════════════════════════ */
async function loadList(type, page = 1) {
  const ids     = type === "watchlist" ? profileState.watchlistIds : profileState.favoriteIds;
  const gridId  = type === "watchlist" ? "watchlistGrid"           : "favoritesGrid";
  const emptyId = type === "watchlist" ? "watchlistEmpty"          : "favoritesEmpty";
  const moreBtnId = `${type}-load-more`;

  const grid  = document.getElementById(gridId);
  const empty = document.getElementById(emptyId);
  if (!grid || !empty) return;

  // ── Trường hợp danh sách trống ──
  if (!ids.length) {
    empty.style.display = "block";
    grid.innerHTML = "";
    document.getElementById(moreBtnId)?.remove();
    return;
  }

  empty.style.display = "none";

  // ── Cắt ID theo page ──
  const start   = (page - 1) * CARDS_PER_PAGE;
  const end     = page * CARDS_PER_PAGE;
  const pageIds = ids.slice(start, end);
  const hasMore = end < ids.length; // Còn phim sau trang này?

  // ── Skeleton chỉ ở trang đầu ──
  if (page === 1) {
    grid.innerHTML = Array(pageIds.length)
      .fill('<div class="skeleton skeleton-card"></div>')
      .join("");
  } else {
    // Xóa nút "Tải thêm" cũ trước khi append cards mới
    document.getElementById(moreBtnId)?.remove();

    // Thêm skeleton cho batch mới ở cuối
    const skeletonWrap = document.createElement("div");
    skeletonWrap.id = `${moreBtnId}-skeleton`;
    skeletonWrap.style.cssText = "display:contents";
    skeletonWrap.innerHTML = Array(pageIds.length)
      .fill('<div class="skeleton skeleton-card"></div>')
      .join("");
    grid.appendChild(skeletonWrap);
  }

  try {
    // Gọi API song song chỉ cho trang hiện tại
    const movies = await Promise.all(pageIds.map((id) => tmdb(`/movie/${id}`)));
    const cards  = _renderMovieCards(movies.filter(Boolean));

    if (page === 1) {
      grid.innerHTML = cards;
    } else {
      // Xóa skeleton batch vừa thêm
      document.getElementById(`${moreBtnId}-skeleton`)?.remove();
      grid.insertAdjacentHTML("beforeend", cards);
    }

    // Stagger animation cho batch mới
    const allCards = Array.from(grid.querySelectorAll(".movie-card"));
    const batchStart = (page - 1) * CARDS_PER_PAGE;
    allCards.slice(batchStart).forEach((card, i) => {
      Object.assign(card.style, {
        opacity:    "0",
        transform:  "translateY(16px)",
        transition: `opacity 0.35s ease ${i * 0.04}s, transform 0.35s ease ${i * 0.04}s`,
      });
      setTimeout(() => Object.assign(card.style, { opacity: "1", transform: "translateY(0)" }), 50 + i * 40);
    });

    // ── Nút "Tải thêm" ──
    _renderLoadMoreBtn(type, moreBtnId, hasMore, page, grid);

  } catch (err) {
    console.error(`[Profile] Lỗi tải ${type}:`, err);
    document.getElementById(`${moreBtnId}-skeleton`)?.remove();

    if (page === 1) {
      grid.innerHTML = `<p style="color:var(--grey);font-size:13px;padding:16px 0">Không thể tải danh sách phim.</p>`;
    } else {
      grid.insertAdjacentHTML("beforeend",
        `<p style="color:var(--grey);font-size:13px;grid-column:1/-1;padding:8px 0;text-align:center">
           Lỗi tải trang ${page}. <a href="#" onclick="loadList('${type}',${page});return false" style="color:var(--red)">Thử lại</a>
         </p>`
      );
    }
  }
}

/**
 * [FIX #3] Tạo hoặc xóa nút "Tải thêm" bên dưới grid
 * Nút được đặt ngoài grid (insertAdjacentElement) để không ảnh hưởng CSS grid
 */
function _renderLoadMoreBtn(type, moreBtnId, hasMore, currentPage, grid) {
  // Xóa nút cũ (nếu có)
  document.getElementById(moreBtnId)?.remove();

  if (!hasMore) return; // Đã hết phim → không hiện nút

  const remaining = (type === "watchlist" ? profileState.watchlistIds : profileState.favoriteIds).length
                    - currentPage * CARDS_PER_PAGE;

  const btn = document.createElement("button");
  btn.id        = moreBtnId;
  btn.className = "btn-secondary";
  btn.innerHTML = `<i class="fas fa-plus"></i> Tải thêm <span style="color:var(--grey);font-size:12px;margin-left:4px">(còn ${remaining} phim)</span>`;

  Object.assign(btn.style, {
    display:       "flex",
    alignItems:    "center",
    gap:           "8px",
    margin:        "20px auto 0",
    padding:       "12px 28px",
    cursor:        "pointer",
  });

  btn.onclick = async () => {
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang tải...`;
    listPage[type]++;
    await loadList(type, listPage[type]);
  };

  // Đặt ngay sau grid
  grid.insertAdjacentElement("afterend", btn);
}

/** Tạo HTML cards (dùng nội bộ) */
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
   PROFILE FORM
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
    if (result.success) initAuth();
  });
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
async function init() {
  console.log("=== PROFILE PAGE INIT ===");
  console.log("CinemaAuth available?", !!window.CinemaAuth);

  const rawSession = localStorage.getItem("cinema_session");
  console.log("Raw localStorage session:", rawSession ? "EXISTS" : "NOT FOUND");
  if (rawSession) {
    try {
      const session = JSON.parse(rawSession);
      console.log("Parsed session user:", session.user?.firstName, session.user?.email);
    } catch (e) {
      console.error("Session parse error:", e);
    }
  }

  initNavbar();
  initSearch();
  initAuth();
  initTabs();
  initProfileForm();
  await loadCollections();

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      console.log("[Profile] Tab visible, rechecking...");
      initAuth();
      loadCollections();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
