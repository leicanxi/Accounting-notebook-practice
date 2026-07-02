const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: true,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass
    }
  });
  return transporter;
}

async function sendVerificationCode(email, code) {
  const t = getTransporter();
  await t.sendMail({
    from: `"吃豆人记账" <${config.smtp.user}>`,
    to: email,
    subject: '吃豆人记账 - 验证码',
    html: `<div style="text-align:center;font-family:sans-serif;">
      <h2 style="color:#FFD700;">👾 吃豆人记账</h2>
      <p>您的验证码是：</p>
      <h1 style="color:#FF6B6B;letter-spacing:8px;">${code}</h1>
      <p style="color:#999;">验证码 5 分钟内有效，请勿泄露</p>
    </div>`
  });
}

module.exports = { sendVerificationCode };
