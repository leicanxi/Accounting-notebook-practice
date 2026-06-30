const bcrypt = require('bcrypt');
const config = require('../config');

async function hash(password) {
  return bcrypt.hash(password, config.bcryptRounds);
}

async function compare(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = { hash, compare };
