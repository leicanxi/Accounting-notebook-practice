import { test, expect } from '@playwright/test';

test.describe('game core', () => {
  test.beforeEach(async ({ page }) => {
    const email = `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

    await page.goto('/#/login');
    await page.evaluate(async (value) => {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: value,
          password: '123456',
          confirm_password: '123456'
        })
      });
    }, email);

    await page.goto('/#/login');
    await page.fill('#login-email', email);
    await page.fill('#login-password', '123456');
    await page.click('#login-btn');
    await expect(page.locator('#game-canvas')).toBeVisible({ timeout: 10000 });
  });

  test('shows the canvas after login', async ({ page }) => {
    await expect(page.locator('#game-canvas')).toBeVisible({ timeout: 10000 });
  });

  test('starts with a field full of balls', async ({ page }) => {
    const activeCount = await page.evaluate(() => {
      return window.BallManager?.balls?.filter((ball) => !ball.eaten).length || 0;
    });

    expect(activeCount).toBeGreaterThanOrEqual(12);
  });

  test('respawns new balls after the field is cleared', async ({ page }) => {
    await page.evaluate(() => {
      window.BallManager?.balls?.forEach((ball) => {
        ball.eaten = true;
      });
    });

    await page.waitForTimeout(1500);

    const activeCount = await page.evaluate(() => {
      return window.BallManager?.balls?.filter((ball) => !ball.eaten).length || 0;
    });

    expect(activeCount).toBeGreaterThan(0);
  });
});
