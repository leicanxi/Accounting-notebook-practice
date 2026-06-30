// 币种符号映射与格式化

const CURRENCY_CONFIG = {
  CNY: { symbol: '¥', rate: 1.00, name: '人民币' },
  USD: { symbol: '$', rate: 0.14, name: '美元' },
  EUR: { symbol: '€', rate: 0.13, name: '欧元' },
  JPY: { symbol: '¥', rate: 20.50, name: '日元' },
  GBP: { symbol: '£', rate: 0.11, name: '英镑' },
  HKD: { symbol: 'HK$', rate: 1.09, name: '港币' }
};

function convertFromCNY(amountCNY, targetCurrency) {
  const config = CURRENCY_CONFIG[targetCurrency];
  if (!config) return amountCNY;
  const converted = amountCNY * config.rate;
  if (targetCurrency === 'JPY') {
    return Math.round(converted);
  }
  return parseFloat(converted.toFixed(2));
}

function formatCurrency(amountCNY, targetCurrency) {
  const config = CURRENCY_CONFIG[targetCurrency];
  if (!config) return `¥${amountCNY.toFixed(2)}`;
  const converted = convertFromCNY(amountCNY, targetCurrency);
  if (targetCurrency === 'JPY') {
    return `¥${converted}`;
  }
  return `${config.symbol}${converted.toFixed(2)}`;
}

function getCurrencySymbol(code) {
  return CURRENCY_CONFIG[code]?.symbol || '¥';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CURRENCY_CONFIG, convertFromCNY, formatCurrency, getCurrencySymbol };
}
