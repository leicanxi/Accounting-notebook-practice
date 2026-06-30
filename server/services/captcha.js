// 验证码存储（内存，服务重启丢失）
const captchaStore = new Map();
const CAPTCHA_EXPIRY = 5 * 60 * 1000; // 5 分钟
const RESEND_LIMIT = 60 * 1000;       // 60 秒
const MAX_ATTEMPTS = 5;               // 最大错误次数
const LOCK_DURATION = 15 * 60 * 1000; // 锁定 15 分钟

function generateCode() {
  return String(Math.floor(Math.random() * 900000 + 100000));
}

function store(email, code, type) {
  cleanExpired();
  const key = email.toLowerCase();
  if (captchaStore.has(key)) {
    const existing = captchaStore.get(key);
    if (Date.now() - existing.createdAt < RESEND_LIMIT) {
      return { ok: false, message: '发送太频繁，请60秒后再试' };
    }
    if (existing.lockedAt && Date.now() - existing.lockedAt < LOCK_DURATION) {
      return { ok: false, message: '尝试次数过多，请15分钟后再试' };
    }
  }
  captchaStore.set(key, {
    code,
    type,
    expiresAt: Date.now() + CAPTCHA_EXPIRY,
    createdAt: Date.now(),
    attempts: 0,
    lockedAt: null
  });
  return { ok: true };
}

function verify(email, code, type) {
  cleanExpired();
  const key = email.toLowerCase();
  const record = captchaStore.get(key);
  if (!record) {
    return { ok: false, message: '验证码已过期，请重新获取' };
  }
  if (record.lockedAt && Date.now() - record.lockedAt < LOCK_DURATION) {
    return { ok: false, message: '尝试次数过多，请15分钟后再试' };
  }
  if (record.type !== type) {
    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts >= MAX_ATTEMPTS) {
      record.lockedAt = Date.now();
    }
    return { ok: false, message: '验证码已过期，请重新获取' };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedAt = Date.now();
    return { ok: false, message: '尝试次数过多，请15分钟后再试' };
  }
  if (record.code !== String(code)) {
    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts >= MAX_ATTEMPTS) {
      record.lockedAt = Date.now();
    }
    return { ok: false, message: '验证码已过期，请重新获取' };
  }
  // 验证成功后删除
  captchaStore.delete(key);
  return { ok: true };
}

function cleanExpired() {
  const now = Date.now();
  for (const [key, val] of captchaStore) {
    if (now > val.expiresAt) {
      captchaStore.delete(key);
    }
  }
}

setInterval(cleanExpired, 60000);

module.exports = { store, verify, generateCode };
