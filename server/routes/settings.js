const express = require('express');
const db = require('../db/database');
const auth = require('../middleware/auth');
const exportService = require('../services/export');

const router = express.Router();

// POST /export — 导出账单 CSV
router.post('/export', auth, (req, res) => {
  try {
    const csv = exportService.generateCSV(req.userId);
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.userId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="sugarrunner-${user.email}-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('export error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

// POST /clear — 清空所有数据（保留分类）
router.post('/clear', auth, (req, res) => {
  try {
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM bills WHERE user_id = ?').run(req.userId);
    });
    tx();
    res.json({ code: 0, data: { message: '数据已清空' } });
  } catch (err) {
    console.error('clear error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

// POST /delete-account — 注销账号
router.post('/delete-account', auth, (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.userId);
    res.json({ code: 0, data: { message: '账号已注销' } });
  } catch (err) {
    console.error('delete-account error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

// PUT /currency — 切换币种
router.put('/currency', auth, (req, res) => {
  try {
    const { currency } = req.body;
    if (!['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD'].includes(currency)) {
      return res.status(400).json({ code: 400, message: '不支持的币种' });
    }
    db.prepare('UPDATE users SET currency = ? WHERE id = ?').run(currency, req.userId);
    res.json({ code: 0, data: { currency } });
  } catch (err) {
    console.error('currency error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

module.exports = router;
