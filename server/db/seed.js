const db = require('./database');

const PRESET_CATEGORIES = [
  { name: '餐饮', icon: '🍔' },
  { name: '交通', icon: '🚌' },
  { name: '购物', icon: '🛒' },
  { name: '娱乐', icon: '🎮' },
  { name: '住房', icon: '🏠' },
  { name: '收入', icon: '💰' }
];

function seedCategories(userId) {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO categories (user_id, name, icon, is_preset) VALUES (?, ?, ?, 1)'
  );
  const tx = db.transaction(() => {
    for (const cat of PRESET_CATEGORIES) {
      insert.run(userId, cat.name, cat.icon);
    }
  });
  tx();
}

module.exports = { seedCategories, PRESET_CATEGORIES };
