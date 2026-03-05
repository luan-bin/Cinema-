/* ===========================
   ECLIPSE CINEMA — login.js
   Tích hợp với auth-storage.js
   =========================== */

(function () {
  'use strict';

  // ── Element refs ──
  const wrapper      = document.getElementById('panelsWrapper');
  const toRegister   = document.getElementById('toRegister');
  const toLogin      = document.getElementById('toLogin');
  const decoSwitch   = document.getElementById('decoSwitch');
  const decoMsg      = document.getElementById('decoMsg');
  const loginForm    = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  // Password toggles
  const toggleLoginPw = document.getElementById('toggleLoginPw');
  const toggleRegPw   = document.getElementById('toggleRegPw');
  const loginPassword = document.getElementById('loginPassword');
  const regPassword   = document.getElementById('regPassword');

  // Strength bar
  const pwBar = document.getElementById('pwBar');

  // ── State ──
  let isRegister = false;

  // ── Nếu đã đăng nhập → redirect ──
  if (window.CinemaAuth && CinemaAuth.isLoggedIn()) {
    const session = CinemaAuth.getSession();
    showToast(`Chào mừng trở lại, ${session.user.firstName}! 🎬`, 'success');
    // Uncomment dòng dưới để redirect thực tế:
    // window.location.href = 'dashboard.html';
  }

  // ── Điền sẵn email nếu "Remember me" ──
  if (window.CinemaAuth) {
    const remembered = CinemaAuth.getRemembered();
    if (remembered?.email) {
      const emailInput = document.getElementById('loginEmail');
      emailInput.value = remembered.email;
      document.getElementById('rememberMe').checked = true;
    }
  }

  // ── Switch panels ──
  function showRegister() {
    if (isRegister) return;
    isRegister = true;
    wrapper.classList.add('show-register');
    decoMsg.innerHTML = `
      <p>Come Back!</p>
      <small>Sign in to continue enjoying Eclipse Cinema</small>
      <button type="button" class="btn-outline" id="decoSwitch">Sign In</button>
    `;
    document.getElementById('decoSwitch').addEventListener('click', showLogin);
    document.title = 'Eclipse Cinema — Create Account';
  }

  function showLogin() {
    if (!isRegister) return;
    isRegister = false;
    wrapper.classList.remove('show-register');
    decoMsg.innerHTML = `
      <p>New here?</p>
      <small>Join millions of film lovers on Eclipse Cinema</small>
      <button type="button" class="btn-outline" id="decoSwitch">Get Started</button>
    `;
    document.getElementById('decoSwitch').addEventListener('click', showRegister);
    document.title = 'Eclipse Cinema — Sign In';
  }

  toRegister.addEventListener('click', showRegister);
  toLogin.addEventListener('click', showLogin);
  decoSwitch.addEventListener('click', showRegister);

  // ── Password visibility toggle ──
  function makeToggle(btn, input) {
    btn.addEventListener('click', () => {
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.innerHTML = isHidden
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94
                      M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19
                      m-6.72-1.07a3 3 0 11-4.24-4.24"/>
             <line x1="1" y1="1" x2="23" y2="23"/>
           </svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
             <circle cx="12" cy="12" r="3"/>
           </svg>`;
    });
  }
  makeToggle(toggleLoginPw, loginPassword);
  makeToggle(toggleRegPw, regPassword);

  // ── Password strength ──
  regPassword.addEventListener('input', () => {
    const val = regPassword.value;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    pwBar.className = 'pw-bar';
    if (val.length > 0) pwBar.classList.add('strength-' + score);
  });

  // ── Validation helpers ──
  function setError(fieldInput, show) {
    fieldInput.closest('.form-field').classList.toggle('has-error', show);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  // ── Toast notification ──
  function showToast(message, type = 'success') {
    // Xóa toast cũ nếu có
    document.querySelector('.cinema-toast')?.remove();

    const toast = document.createElement('div');
    toast.className = 'cinema-toast cinema-toast--' + type;
    toast.textContent = message;

    const styles = {
      position: 'fixed',
      bottom: '32px',
      left: '50%',
      transform: 'translateX(-50%) translateY(20px)',
      background: type === 'success'
        ? 'rgba(20, 20, 20, 0.95)'
        : 'rgba(180, 10, 20, 0.95)',
      color: '#fff',
      padding: '14px 28px',
      borderRadius: '50px',
      fontSize: '0.9rem',
      fontFamily: "'DM Sans', sans-serif",
      fontWeight: '500',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      border: `1px solid ${type === 'success' ? 'rgba(255,255,255,0.12)' : 'rgba(229,9,20,0.4)'}`,
      zIndex: '9999',
      opacity: '0',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      whiteSpace: 'nowrap',
    };

    Object.assign(toast.style, styles);
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
      });
    });

    // Animate out & remove
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ── Hiển thị lỗi server lên form ──
  function showFormError(form, message) {
    let errEl = form.querySelector('.server-error');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.className = 'server-error';
      Object.assign(errEl.style, {
        color: '#e50914',
        fontSize: '0.82rem',
        textAlign: 'center',
        marginTop: '-8px',
        animation: 'panelIn 0.3s ease forwards',
      });
      form.querySelector('.btn-primary').before(errEl);
    }
    errEl.textContent = '⚠ ' + message;
  }

  function clearFormError(form) {
    form.querySelector('.server-error')?.remove();
  }

  // ── Login form ──
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  clearFormError(loginForm);
  let valid = true;

  const emailInput = document.getElementById('loginEmail');
  const passInput  = document.getElementById('loginPassword');
  const rememberMe = document.getElementById('rememberMe').checked;

  if (!isValidEmail(emailInput.value)) { setError(emailInput, true); valid = false; }
  else setError(emailInput, false);

  if (passInput.value.trim() === '') { setError(passInput, true); valid = false; }
  else setError(passInput, false);

  if (!valid) return;

  const btn = loginForm.querySelector('.btn-primary');
  btn.classList.add('loading');
  btn.querySelector('span').textContent = 'Signing in';

  setTimeout(() => {
    btn.classList.remove('loading');
    btn.querySelector('span').textContent = 'Sign In';

    if (!window.CinemaAuth) {
      // Không có auth → vẫn redirect
      showToast('Đăng nhập thành công! 🎬', 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 1200);
      return;
    }

    const result = CinemaAuth.login({
      email:    emailInput.value,
      password: passInput.value,
      remember: rememberMe,
    });

    if (result.success) {
      showToast(`Chào mừng, ${result.user.firstName}! 🎬`, 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 1200);
    } else {
      showFormError(loginForm, result.message);
      showToast(result.message, 'error');
    }
  }, 1000);
});

  loginForm.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
      setError(input, false);
      clearFormError(loginForm);
    });
  });

  // ── Register form ──
  registerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  clearFormError(registerForm);
  let valid = true;

  const firstName = document.getElementById('regFirstName');
  const lastName  = document.getElementById('regLastName');
  const email     = document.getElementById('regEmail');
  const pass      = document.getElementById('regPassword');

  if (firstName.value.trim() === '') { setError(firstName, true); valid = false; }
  else setError(firstName, false);

  if (lastName.value.trim() === '') { setError(lastName, true); valid = false; }
  else setError(lastName, false);

  if (!isValidEmail(email.value)) { setError(email, true); valid = false; }
  else setError(email, false);

  if (pass.value.length < 8) { setError(pass, true); valid = false; }
  else setError(pass, false);

  if (!valid) return;

  const btn = registerForm.querySelector('.btn-primary');
  btn.classList.add('loading');
  btn.querySelector('span').textContent = 'Creating account';

  setTimeout(() => {
    btn.classList.remove('loading');
    btn.querySelector('span').textContent = 'Create Account';

    if (!window.CinemaAuth) {
      // Không có auth → vẫn reset form và chuyển sang login
      showToast('Tài khoản đã được tạo! 🎬', 'success');
      setTimeout(() => {
        registerForm.reset();
        if (pwBar) pwBar.className = 'pw-bar';
        showLogin();
      }, 1200);
      return;
    }

    const result = CinemaAuth.register({
      firstName: firstName.value,
      lastName:  lastName.value,
      email:     email.value,
      password:  pass.value,
    });

    if (result.success) {
      showToast(`Chào mừng ${result.user.firstName}! Tài khoản đã được tạo 🎬`, 'success');
      setTimeout(() => {
        registerForm.reset();
        if (pwBar) pwBar.className = 'pw-bar';
        showLogin();
      }, 1200);
    } else {
      showFormError(registerForm, result.message);
      showToast(result.message, 'error');
    }
  }, 1000);
});

  registerForm.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
      setError(input, false);
      clearFormError(registerForm);
    });
  });

  // ── Entrance animation ──
  const container = document.querySelector('.auth-container');
  container.style.opacity = '0';
  container.style.transform = 'translateY(16px)';
  requestAnimationFrame(() => {
    container.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    container.style.opacity = '1';
    container.style.transform = 'translateY(0)';
  });

})();