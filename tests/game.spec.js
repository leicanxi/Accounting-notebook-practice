// E2E 测试：游戏核心
import { test, expect } from '@playwright/test';

test.describe('游戏核心', () => {
  test.beforeEach(async ({ page }) => {
    const email = `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
    await page.goto('/#/login');
    await page.evaluate(async (email) => {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: '123456', confirm_password: '123456' })
      });
    }, email);
    await page.goto('/#/login');
    await page.fill('#login-email', email);
    await page.fill('#login-password', '123456');
    await page.click('#login-btn');
    await page.waitForTimeout(3000);
  });

  test('V-19: 登录后进入游戏界面', async ({ page }) => {
    await expect(page.locator('#game-canvas')).toBeVisible({ timeout: 10000 });
  });

  test('V-40: 主界面Canvas可见', async ({ page }) => {
    await expect(page.locator('#game-canvas')).toBeVisible({ timeout: 10000 });
  });
});
