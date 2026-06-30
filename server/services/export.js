const db = require('../db/database');

function generateCSV(userId) {
  const BOM = '\uFEFF';
  const header = '类型,金额,分类,备注,时间\n';
  const rows = db.prepare(
    `SELECT b.type, b.amount, c.name AS category, b.note, b.created_at
     FROM bills b JOIN categories c ON b.category_id = c.id
     WHERE b.user_id = ? ORDER BY b.created_at DESC`
  ).all(userId);

  const csvRows = rows.map(r =>
    `"${r.type === 'income' ? '收入' : '支出'}","${r.amount}","${r.category}","${(r.note || '').replace(/"/g, '""')}","${r.created_at}"`
  ).join('\n');

  return BOM + header + csvRows;
}

module.exports = { generateCSV };
