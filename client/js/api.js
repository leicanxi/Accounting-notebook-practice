// HTTP 请求封装

const API_BASE = '/api';

function getToken() {
  try {
    return localStorage.getItem('sugarrunner_token');
  } catch (e) {
    return null;
  }
}

function setToken(token) {
  try {
    localStorage.setItem('sugarrunner_token', token);
  } catch (e) {
    console.warn('localStorage 不可用');
  }
}

function clearToken() {
  try {
    localStorage.removeItem('sugarrunner_token');
  } catch (e) { /* ignore */ }
}

async function request(path, options = {}) {
  const { method = 'GET', body, headers = {}, auth = true } = options;

  const reqHeaders = { 'Content-Type': 'application/json', ...headers };
  if (auth) {
    const token = getToken();
    if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = { method, headers: reqHeaders };
  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(API_BASE + path, fetchOptions);
  } catch (e) {
    throw new Error('网络异常，请稍后重试');
  }

  if (response.status === 401) {
    clearToken();
    window.location.hash = '#/login';
    throw new Error('登录已过期，请重新登录');
  }

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(data.message || '请求失败');
  }

  return data.data;
}

// API 方法封装
const api = {
  // 认证
  register: (body) => request('/auth/register', { method: 'POST', body, auth: false }),
  login: (body) => request('/auth/login', { method: 'POST', body, auth: false }),
  registerCaptcha: (body) => request('/auth/register/captcha', { method: 'POST', body, auth: false }),
  loginCaptcha: (body) => request('/auth/login/captcha', { method: 'POST', body, auth: false }),
  sendCaptcha: (body) => request('/auth/captcha/send', { method: 'POST', body, auth: false }),
  resetPassword: (body) => request('/auth/password/reset', { method: 'POST', body, auth: false }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // 账单
  getBills: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('/bills' + (qs ? '?' + qs : ''));
  },
  createBill: (body) => request('/bills', { method: 'POST', body }),
  updateBill: (id, body) => request('/bills/' + id, { method: 'PUT', body }),
  deleteBill: (id) => request('/bills/' + id, { method: 'DELETE' }),

  // 分类
  getCategories: () => request('/categories'),
  createCategory: (body) => request('/categories', { method: 'POST', body }),
  updateCategory: (id, body) => request('/categories/' + id, { method: 'PUT', body }),
  deleteCategory: (id) => request('/categories/' + id, { method: 'DELETE' }),

  // 统计
  getSummary: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request('/stats/summary?' + qs);
  },
  getCategoryPie: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request('/stats/category-pie?' + qs);
  },
  getTimeline: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request('/stats/timeline?' + qs);
  },

  // 设置
  exportCSV: () => request('/settings/export', { method: 'POST' }),
  clearData: () => request('/settings/clear', { method: 'POST' }),
  deleteAccount: () => request('/settings/delete-account', { method: 'POST' }),
  updateCurrency: (body) => request('/settings/currency', { method: 'PUT', body }),

  // 用户信息
  getCurrentUser: () => ({ id: null, email: null }) // 从token解析或存储
};

window.api = api;
window.getToken = getToken;
window.setToken = setToken;
window.clearToken = clearToken;
