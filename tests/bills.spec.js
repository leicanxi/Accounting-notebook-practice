// E2E 测试：账单与统计
import { test, expect } from '@playwright/test';

test.describe('账单与统计', () => {
  let authToken = '';

  test.beforeEach(async ({ page }) => {
    const email = `bill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
    // Navigate first so fetch can use relative URLs
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

  test('V-43: 账单API创建和查询', async ({ page }) => {
    const result = await page.evaluate(async (token) => {
      const catsRes = await fetch('/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const catsData = await catsRes.json();
      const catId = catsData.data[0].id;

      await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ category_id: catId, type: 'expense', amount: 25.00 })
      });

      const billsRes = await fetch('/api/bills', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const billsData = await billsRes.json();
      return billsData.data;
    }, authToken);

    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  test('V-45: 饼图数据', async ({ page }) => {
    const result = await page.evaluate(async (token) => {
      const catsRes = await fetch('/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const catsData = await catsRes.json();
      const catId = catsData.data[0].id;

      await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ category_id: catId, type: 'expense', amount: 50.00 })
      });

      const pieRes = await fetch('/api/stats/category-pie?month=2026-06', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const pieData = await pieRes.json();
      return pieData.data;
    }, authToken);

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].total).toBeGreaterThan(0);
  });

  test('V-49: 编辑账单', async ({ page }) => {
    const result = await page.evaluate(async (token) => {
      const catsRes = await fetch('/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const catsData = await catsRes.json();
      const catId = catsData.data[0].id;

      const createRes = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ category_id: catId, type: 'expense', amount: 30.00 })
      });
      const createData = await createRes.json();
      const billId = createData.data.id;

      await fetch(`/api/bills/${billId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: 45.00 })
      });

      const billsRes = await fetch('/api/bills', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const billsData = await billsRes.json();
      return billsData.data.bills.find(b => b.id === billId);
    }, authToken);

    expect(result.amount).toBe(45.00);
  });
});
