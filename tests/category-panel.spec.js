import { test, expect } from '@playwright/test';

test.describe('category panel and bill flow', () => {
  test.beforeEach(async ({ page }) => {
    const email = `panel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

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

  test('shows preset expense categories and one custom entry after clicking a ball', async ({ page }) => {
    const target = await page.evaluate(() => {
      const ball = window.BallManager?.balls?.find((item) => !item.isGold && !item.configured && !item.eaten);
      return ball ? { x: ball.x, y: ball.y } : null;
    });

    expect(target).not.toBeNull();

    await page.mouse.click(target.x, target.y);

    await expect(page.locator('#config-panel')).toBeVisible();
    await expect(page.locator('[data-role="preset-category"]')).toHaveCount(5);
    await expect(page.locator('[data-role="custom-category-trigger"]')).toBeVisible();
  });

  test('keeps the panel inside the viewport when clicking a lower ball', async ({ page }) => {
    await page.evaluate(() => {
      const ball = window.BallManager?.balls?.find((item) => !item.isGold && !item.configured && !item.eaten);
      if (!ball) return;
      ball.x = 220;
      ball.y = window.innerHeight - 36;
    });

    await page.mouse.click(220, (await page.evaluate(() => window.innerHeight)) - 36);
    await expect(page.locator('#config-panel')).toBeVisible();

    const bounds = await page.locator('#config-panel').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      };
    });

    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth);
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportHeight);
  });

  test('can save a bill after selecting preset category and amount', async ({ page }) => {
    const target = await page.evaluate(() => {
      const ball = window.BallManager?.balls?.find((item) => !item.isGold && !item.configured && !item.eaten);
      return ball ? { x: ball.x, y: ball.y } : null;
    });

    expect(target).not.toBeNull();

    await page.mouse.click(target.x, target.y);
    await expect(page.locator('#config-panel')).toBeVisible();

    await page.locator('[data-role="preset-category"]').first().click();
    await page.locator('.amount-btn').first().click();
    await page.click('#panel-confirm');

    await page.waitForTimeout(1200);

    await page.evaluate(() => {
      window.Sidebar.open();
    });

    await expect(page.locator('.bill-item')).toHaveCount(1, { timeout: 5000 });
  });

  test('can create a custom category and save a bill with it', async ({ page }) => {
    const target = await page.evaluate(() => {
      const ball = window.BallManager?.balls?.find((item) => !item.isGold && !item.configured && !item.eaten);
      return ball ? { x: ball.x, y: ball.y } : null;
    });

    expect(target).not.toBeNull();

    await page.mouse.click(target.x, target.y);
    await expect(page.locator('#config-panel')).toBeVisible();

    await page.click('[data-role="custom-category-trigger"]');
    await page.fill('#new-cat-name', '宠物');
    await page.click('#save-cat-btn');

    await expect(page.locator('[data-role="custom-category"]')).toContainText('宠物');

    await page.locator('.amount-btn').nth(1).click();
    await page.click('#panel-confirm');
    await page.waitForTimeout(1200);

    await page.evaluate(() => {
      window.Sidebar.open();
    });

    await expect(page.locator('.bill-category')).toContainText('宠物');
  });
});
