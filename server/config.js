require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'sugarrunner-dev-secret-change-me',
  jwtExpiresIn: '7d',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.qq.com',
    port: parseInt(process.env.SMTP_PORT) || 465,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  },
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: './data/sugarrunner.db',
  bcryptRounds: 10,
  defaultCurrency: 'CNY'
};
