const token = require('../utils/token');

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '请先登录' });
  }
  try {
    const decoded = token.verify(header.slice(7));
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }
}

module.exports = auth;
