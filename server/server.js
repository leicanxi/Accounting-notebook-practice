require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./config');
const db = require('./db/database');

// JWT_SECRET 默认值检测
if (config.nodeEnv === 'production' && config.jwtSecret === 'sugarrunner-dev-secret-change-me') {
  console.error('[FATAL] 生产环境下 JWT_SECRET 不能为默认值，请修改 .env 中的 JWT_SECRET');
  process.exit(1);
}

const app = express();

// 安全中间件
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// CSP header
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'");
  next();
});

// 速率限制
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { code: 429, message: '请求太频繁，请稍后再试' }
});
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { code: 429, message: '请求太频繁，请稍后再试' }
});

// 路由
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/bills', generalLimiter, require('./routes/bills'));
app.use('/api/categories', generalLimiter, require('./routes/categories'));
app.use('/api/stats', generalLimiter, require('./routes/stats'));
app.use('/api/settings', generalLimiter, require('./routes/settings'));

// 托管前端静态文件
app.use(express.static(path.join(__dirname, '..', 'client')));

// SPA fallback (Express 5 compatible)
app.use((req, res) => {
  if (req.path.startsWith('/api')) return;
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// 自定义错误处理中间件
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (config.nodeEnv === 'production') {
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  } else {
    res.status(500).json({ code: 500, message: err.message });
  }
});

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`吃豆人记账 服务已启动: http://localhost:${PORT}`);
  console.log(`环境: ${config.nodeEnv}`);
});

module.exports = app;
