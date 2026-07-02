const express = require('express');
const db = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /summary — 收支汇总（支持周/月）
router.get('/summary', auth, (req, res) => {
  try {
    const { period, granularity = 'month' } = req.query;
    // period: 2026-06 (month) or 2026-W26 (week)
    const userId = req.userId;

    let whereClause = 'WHERE user_id = ?';
    const params = [userId];
    let lastPeriodWhere = 'WHERE user_id = ?';
    const lastParams = [userId];

    if (granularity === 'month' && period) {
      const [year, month] = period.split('-');
      whereClause += ' AND strftime(\'%Y-%m\', created_at) = ?';
      params.push(period);

      // 上月
      let lastMonth = parseInt(month) - 1;
      let lastYear = parseInt(year);
      if (lastMonth < 1) { lastMonth = 12; lastYear--; }
      const lastPeriod = `${lastYear}-${String(lastMonth).padStart(2, '0')}`;
      lastPeriodWhere += ' AND strftime(\'%Y-%m\', created_at) = ?';
      lastParams.push(lastPeriod);

    } else if (granularity === 'week' && period) {
      const [year, weekStr] = period.split('-W');
      const weekNum = parseInt(weekStr);
      whereClause += ' AND strftime(\'%Y\', created_at) = ? AND CAST(strftime(\'%W\', created_at) AS INTEGER) + 1 = ?';
      params.push(year, weekNum);

      // 上周
      let lastWeek = weekNum - 1;
      let lastYear = year;
      if (lastWeek < 1) { lastWeek = 52; lastYear = String(parseInt(year) - 1); }
      lastPeriodWhere += ' AND strftime(\'%Y\', created_at) = ? AND CAST(strftime(\'%W\', created_at) AS INTEGER) + 1 = ?';
      lastParams.push(lastYear, lastWeek);
    }

    const incomeTotal = db.prepare(`SELECT COALESCE(SUM(amount),0) AS total FROM bills ${whereClause} AND type='income'`).get(...params).total;
    const expenseTotal = db.prepare(`SELECT COALESCE(SUM(amount),0) AS total FROM bills ${whereClause} AND type='expense'`).get(...params).total;
    const balance = incomeTotal - expenseTotal;

    let lastPeriodExpense = 0;
    if (period) {
      lastPeriodExpense = db.prepare(`SELECT COALESCE(SUM(amount),0) AS total FROM bills ${lastPeriodWhere} AND type='expense'`).get(...lastParams).total;
    }

    let changePercent = null;
    if (lastPeriodExpense > 0) {
      changePercent = parseFloat((((expenseTotal - lastPeriodExpense) / lastPeriodExpense) * 100).toFixed(1));
    }

    res.json({ code: 0, data: { income_total: incomeTotal, expense_total: expenseTotal, balance, last_period_expense: lastPeriodExpense, change_percent: changePercent } });
  } catch (err) {
    console.error('stats/summary error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

// GET /category-pie — 分类支出饼图数据
router.get('/category-pie', auth, (req, res) => {
  try {
    const { month, week } = req.query;
    const userId = req.userId;
    let where = 'WHERE b.user_id = ? AND b.type = \'expense\'';
    const params = [userId];

    if (month) {
      where += ' AND strftime(\'%Y-%m\', b.created_at) = ?';
      params.push(month);
    }
    if (week) {
      const year = week.slice(0, 4);
      const weekNum = parseInt(week.slice(5));
      where += ' AND strftime(\'%Y\', b.created_at) = ? AND CAST(strftime(\'%W\', b.created_at) AS INTEGER) + 1 = ?';
      params.push(year, weekNum);
    }

    const rows = db.prepare(
      `SELECT c.name AS category_name, c.icon, COALESCE(SUM(b.amount),0) AS total
       FROM bills b JOIN categories c ON b.category_id = c.id
       ${where} GROUP BY b.category_id ORDER BY total DESC`
    ).all(...params);

    const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
    const data = rows.map(r => ({
      category_name: r.category_name,
      icon: r.icon,
      total: r.total,
      percent: grandTotal > 0 ? parseFloat(((r.total / grandTotal) * 100).toFixed(1)) : 0
    }));

    res.json({ code: 0, data });
  } catch (err) {
    console.error('stats/category-pie error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

// GET /timeline — 消费趋势时间轴（含收入/支出）
router.get('/timeline', auth, (req, res) => {
  try {
    const { start, end, granularity = 'month' } = req.query;
    const userId = req.userId;

    let groupBy, dateFormat;
    if (granularity === 'month') {
      groupBy = 'strftime(\'%Y-%m\', created_at)';
      dateFormat = '%Y-%m';
    } else {
      groupBy = 'strftime(\'%Y-%W\', created_at)';
      dateFormat = '%Y-%W';
    }

    let where = 'WHERE user_id = ?';
    const params = [userId];
    if (start) { where += ' AND created_at >= ?'; params.push(start + '-01 00:00:00'); }
    if (end) { where += ' AND created_at <= ?'; params.push(end + '-31 23:59:59'); }

    const rows = db.prepare(
      `SELECT ${groupBy} AS period,
              COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS income,
              COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expense
       FROM bills ${where} GROUP BY period ORDER BY period`
    ).all(...params);

    res.json({ code: 0, data: rows });
  } catch (err) {
    console.error('stats/timeline error:', err);
    res.status(500).json({ code: 500, message: '服务异常，请稍后重试' });
  }
});

module.exports = router;
