/* ══════════════════════════════════════════════
   ECLIPSE CINEMA — auth.js
   Quản lý đăng nhập, đăng ký, session người dùng
   Lưu trữ: localStorage (demo)
══════════════════════════════════════════════ */

const CinemaAuth = (() => {
  const USERS_KEY    = "cinema_users";      // Danh sách người dùng đã đăng ký
  const SESSION_KEY  = "cinema_session";    // Session hiện tại
  const REMEMBERED_KEY = "cinema_remembered"; // "Remember me" email

  /* ──────────────────────────────────────────
     PRIVATE HELPERS
  ────────────────────────────────────────── */

  /** Hash mật khẩu (demo — không an toàn thực tế) */
  function hashPassword(pwd) {
    let hash = 0;
    for (let i = 0; i < pwd.length; i++) {
      const char = pwd.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit
    }
    return "hash_" + Math.abs(hash).toString(36);
  }

  /** Validate email format */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  /** Lấy danh sách người dùng từ localStorage */
  function getAllUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  /** Lưu danh sách người dùng */
  function saveAllUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  /* ──────────────────────────────────────────
     PUBLIC API
  ────────────────────────────────────────── */

  return {
    /**
     * Đăng ký tài khoản mới
     * @param {string} firstName 
     * @param {string} lastName 
     * @param {string} email 
     * @param {string} password 
     * @returns {object} {success: bool, message: string}
     */
    register: function (firstName, lastName, email, password) {
      // Validate input
      if (!firstName?.trim()) {
        return { success: false, message: "Vui lòng nhập tên." };
      }
      if (!lastName?.trim()) {
        return { success: false, message: "Vui lòng nhập họ." };
      }
      if (!isValidEmail(email)) {
        return { success: false, message: "Email không hợp lệ." };
      }
      if (!password || password.length < 8) {
        return { success: false, message: "Mật khẩu tối thiểu 8 ký tự." };
      }

      // Check email already exists
      const users = getAllUsers();
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, message: "Email này đã được đăng ký." };
      }

      // Create new user
      const newUser = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase(),
        passwordHash: hashPassword(password),
        avatar: null,
        createdAt: new Date().toISOString(),
        watchlist: [],
        favorites: [],
      };

      users.push(newUser);
      saveAllUsers(users);

      return { success: true, message: "Đăng ký thành công!" };
    },

    /**
     * Đăng nhập
     * @param {string} email 
     * @param {string} password 
     * @param {boolean} rememberMe 
     * @returns {object} {success: bool, message: string}
     */
    login: function (email, password, rememberMe = false) {
      // Validate input
      if (!isValidEmail(email)) {
        return { success: false, message: "Email không hợp lệ." };
      }
      if (!password) {
        return { success: false, message: "Vui lòng nhập mật khẩu." };
      }

      // Find user
      const users = getAllUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        return { success: false, message: "Email không tồn tại." };
      }

      // Check password
      if (user.passwordHash !== hashPassword(password)) {
        return { success: false, message: "Mật khẩu không đúng." };
      }

      // Create session (exclude passwordHash)
      const { passwordHash, ...userInfo } = user;
      const session = {
        user: userInfo,
        loginTime: Date.now(),
        expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      // Remember email if checked
      if (rememberMe) {
        localStorage.setItem(REMEMBERED_KEY, JSON.stringify({ email }));
      } else {
        localStorage.removeItem(REMEMBERED_KEY);
      }

      return { success: true, message: "Đăng nhập thành công!" };
    },

    /**
     * Kiểm tra người dùng đã đăng nhập
     * @returns {boolean}
     */
    isLoggedIn: function () {
      try {
        const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        if (!session) return false;
        // Check session not expired
        if (session.expiresAt && Date.now() > session.expiresAt) {
          this.logout();
          return false;
        }
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Lấy thông tin session hiện tại
     * @returns {object|null}
     */
    getSession: function () {
      try {
        const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        if (!session) return null;
        if (session.expiresAt && Date.now() > session.expiresAt) {
          this.logout();
          return null;
        }
        return session;
      } catch {
        return null;
      }
    },

    /**
     * Lấy thông tin người dùng hiện tại
     * @returns {object|null}
     */
    getUser: function () {
      const session = this.getSession();
      return session?.user || null;
    },

    /**
     * Lấy email đã "Remember me"
     * @returns {object|null} {email: string}
     */
    getRemembered: function () {
      try {
        return JSON.parse(localStorage.getItem(REMEMBERED_KEY) || "null");
      } catch {
        return null;
      }
    },

    /**
     * Cập nhật thông tin người dùng
     * @param {object} updates - chỉ cập nhật firstName, lastName, avatar
     * @returns {object} {success: bool, message: string}
     */
    updateProfile: function (updates) {
      const session = this.getSession();
      if (!session) {
        return { success: false, message: "Chưa đăng nhập." };
      }

      const { firstName, lastName, avatar } = updates;

      // Validate
      if (firstName !== undefined && !firstName.trim()) {
        return { success: false, message: "Tên không được trống." };
      }
      if (lastName !== undefined && !lastName.trim()) {
        return { success: false, message: "Họ không được trống." };
      }

      // Update user
      const users = getAllUsers();
      const userIdx = users.findIndex(u => u.id === session.user.id);
      if (userIdx === -1) {
        return { success: false, message: "Không tìm thấy người dùng." };
      }

      if (firstName !== undefined) users[userIdx].firstName = firstName.trim();
      if (lastName !== undefined) users[userIdx].lastName = lastName.trim();
      if (avatar !== undefined) users[userIdx].avatar = avatar;

      saveAllUsers(users);

      // Update session
      const { passwordHash, ...userInfo } = users[userIdx];
      session.user = userInfo;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      return { success: true, message: "Cập nhật thành công!" };
    },

    /**
     * Đăng xuất
     */
    logout: function () {
      localStorage.removeItem(SESSION_KEY);
      return { success: true, message: "Đã đăng xuất." };
    },

    /**
     * Xóa tất cả session (reset app — dùng debug)
     */
    _resetAll: function () {
      localStorage.removeItem(USERS_KEY);
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(REMEMBERED_KEY);
      console.log("🔄 Auth data cleared");
    },

    /**
     * Xem danh sách tất cả người dùng (debug)
     */
    _getAllUsers: function () {
      return getAllUsers();
    },
  };
})();

// ─── Expose globally ───
window.CinemaAuth = CinemaAuth;

console.log("✓ CinemaAuth loaded");