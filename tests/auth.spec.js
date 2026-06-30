// E2E 测试：认证系统
import { test, expect } from '@playwright/test';

test.describe('认证系统', () => {

  test('V-01: 邮箱+密码注册', async ({ page }) => {
    const email = `test_${Date.now()}@example.com`;
    await page.goto('/#/register');
    await expect(page.locator('.login-card h1')).toContainText('注册');
    await page.fill('#reg-email', email);
    await page.fill('#reg-password', '123456');
    await page.fill('#reg-confirm', '123456');
    await page.click('#reg-btn');
    await page.waitForTimeout(2500);
    expect(page.url()).toContain('#/game');
  });

  test('V-03: 邮箱格式错误', async ({ page }) => {
    await page.goto('/#/register');
    await page.fill('#reg-email', 'abc');
    await page.fill('#reg-password', '123456');
    await page.fill('#reg-confirm', '123456');
    await page.click('#reg-btn');
    await expect(page.locator('#reg-error')).toContainText('邮箱格式不正确');
  });

  test('V-05: 两次密码不一致', async ({ page }) => {
    await page.goto('/#/register');
    await page.fill('#reg-email', 'test@example.com');
    await page.fill('#reg-password', '123456');
    await page.fill('#reg-confirm', '654321');
    await page.click('#reg-btn');
    await expect(page.locator('#reg-error')).toContainText('两次密码不一致');
  });

  test('V-06: 邮箱+密码登录', async ({ page }) => {
    const email = `login_${Date.now()}@example.com`;
    // 用API先注册
    await page.goto('/#/login');
    await page.evaluate(async (email) => {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: '123456', confirm_password: '123456' })
      });
    }, email);

    // 登录
    await page.goto('/#/login');
    await page.fill('#login-email', email);
    await page.fill('#login-password', '123456');
    await page.click('#login-btn');
    await page.waitForTimeout(2500);
    expect(page.url()).toContain('#/game');
  });

  test('V-07: 错误密码登录', async ({ page }) => {
    await page.goto('/#/login');
    await page.fill('#login-email', 'nonexist@example.com');
    await page.fill('#login-password', 'wrongpassword');
    await page.click('#login-btn');
    await expect(page.locator('#login-error')).toBeVisible();
  });

  test('V-16: 未登录无法访问游戏', async ({ page }) => {
    await page.goto('/#/login');
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(300);
    await page.goto('/#/game');
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('#/login');
  });

});
