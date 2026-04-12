/* ══════════════════════════════════════════════
   ECLIPSE CINEMA — login.js
   Xử lý UI trang đăng nhập / đăng ký
   Phụ thuộc: auth.js (CinemaAuth global)
══════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ──────────────────────────────────────────
     ELEMENT REFS
  ────────────────────────────────────────── */
  const wrapper      = document.getElementById("panelsWrapper");
  const toRegister   = document.getElementById("toRegister");
  const toLogin      = document.getElementById("toLogin");
  const decoSwitch   = document.getElementById("decoSwitch");
  const decoMsg      = document.getElementById("decoMsg");
  const loginForm    = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const toggleLoginPw = document.getElementById("toggleLoginPw");
  const toggleRegPw   = document.getElementById("toggleRegPw");
  const loginPassword = document.getElementById("loginPassword");
  const regPassword   = document.getElementById("regPassword");
  const pwBar         = document.getElementById("pwBar");

  /* ──────────────────────────────────────────
     STATE
  ────────────────────────────────────────── */
  let isRegister = false; // Panel hiện tại: false=login, true=register

  /* ──────────────────────────────────────────
     AUTO-REDIRECT & REMEMBER ME
  ────────────────────────────────────────── */

  // Nếu đã đăng nhập → chào mừng (có thể uncomment redirect)
  if (window.CinemaAuth?.isLoggedIn()) {
    const { user } = CinemaAuth.getSession();
    showToast(`Chào mừng trở lại, ${user.firstName}! 🎬`, "success");
    // window.location.href = "index.html";
  }

  // Điền sẵn email nếu đã bật "Remember me"
  const remembered = window.CinemaAuth?.getRemembered();
  if (remembered?.email) {
    document.getElementById("loginEmail").value = remembered.email;
    document.getElementById("rememberMe").checked = true;
  }

  /* ──────────────────────────────────────────
     PANEL SWITCHING
     Slide giữa Login ↔ Register + cập nhật deco strip
  ────────────────────────────────────────── */

  /**
   * Chuyển sang panel đăng ký
   */
  function showRegister() {
    if (isRegister) return;
    isRegister = true;
    wrapper.classList.add("show-register");
    document.title = "Eclipse Cinema — Create Account";
    _updateDecoMsg(/* isRegister */ true);
  }

  /**
   * Chuyển sang panel đăng nhập
   */
  function showLogin() {
    if (!isRegister) return;
    isRegister = false;
    wrapper.classList.remove("show-register");
    document.title = "Eclipse Cinema — Sign In";
    _updateDecoMsg(/* isRegister */ false);
  }

  /** Cập nhật nội dung dải deco bên phải */
  function _updateDecoMsg(onRegisterPanel) {
    decoMsg.innerHTML = onRegisterPanel
      ? `<p>Come Back!</p>
         <small>Sign in to continue enjoying Eclipse Cinema</small>
         <button type="button" class="btn-outline" id="decoSwitch">Sign In</button>`
      : `<p>New here?</p>
         <small>Join millions of film lovers on Eclipse Cinema</small>
         <button type="button" class="btn-outline" id="decoSwitch">Get Started</button>`;

    // Re-bind vì innerHTML thay mới
    document.getElementById("decoSwitch").addEventListener("click",
      onRegisterPanel ? showLogin : showRegister
    );
  }

  toRegister.addEventListener("click", showRegister);
  toLogin.addEventListener("click", showLogin);
  decoSwitch.addEventListener("click", showRegister);

  /* ──────────────────────────────────────────
     PASSWORD VISIBILITY TOGGLE
  ────────────────────────────────────────── */

  const EYE_OPEN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`;

  const EYE_CLOSED = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94
             M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19
             m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>`;

  function makePasswordToggle(btn, input) {
    btn.addEventListener("click", () => {
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.innerHTML = isHidden ? EYE_CLOSED : EYE_OPEN;
    });
  }

  makePasswordToggle(toggleLoginPw, loginPassword);
  makePasswordToggle(toggleRegPw, regPassword);

  /* ──────────────────────────────────────────
     PASSWORD STRENGTH INDICATOR
     4 tiêu chí: độ dài, chữ hoa, số, ký tự đặc biệt
  ────────────────────────────────────────── */
  regPassword.addEventListener("input", () => {
    const val = regPassword.value;
    let score = 0;
    if (val.length >= 8)           score++;
    if (/[A-Z]/.test(val))         score++;
    if (/[0-9]/.test(val))         score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    pwBar.className = val.length > 0 ? `pw-bar strength-${score}` : "pw-bar";
  });

  /* ──────────────────────────────────────────
     VALIDATION HELPERS
  ────────────────────────────────────────── */

  /** Bật/tắt class lỗi trên form-field wrapper */
  function setError(input, hasError) {
    input.closest(".form-field").classList.toggle("has-error", hasError);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  /* ──────────────────────────────────────────
     TOAST (local — trang login không dùng #toast element)
  ────────────────────────────────────────── */
  function showToast(message, type = "success") {
    document.querySelector(".cinema-toast")?.remove();

    const toast = Object.assign(document.createElement("div"), {
      className: `cinema-toast cinema-toast--${type}`,
      textContent: message,
    });

    Object.assign(toast.style, {
      position:     "fixed",
      bottom:       "32px",
      left:         "50%",
      transform:    "translateX(-50%) translateY(20px)",
      background:   type === "success" ? "rgba(20,20,20,0.95)" : "rgba(180,10,20,0.95)",
      color:        "#fff",
      padding:      "14px 28px",
      borderRadius: "50px",
      fontSize:     "0.9rem",
      fontFamily:   "'DM Sans', sans-serif",
      fontWeight:   "500",
      boxShadow:    "0 8px 32px rgba(0,0,0,0.5)",
      border:       `1px solid ${type === "success" ? "rgba(255,255,255,0.12)" : "rgba(229,9,20,0.4)"}`,
      zIndex:       "9999",
      opacity:      "0",
      transition:   "opacity 0.3s ease, transform 0.3s ease",
      whiteSpace:   "nowrap",
    });

    document.body.appendChild(toast);

    // Animate in (cần 2 rAF để transition hoạt động)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      toast.style.opacity   = "1";
      toast.style.transform = "translateX(-50%) translateY(0)";
    }));

    // Animate out & remove sau 3.2s
    setTimeout(() => {
      toast.style.opacity   = "0";
      toast.style.transform = "translateX(-50%) translateY(10px)";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  /* ──────────────────────────────────────────
     FORM ERROR (hiện thông báo lỗi server trong form)
  ────────────────────────────────────────── */

  function showFormError(form, message) {
    let errEl = form.querySelector(".server-error");
    if (!errEl) {
      errEl = Object.assign(document.createElement("p"), { className: "server-error" });
      Object.assign(errEl.style, {
        color:      "#e50914",
        fontSize:   "0.82rem",
        textAlign:  "center",
        marginTop:  "-8px",
      });
      form.querySelector(".btn-primary").before(errEl);
    }
    errEl.textContent = `⚠ ${message}`;
  }

  function clearFormError(form) {
    form.querySelector(".server-error")?.remove();
  }

  /* ──────────────────────────────────────────
     SUBMIT HELPER
     Dùng chung cho cả login & register:
     disable button → giả lập delay → gọi callback
  ────────────────────────────────────────── */
  function simulateLoading(form, loadingLabel, callback) {
    const btn = form.querySelector(".btn-primary");
    const span = btn.querySelector("span");
    const original = span.textContent;

    btn.classList.add("loading");
    span.textContent = loadingLabel;

    setTimeout(() => {
      btn.classList.remove("loading");
      span.textContent = original;
      callback();
    }, 1000);
  }

  /* ──────────────────────────────────────────
     LOGIN FORM
  ────────────────────────────────────────── */
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    clearFormError(loginForm);

    const emailInput    = document.getElementById("loginEmail");
    const passInput     = document.getElementById("loginPassword");
    const rememberCheck = document.getElementById("rememberMe");

    // Validate
    const emailOk = isValidEmail(emailInput.value);
    const passOk  = passInput.value.trim() !== "";
    setError(emailInput, !emailOk);
    setError(passInput,  !passOk);
    if (!emailOk || !passOk) return;

    simulateLoading(loginForm, "Signing in", () => {
      if (!window.CinemaAuth) {
        // Không có auth module → redirect luôn (fallback)
        showToast("Đăng nhập thành công! 🎬", "success");
        setTimeout(() => (window.location.href = "index.html"), 1200);
        return;
      }

      const result = CinemaAuth.login(
        emailInput.value,
        passInput.value,
        rememberCheck.checked
      );

      if (result.success) {
        const user = CinemaAuth.getUser();
        showToast(`Chào mừng, ${user.firstName}! 🎬`, "success");
        setTimeout(() => (window.location.href = "profile.html"), 1200);
      } else {
        showFormError(loginForm, result.message);
        showToast(result.message, "error");
      }
    });
  });

  // Xóa lỗi khi user bắt đầu gõ lại
  loginForm.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      setError(input, false);
      clearFormError(loginForm);
    });
  });

  /* ──────────────────────────────────────────
     REGISTER FORM
  ────────────────────────────────────────── */
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    clearFormError(registerForm);

    const firstName = document.getElementById("regFirstName");
    const lastName  = document.getElementById("regLastName");
    const email     = document.getElementById("regEmail");
    const pass      = document.getElementById("regPassword");

    // Validate từng field
    const validations = [
      [firstName, firstName.value.trim() !== ""],
      [lastName,  lastName.value.trim() !== ""],
      [email,     isValidEmail(email.value)],
      [pass,      pass.value.length >= 8],
    ];
    let valid = true;
    for (const [input, ok] of validations) {
      setError(input, !ok);
      if (!ok) valid = false;
    }
    if (!valid) return;

    simulateLoading(registerForm, "Creating account", () => {
      if (!window.CinemaAuth) {
        showToast("Tài khoản đã được tạo! 🎬", "success");
        setTimeout(() => {
          registerForm.reset();
          pwBar.className = "pw-bar";
          showLogin();
        }, 1200);
        return;
      }

      const result = CinemaAuth.register(
        firstName.value,
        lastName.value,
        email.value,
        pass.value
      );

      if (result.success) {
        showToast(`Chào mừng! Tài khoản đã được tạo 🎬`, "success");
        setTimeout(() => {
          registerForm.reset();
          pwBar.className = "pw-bar";
          showLogin();
        }, 1200);
      } else {
        showFormError(registerForm, result.message);
        showToast(result.message, "error");
      }
    });
  });

  registerForm.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      setError(input, false);
      clearFormError(registerForm);
    });
  });

  /* ──────────────────────────────────────────
     ENTRANCE ANIMATION
  ────────────────────────────────────────── */
  const container = document.querySelector(".auth-container");
  Object.assign(container.style, { opacity: "0", transform: "translateY(16px)" });
  requestAnimationFrame(() => {
    container.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    container.style.opacity    = "1";
    container.style.transform  = "translateY(0)";
  });

})();