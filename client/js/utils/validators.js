// 表单验证工具

function validateEmail(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return '邮箱格式不正确';
  }
  return null;
}

function validatePassword(password) {
  if (!password || password.length < 6) {
    return '密码至少6位';
  }
  return null;
}

function validateConfirmPassword(password, confirmPassword) {
  if (password !== confirmPassword) {
    return '两次密码不一致';
  }
  return null;
}

function validateAmount(amount) {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) return '金额必须大于0';
  if (num > 999999.99) return '金额超出范围';
  return null;
}

function validateCategoryName(name) {
  if (!name || name.length === 0) return '分类名不能为空';
  if (name.length > 20) return '分类名不能超过20个字符';
  return null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateEmail, validatePassword, validateConfirmPassword, validateAmount, validateCategoryName };
}
