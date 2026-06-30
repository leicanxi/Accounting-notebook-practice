const express = require('express');
const db = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

// GET / — 获取用户全部分类
router.get('/', auth, (req, res) => {
  try {
    const cats = db.prepare('SELECT id, name, icon, is_preset FROM categories WHERE user_id = ? ORDER BY id').all(req.userId);
    res.json({ code: 0, data: cats });
  } catch (err) {
    console.error('categories GET error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

// POST / — 添加自定义分类
router.post('/', auth, (req, res) => {
  try {
    const { name, icon = '📦' } = req.body;
    const userId = req.userId;
    if (!name || name.length > 20) return res.status(400).json({ code: 400, message: '分类名1-20个字符' });
    const result = db.prepare('INSERT INTO categories (user_id, name, icon, is_preset) VALUES (?, ?, ?, 0)').run(userId, name, icon);
    res.json({ code: 0, data: { id: result.lastInsertRowid, name, icon } });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ code: 409, message: '该分类名已存在' });
    }
    console.error('categories POST error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

// PUT /:id — 编辑分类
router.put('/:id', auth, (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon } = req.body;
    const userId = req.userId;
    const cat = db.prepare('SELECT id, is_preset FROM categories WHERE id = ? AND user_id = ?').get(id, userId);
    if (!cat) return res.status(404).json({ code: 404, message: '分类不存在' });
    if (cat.is_preset) return res.status(400).json({ code: 400, message: '预设分类不可编辑' });
    if (name && name.length > 20) return res.status(400).json({ code: 400, message: '分类名1-20个字符' });
    const updates = [];
    const params = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (icon) { updates.push('icon = ?'); params.push(icon); }
    if (updates.length === 0) return res.status(400).json({ code: 400, message: '无修改内容' });
    params.push(id, userId);
    db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
    res.json({ code: 0, data: { message: '更新成功' } });
  } catch (err) {
    console.error('categories PUT error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

// DELETE /:id — 删除分类（RESTRICT：有关联账单则禁止）
router.delete('/:id', auth, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const cat = db.prepare('SELECT id, is_preset FROM categories WHERE id = ? AND user_id = ?').get(id, userId);
    if (!cat) return res.status(404).json({ code: 404, message: '分类不存在' });
    if (cat.is_preset) return res.status(400).json({ code: 400, message: '预设分类不可删除' });

    const billCount = db.prepare('SELECT COUNT(*) AS cnt FROM bills WHERE category_id = ?').get(id);
    if (billCount.cnt > 0) {
      return res.status(400).json({ code: 400, message: `该分类下有 ${billCount.cnt} 笔账单，无法删除` });
    }
    db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(id, userId);
    res.json({ code: 0, data: { message: '删除成功' } });
  } catch (err) {
    console.error('categories DELETE error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

module.exports = router;
