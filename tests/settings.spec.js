// E2E 测试：设置与边界
import { test, expect } from '@playwright/test';

test.describe('设置与边界', () => {
  let authToken = '';

  test.beforeEach(async ({ page }) => {
    const email = `settings_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
    await page.goto('/#/login');
    await page.evaluate(async (email) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: '123456', confirm_password: '123456' })
      });
      const data = await res.json();
      window.__token = data.data.token;
    }, email);
    authToken = await page.evaluate(() => window.__token);
  });

  test('V-52: 新用户有预设分类', async ({ page }) => {
    const cats = await page.evaluate(async (token) => {
      const res = await fetch('/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return data.data;
    }, authToken);

    expect(cats.length).toBe(6);
    const names = cats.map(c => c.name);
    expect(names).toContain('餐饮');
    expect(names).toContain('交通');
    expect(names).toContain('购物');
    expect(names).toContain('娱乐');
    expect(names).toContain('住房');
    expect(names).toContain('收入');
  });

  test('V-53: 添加自定义分类', async ({ page }) => {
    const result = await page.evaluate(async (token) => {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: '宠物', icon: '🐱' })
      });
      return await res.json();
    }, authToken);

    expect(result.code).toBe(0);
  });

  test('V-58: 导出CSV', async ({ page }) => {
    // 先创建账单
    await page.evaluate(async (token) => {
      const catsRes = await fetch('/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const catsData = await catsRes.json();
      const catId = catsData.data[0].id;
      await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ category_id: catId, type: 'expense', amount: 42.50 })
      });
    }, authToken);

    const csvResult = await page.evaluate(async (token) => {
      const res = await fetch('/api/settings/export', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const text = await res.text();
      return text;
    }, authToken);

    expect(csvResult).toContain('42.5');
  });

  test('V-59/V-60: 清空数据', async ({ page }) => {
    // 创建账单
    await page.evaluate(async (token) => {
      const catsRes = await fetch('/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const catsData = await catsRes.json();
      const catId = catsData.data[0].id;
      await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ category_id: catId, type: 'expense', amount: 10.00 })
      });
    }, authToken);

    // 清空
    const clearResult = await page.evaluate(async (token) => {
      const res = await fetch('/api/settings/clear', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await res.json();
    }, authToken);
    expect(clearResult.code).toBe(0);

    // 验证账单为空
    const bills = await page.evaluate(async (token) => {
      const res = await fetch('/api/bills', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return data.data;
    }, authToken);
    expect(bills.total).toBe(0);
  });

  test('V-63: JWT过期重定向', async ({ page }) => {
    await page.goto('/#/login');
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(300);
    await page.goto('/#/game');
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('#/login');
  });
});
