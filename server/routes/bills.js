const express = require('express');
const db = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

// GET / — 获取账单列表
router.get('/', auth, (req, res) => {
  try {
    const { date, month, week, category_id, page = 1, page_size = 20 } = req.query;
    const userId = req.userId;
    let where = 'WHERE b.user_id = ?';
    const params = [userId];

    if (date) {
      where += ' AND date(b.created_at) = date(?)';
      params.push(date);
    }
    if (month) {
      where += ' AND strftime(\'%Y-%m\', b.created_at) = ?';
      params.push(month);
    }
    if (week) {
      // week format: 2026-W26
      const year = week.slice(0, 4);
      const weekNum = parseInt(week.slice(5));
      where += ' AND strftime(\'%Y\', b.created_at) = ? AND CAST(strftime(\'%W\', b.created_at) AS INTEGER) + 1 = ?';
      params.push(year, weekNum);
    }
    if (category_id) {
      where += ' AND b.category_id = ?';
      params.push(parseInt(category_id));
    }

    const countSql = `SELECT COUNT(*) AS total FROM bills b ${where}`;
    const total = db.prepare(countSql).get(...params).total;

    const offset = (parseInt(page) - 1) * parseInt(page_size);
    const sql = `SELECT b.id, b.type, b.amount, b.note, b.category_id, b.created_at, b.updated_at,
                 c.name AS category_name, c.icon AS category_icon
                 FROM bills b JOIN categories c ON b.category_id = c.id
                 ${where} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`;
    const bills = db.prepare(sql).all(...params, parseInt(page_size), offset);

    res.json({ code: 0, data: { total, page: parseInt(page), page_size: parseInt(page_size), bills } });
  } catch (err) {
    console.error('bills GET error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

// POST / — 创建账单
router.post('/', auth, (req, res) => {
  try {
    const { category_id, type = 'expense', amount, note = '', created_at } = req.body;
    const userId = req.userId;

    if (!category_id) return res.status(400).json({ code: 400, message: '请选择分类' });
    if (!amount || amount <= 0) return res.status(400).json({ code: 400, message: '金额必须大于0' });
    if (amount > 999999.99) return res.status(400).json({ code: 400, message: '金额超出范围' });
    if (note && note.length > 100) return res.status(400).json({ code: 400, message: '备注不能超过100字' });
    if (!['income', 'expense'].includes(type)) return res.status(400).json({ code: 400, message: '类型不正确' });

    // 验证分类属于该用户
    const cat = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(category_id, userId);
    if (!cat) return res.status(400).json({ code: 400, message: '分类不存在' });

    // 支持自定义消费时间，默认当前时间
    const billTime = created_at || new Date().toISOString().replace('T', ' ').slice(0, 19);

    const result = db.prepare(
      'INSERT INTO bills (user_id, category_id, type, amount, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, category_id, type, amount, note, billTime, billTime);

    res.json({ code: 0, data: { id: result.lastInsertRowid } });
  } catch (err) {
    console.error('bills POST error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

// PUT /:id — 编辑账单
router.put('/:id', auth, (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, type, amount, note } = req.body;
    const userId = req.userId;

    const bill = db.prepare('SELECT id FROM bills WHERE id = ? AND user_id = ?').get(id, userId);
    if (!bill) return res.status(404).json({ code: 404, message: '账单不存在' });

    if (category_id) {
      const cat = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(category_id, userId);
      if (!cat) return res.status(400).json({ code: 400, message: '分类不存在' });
    }
    if (amount !== undefined) {
      if (amount <= 0 || amount > 999999.99) return res.status(400).json({ code: 400, message: '金额超出范围' });
    }
    if (note !== undefined && note.length > 100) return res.status(400).json({ code: 400, message: '备注不能超过100字' });

    const updates = [];
    const params = [];
    if (category_id !== undefined) { updates.push('category_id = ?'); params.push(category_id); }
    if (type !== undefined) { updates.push('type = ?'); params.push(type); }
    if (amount !== undefined) { updates.push('amount = ?'); params.push(amount); }
    if (note !== undefined) { updates.push('note = ?'); params.push(note); }
    updates.push('updated_at = datetime(\'now\')');
    params.push(id, userId);

    db.prepare(`UPDATE bills SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
    res.json({ code: 0, data: { message: '更新成功' } });
  } catch (err) {
    console.error('bills PUT error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

// DELETE /:id — 删除账单
router.delete('/:id', auth, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const result = db.prepare('DELETE FROM bills WHERE id = ? AND user_id = ?').run(id, userId);
    if (result.changes === 0) return res.status(404).json({ code: 404, message: '账单不存在' });
    res.json({ code: 0, data: { message: '删除成功' } });
  } catch (err) {
    console.error('bills DELETE error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

module.exports = router;
