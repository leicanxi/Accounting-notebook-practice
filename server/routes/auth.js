const express = require('express');
const db = require('../db/database');
const hashUtil = require('../utils/hash');
const tokenUtil = require('../utils/token');
const captcha = require('../services/captcha');
const emailService = require('../services/email');
const auth = require('../middleware/auth');
const { seedCategories } = require('../db/seed');

const router = express.Router();

// 验证邮箱格式
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePassword(password) {
  if (!password || password.length < 6) return '密码至少6位';
  return null;
}

// POST /register — 邮箱+密码注册
router.post('/register', async (req, res) => {
  try {
    const { email, password, confirm_password } = req.body;
    if (!EMAIL_RE.test(email)) return res.status(400).json({ code: 400, message: '邮箱格式不正确' });
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ code: 400, message: pwErr });
    if (password !== confirm_password) return res.status(400).json({ code: 400, message: '两次密码不一致' });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) return res.status(409).json({ code: 409, message: '该邮箱已注册' });

    const passwordHash = await hashUtil.hash(password);
    const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email.toLowerCase(), passwordHash);
    const userId = result.lastInsertRowid;
    seedCategories(userId);
    const token = tokenUtil.sign({ id: userId });
    res.json({ code: 0, data: { token, user: { id: userId, email: email.toLowerCase() } } });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

// POST /login — 邮箱+密码登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) return res.status(401).json({ code: 401, message: '邮箱或密码错误' });
    if (!user.password_hash) return res.status(401).json({ code: 401, message: '该账号未设置密码，请使用验证码登录' });
    const valid = await hashUtil.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ code: 401, message: '邮箱或密码错误' });
    const token = tokenUtil.sign({ id: user.id });
    res.json({ code: 0, data: { token, user: { id: user.id, email: user.email } } });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

// POST /captcha/send — 发送验证码
router.post('/captcha/send', async (req, res) => {
  try {
    const { email, type } = req.body;
    if (!EMAIL_RE.test(email)) return res.status(400).json({ code: 400, message: '邮箱格式不正确' });
    if (!['register', 'login', 'reset'].includes(type)) return res.status(400).json({ code: 400, message: '类型不正确' });

    const code = captcha.generateCode();
    const result = captcha.store(email, code, type);
    if (!result.ok) return res.status(429).json({ code: 429, message: result.message });

    try {
      await emailService.sendVerificationCode(email, code);
      res.json({ code: 0, data: { message: '验证码已发送' } });
    } catch (emailErr) {
      console.error('send email error:', emailErr);
      res.status(500).json({ code: 500, message: '邮件发送失败，请稍后重试' });
    }
  } catch (err) {
    console.error('captcha/send error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

// POST /register/captcha — 验证码注册
router.post('/register/captcha', (req, res) => {
  try {
    const { email, captcha: code } = req.body;
    if (!EMAIL_RE.test(email)) return res.status(400).json({ code: 400, message: '邮箱格式不正确' });
    const verifyResult = captcha.verify(email, code, 'register');
    if (!verifyResult.ok) return res.status(400).json({ code: 400, message: verifyResult.message });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) return res.status(409).json({ code: 409, message: '该邮箱已注册' });

    const result = db.prepare('INSERT INTO users (email) VALUES (?)').run(email.toLowerCase());
    const userId = result.lastInsertRowid;
    seedCategories(userId);
    const token = tokenUtil.sign({ id: userId });
    res.json({ code: 0, data: { token, user: { id: userId, email: email.toLowerCase() } } });
  } catch (err) {
    console.error('register/captcha error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

// POST /login/captcha — 验证码登录（含自动注册）
router.post('/login/captcha', (req, res) => {
  try {
    const { email, captcha: code } = req.body;
    if (!EMAIL_RE.test(email)) return res.status(400).json({ code: 400, message: '邮箱格式不正确' });
    const verifyResult = captcha.verify(email, code, 'login');
    if (!verifyResult.ok) return res.status(400).json({ code: 400, message: verifyResult.message });

    let user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      // 自动创建账号
      const result = db.prepare('INSERT INTO users (email) VALUES (?)').run(email.toLowerCase());
      const userId = result.lastInsertRowid;
      seedCategories(userId);
      user = { id: userId, email: email.toLowerCase() };
    }
    const token = tokenUtil.sign({ id: user.id });
    res.json({ code: 0, data: { token, user: { id: user.id, email: user.email } } });
  } catch (err) {
    console.error('login/captcha error:', err);
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // 并发竞态：已经存在，回退查询
      const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(req.body.email?.toLowerCase());
      if (user) {
        const token = tokenUtil.sign({ id: user.id });
        return res.json({ code: 0, data: { token, user: { id: user.id, email: user.email } } });
      }
    }
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

// POST /password/reset — 密码重置
router.post('/password/reset', async (req, res) => {
  try {
    const { email, captcha: code, new_password } = req.body;
    if (!EMAIL_RE.test(email)) return res.status(400).json({ code: 400, message: '邮箱格式不正确' });
    const verifyResult = captcha.verify(email, code, 'reset');
    if (!verifyResult.ok) return res.status(400).json({ code: 400, message: verifyResult.message });
    const pwErr = validatePassword(new_password);
    if (pwErr) return res.status(400).json({ code: 400, message: pwErr });

    const passwordHash = await hashUtil.hash(new_password);
    db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(passwordHash, email.toLowerCase());
    res.json({ code: 0, data: { message: '密码重置成功' } });
  } catch (err) {
    console.error('password/reset error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

// POST /logout — 退出登录（前端清除 token 即可，后端无需操作）
router.post('/logout', auth, (req, res) => {
  res.json({ code: 0, data: { message: '已退出' } });
});

module.exports = router;
