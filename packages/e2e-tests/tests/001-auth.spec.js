const { test, expect } = require('@playwright/test');
const { register, login, apiLogin, logout } = require('./helpers');

test.describe('User Authentication', () => {
  const testUser = `test${Date.now()}@example.com`;
  const testPassword = 'testPassword123!';

  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
  });

  test('should register a new user', async ({ page }) => {
    await register(page, testUser, testPassword);
    await expect(page.locator('text=Registration successful')).toBeVisible({ timeout: 10000 });
  });

  test('should not allow duplicate registration', async ({ page }) => {
    await register(page, testUser, testPassword);
    await expect(page.locator('text=User already exists')).toBeVisible({ timeout: 10000 });
  });

  test('should login with valid credentials', async ({ page }) => {
    await login(page, testUser, testPassword);
    await expect(page).toHaveURL('/');
  });

  test('should login with valid credentials via api', async ({ request }) => {
    await apiLogin(request, testUser, testPassword);
  });

  test('should not login with invalid credentials', async ({ page }) => {
    await login(page, testUser, 'wrongPassword');
    await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 10000 });
  });

  test('should logout successfully', async ({ page }) => {
    await login(page, testUser, testPassword);
    await logout(page);
    await expect(page).toHaveURL(/.*login.html/);
    await expect(page.locator('#login-form')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.fill('#register-email', 'invalid-email');
    await page.fill('#register-password', testPassword);
    await page.locator('#register-form').click();
    await expect(page.locator('text=Registration failed. Please try again.')).toBeVisible({ timeout: 10000 });
  });

  test('should enforce password strength requirements', async ({ page }) => {
    await page.fill('#register-email', `strong-password-test-${Date.now()}@example.com`);
    await page.fill('#register-password', 'weak');
    await page.locator('#register-form').click();
    await expect(page.locator('text=Registration failed. Please try again.')).toBeVisible({ timeout: 10000 });
  });

  test('should maintain session after page reload', async ({ page }) => {
    await login(page, testUser, testPassword);
    await expect(page).toHaveURL('/');
    await page.reload();
    await expect(page.locator('#login-logout-btn')).toContainText(testUser, { timeout: 10000 });
  });

  test('should redirect to login page when accessing protected route', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await expect(page).toHaveURL(/.*login.html/);
  });

  test('should handle server errors gracefully', async ({ page }) => {
    await page.route('**/login', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ message: 'Internal Server Error' }),
      });
    });
    await page.fill('#email', testUser);
    await page.fill('#password', testPassword);
    await page.locator('#login-form').click();
    await expect(page.locator('text=Internal Server Error')).toBeVisible({ timeout: 10000 });
  });

  test('should clear user data after logout', async ({ page, context }) => {
    await login(page, testUser, testPassword);
    await logout(page);
    const localStorage = await context.storageState();
    expect(localStorage.origins[0].localStorage.find(item => item.name === 'token')).toBeUndefined();
    expect(localStorage.origins[0].localStorage.find(item => item.name === 'email')).toBeUndefined();
  });

  test('should not allow access to protected routes after logout', async ({ page }) => {
    await login(page, testUser, testPassword);
    await logout(page);
    await page.goto('/');
    await expect(page).toHaveURL(/.*login.html/);
  });
});