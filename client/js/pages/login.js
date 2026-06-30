// 登录/注册/验证码页面

function renderAuthPage() {
  const container = document.getElementById('auth-form');
  const mode = getCurrentAuthMode();

  let html = '<img src="assets/sugar_runner.svg" class="login-mascot" alt="糖豆人">';

  if (mode === 'login') {
    html += renderLoginForm();
  } else if (mode === 'captcha-login') {
    html += renderCaptchaLoginForm();
  } else if (mode === 'register') {
    html += renderRegisterForm();
  } else if (mode === 'captcha-register') {
    html += renderCaptchaRegisterForm();
  } else if (mode === 'reset-password') {
    html += renderResetPasswordForm();
  }

  container.innerHTML = html;
  bindAuthEvents(mode);
}

function getCurrentAuthMode() {
  const hash = window.location.hash;
  if (hash.startsWith('#/register')) return 'register';
  if (hash.startsWith('#/captcha-login')) return 'captcha-login';
  if (hash.startsWith('#/captcha-register')) return 'captcha-register';
  if (hash.startsWith('#/reset-password')) return 'reset-password';
  return 'login';
}

function renderLoginForm() {
  return `
    <h1>糖豆人记账</h1>
    <p class="subtitle">把记账变成一场甜蜜的游戏</p>
    <div class="tabs">
      <button class="tab-btn active" data-mode="login">密码登录</button>
      <button class="tab-btn" data-mode="captcha-login">验证码登录</button>
    </div>
    <div class="form-group">
      <input type="email" id="login-email" placeholder="输入邮箱" autocomplete="email">
    </div>
    <div class="form-group">
      <input type="password" id="login-password" placeholder="输入密码" autocomplete="current-password">
    </div>
    <div class="error-msg" id="login-error"></div>
    <button class="btn-primary" id="login-btn">登 录</button>
    <div class="form-links">
      <a onclick="Router.navigate('#/register')">注册账号</a>
      <a onclick="Router.navigate('#/reset-password')">忘记密码</a>
    </div>
  `;
}

function renderCaptchaLoginForm() {
  return `
    <h1>糖豆人记账</h1>
    <p class="subtitle">把记账变成一场甜蜜的游戏</p>
    <div class="tabs">
      <button class="tab-btn" data-mode="login">密码登录</button>
      <button class="tab-btn active" data-mode="captcha-login">验证码登录</button>
    </div>
    <div class="form-group">
      <input type="email" id="captcha-login-email" placeholder="输入邮箱" autocomplete="email">
    </div>
    <div class="form-group captcha-row">
      <input type="text" id="captcha-login-code" placeholder="输入6位验证码" maxlength="6">
      <button id="captcha-login-send">发送验证码</button>
    </div>
    <div class="error-msg" id="captcha-login-error"></div>
    <button class="btn-primary" id="captcha-login-btn">登 录</button>
    <div class="form-links">
      <a onclick="Router.navigate('#/register')">注册账号</a>
      <a onclick="Router.navigate('#/login')">密码登录</a>
    </div>
  `;
}

function renderRegisterForm() {
  return `
    <h1>注册账号</h1>
    <p class="subtitle">开始你的记账旅程</p>
    <div class="tabs">
      <button class="tab-btn active" data-mode="register">密码注册</button>
      <button class="tab-btn" data-mode="captcha-register">验证码注册</button>
    </div>
    <div class="form-group">
      <input type="email" id="reg-email" placeholder="输入邮箱" autocomplete="email">
    </div>
    <div class="form-group">
      <input type="password" id="reg-password" placeholder="输入密码" autocomplete="new-password">
    </div>
    <div class="form-group">
      <input type="password" id="reg-confirm" placeholder="确认密码" autocomplete="new-password">
    </div>
    <div class="error-msg" id="reg-error"></div>
    <button class="btn-primary" id="reg-btn">注 册</button>
    <div class="form-links">
      <a onclick="Router.navigate('#/login')">返回登录</a>
    </div>
  `;
}

function renderCaptchaRegisterForm() {
  return `
    <h1>验证码注册</h1>
    <p class="subtitle">无需密码，快速注册</p>
    <div class="tabs">
      <button class="tab-btn" data-mode="register">密码注册</button>
      <button class="tab-btn active" data-mode="captcha-register">验证码注册</button>
    </div>
    <div class="form-group">
      <input type="email" id="captcha-reg-email" placeholder="输入邮箱" autocomplete="email">
    </div>
    <div class="form-group captcha-row">
      <input type="text" id="captcha-reg-code" placeholder="输入6位验证码" maxlength="6">
      <button id="captcha-reg-send">发送验证码</button>
    </div>
    <div class="error-msg" id="captcha-reg-error"></div>
    <button class="btn-primary" id="captcha-reg-btn">注 册</button>
    <div class="form-links">
      <a onclick="Router.navigate('#/login')">返回登录</a>
    </div>
  `;
}

function renderResetPasswordForm() {
  return `
    <h1>重置密码</h1>
    <p class="subtitle">通过验证码重置密码</p>
    <div class="form-group">
      <input type="email" id="reset-email" placeholder="输入邮箱" autocomplete="email">
    </div>
    <div class="form-group captcha-row">
      <input type="text" id="reset-captcha" placeholder="输入6位验证码" maxlength="6">
      <button id="reset-send">发送验证码</button>
    </div>
    <div class="form-group">
      <input type="password" id="reset-new-password" placeholder="输入新密码" autocomplete="new-password">
    </div>
    <div class="error-msg" id="reset-error"></div>
    <button class="btn-primary" id="reset-btn">重置密码</button>
    <div class="form-links">
      <a onclick="Router.navigate('#/login')">返回登录</a>
    </div>
  `;
}

function bindAuthEvents(mode) {
  // Tab 切换
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetMode = btn.dataset.mode;
      Router.navigate('#/' + (targetMode === 'login' ? 'login' : targetMode));
    });
  });

  if (mode === 'login') {
    bindLoginEvents();
  } else if (mode === 'captcha-login') {
    bindCaptchaLoginEvents();
  } else if (mode === 'register') {
    bindRegisterEvents();
  } else if (mode === 'captcha-register') {
    bindCaptchaRegisterEvents();
  } else if (mode === 'reset-password') {
    bindResetPasswordEvents();
  }
}

function bindLoginEvents() {
  const btn = document.getElementById('login-btn');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const errorEl = document.getElementById('login-error');

  async function doLogin() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const emailErr = validateEmail(email);
    if (emailErr) { errorEl.textContent = emailErr; return; }
    const pwErr = validatePassword(password);
    if (pwErr) { errorEl.textContent = pwErr; return; }

    btn.disabled = true;
    btn.textContent = '登录中...';
    errorEl.textContent = '';

    try {
      const result = await api.login({ email, password });
      setToken(result.token);
      playLoginTransition();
    } catch (e) {
      errorEl.textContent = e.message;
      btn.disabled = false;
      btn.textContent = '登 录';
    }
  }

  btn.addEventListener('click', doLogin);
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
  });
}

function bindCaptchaLoginEvents() {
  const btn = document.getElementById('captcha-login-btn');
  const sendBtn = document.getElementById('captcha-login-send');
  const emailInput = document.getElementById('captcha-login-email');
  const codeInput = document.getElementById('captcha-login-code');
  const errorEl = document.getElementById('captcha-login-error');
  let countdown = 0;

  sendBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const emailErr = validateEmail(email);
    if (emailErr) { errorEl.textContent = emailErr; return; }
    if (countdown > 0) return;

    sendBtn.disabled = true;
    try {
      await api.sendCaptcha({ email, type: 'login' });
      showToast('验证码已发送', 'success');
      countdown = 60;
      sendBtn.textContent = `${countdown}s`;
      const timer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          clearInterval(timer);
          sendBtn.textContent = '发送验证码';
          sendBtn.disabled = false;
        } else {
          sendBtn.textContent = `${countdown}s`;
        }
      }, 1000);
    } catch (e) {
      errorEl.textContent = e.message;
      sendBtn.disabled = false;
    }
  });

  async function doCaptchaLogin() {
    const email = emailInput.value.trim();
    const code = codeInput.value.trim();
    const emailErr = validateEmail(email);
    if (emailErr) { errorEl.textContent = emailErr; return; }
    if (!code || code.length !== 6) { errorEl.textContent = '请输入6位验证码'; return; }

    btn.disabled = true;
    btn.textContent = '登录中...';
    errorEl.textContent = '';

    try {
      const result = await api.loginCaptcha({ email, captcha: code });
      setToken(result.token);
      playLoginTransition();
    } catch (e) {
      errorEl.textContent = e.message;
      btn.disabled = false;
      btn.textContent = '登 录';
    }
  }

  btn.addEventListener('click', doCaptchaLogin);
}

function bindRegisterEvents() {
  const btn = document.getElementById('reg-btn');
  const emailInput = document.getElementById('reg-email');
  const passwordInput = document.getElementById('reg-password');
  const confirmInput = document.getElementById('reg-confirm');
  const errorEl = document.getElementById('reg-error');

  async function doRegister() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    const emailErr = validateEmail(email);
    if (emailErr) { errorEl.textContent = emailErr; return; }
    const pwErr = validatePassword(password);
    if (pwErr) { errorEl.textContent = pwErr; return; }
    const confirmErr = validateConfirmPassword(password, confirm);
    if (confirmErr) { errorEl.textContent = confirmErr; return; }

    btn.disabled = true;
    btn.textContent = '注册中...';
    errorEl.textContent = '';

    try {
      const result = await api.register({ email, password, confirm_password: confirm });
      setToken(result.token);
      playLoginTransition();
    } catch (e) {
      errorEl.textContent = e.message;
      btn.disabled = false;
      btn.textContent = '注 册';
    }
  }

  btn.addEventListener('click', doRegister);
  confirmInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doRegister();
  });
}

function bindCaptchaRegisterEvents() {
  const btn = document.getElementById('captcha-reg-btn');
  const sendBtn = document.getElementById('captcha-reg-send');
  const emailInput = document.getElementById('captcha-reg-email');
  const codeInput = document.getElementById('captcha-reg-code');
  const errorEl = document.getElementById('captcha-reg-error');
  let countdown = 0;

  sendBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const emailErr = validateEmail(email);
    if (emailErr) { errorEl.textContent = emailErr; return; }
    if (countdown > 0) return;

    sendBtn.disabled = true;
    try {
      await api.sendCaptcha({ email, type: 'register' });
      showToast('验证码已发送', 'success');
      countdown = 60;
      sendBtn.textContent = `${countdown}s`;
      const timer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          clearInterval(timer);
          sendBtn.textContent = '发送验证码';
          sendBtn.disabled = false;
        } else {
          sendBtn.textContent = `${countdown}s`;
        }
      }, 1000);
    } catch (e) {
      errorEl.textContent = e.message;
      sendBtn.disabled = false;
    }
  });

  async function doCaptchaRegister() {
    const email = emailInput.value.trim();
    const code = codeInput.value.trim();
    const emailErr = validateEmail(email);
    if (emailErr) { errorEl.textContent = emailErr; return; }
    if (!code || code.length !== 6) { errorEl.textContent = '请输入6位验证码'; return; }

    btn.disabled = true;
    btn.textContent = '注册中...';
    errorEl.textContent = '';

    try {
      const result = await api.registerCaptcha({ email, captcha: code });
      setToken(result.token);
      playLoginTransition();
    } catch (e) {
      errorEl.textContent = e.message;
      btn.disabled = false;
      btn.textContent = '注 册';
    }
  }

  btn.addEventListener('click', doCaptchaRegister);
}

function bindResetPasswordEvents() {
  const btn = document.getElementById('reset-btn');
  const sendBtn = document.getElementById('reset-send');
  const emailInput = document.getElementById('reset-email');
  const codeInput = document.getElementById('reset-captcha');
  const passwordInput = document.getElementById('reset-new-password');
  const errorEl = document.getElementById('reset-error');
  let countdown = 0;

  sendBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const emailErr = validateEmail(email);
    if (emailErr) { errorEl.textContent = emailErr; return; }
    if (countdown > 0) return;

    sendBtn.disabled = true;
    try {
      await api.sendCaptcha({ email, type: 'reset' });
      showToast('验证码已发送', 'success');
      countdown = 60;
      sendBtn.textContent = `${countdown}s`;
      const timer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          clearInterval(timer);
          sendBtn.textContent = '发送验证码';
          sendBtn.disabled = false;
        } else {
          sendBtn.textContent = `${countdown}s`;
        }
      }, 1000);
    } catch (e) {
      errorEl.textContent = e.message;
      sendBtn.disabled = false;
    }
  });

  async function doReset() {
    const email = emailInput.value.trim();
    const code = codeInput.value.trim();
    const password = passwordInput.value;

    const emailErr = validateEmail(email);
    if (emailErr) { errorEl.textContent = emailErr; return; }
    if (!code || code.length !== 6) { errorEl.textContent = '请输入6位验证码'; return; }
    const pwErr = validatePassword(password);
    if (pwErr) { errorEl.textContent = pwErr; return; }

    btn.disabled = true;
    btn.textContent = '重置中...';
    errorEl.textContent = '';

    try {
      await api.resetPassword({ email, captcha: code, new_password: password });
      showToast('密码重置成功，请登录', 'success');
      Router.navigate('#/login');
    } catch (e) {
      errorEl.textContent = e.message;
      btn.disabled = false;
      btn.textContent = '重置密码';
    }
  }

  btn.addEventListener('click', doReset);
}

// 登录过渡动画
function playLoginTransition() {
  const overlay = document.getElementById('transition-overlay');
  const mascot = document.getElementById('transition-mascot');
  const loginContainer = document.getElementById('login-container');

  loginContainer.style.display = 'none';
  overlay.style.display = 'flex';

  // 动画结束 → 跳转游戏
  setTimeout(() => {
    overlay.style.display = 'none';
    Router.navigate('#/game');
  }, 1200);
}

// Toast 提示
function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2500);
}

window.renderAuthPage = renderAuthPage;
window.showToast = showToast;
