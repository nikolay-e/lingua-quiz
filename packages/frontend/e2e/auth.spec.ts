import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Authentication Flow', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByPlaceholder('Username')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByText(/need an account/i)).toBeVisible();
  });

  test('login form validation', async ({ page }) => {
    await page.goto('/');

    const submitButton = page.getByRole('button', { name: /sign in/i });
    const usernameInput = page.getByPlaceholder('Username');

    await expect(usernameInput).toHaveAttribute('required');
    await expect(submitButton).toBeEnabled();
  });

  test('can navigate to register page', async ({ page }) => {
    await page.goto('/');

    await page.getByText(/register here/i).click();
    await expect(page.getByRole('heading', { name: /register/i })).toBeVisible();
  });

  test('login page meets accessibility standards', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('can type in form fields', async ({ page }) => {
    await page.goto('/');

    const usernameInput = page.getByPlaceholder('Username');
    await usernameInput.fill('testuser');
    await expect(usernameInput).toHaveValue('testuser');

    const passwordInput = page.locator('#password');
    await passwordInput.fill('testpassword');
    await expect(passwordInput).toHaveValue('testpassword');
  });

  test('password field has toggle visibility', async ({ page }) => {
    await page.goto('/');

    const passwordInput = page.locator('#password');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = page.locator('.toggle-password-btn');
    await toggleButton.click();

    await expect(passwordInput).toHaveAttribute('type', 'text');
  });
});

test.describe('Registration Flow', () => {
  test('register page renders correctly', async ({ page }) => {
    await page.goto('/');
    await page.getByText(/register here/i).click();

    await expect(page.getByRole('heading', { name: /register/i })).toBeVisible();
    await expect(page.getByPlaceholder('Username')).toBeVisible();
    await expect(page.getByRole('button', { name: /register/i })).toBeVisible();
  });

  test('can navigate back to login', async ({ page }) => {
    await page.goto('/');
    await page.getByText(/register here/i).click();
    await page.getByText(/login here/i).click();

    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('register page meets accessibility standards', async ({ page }) => {
    await page.goto('/');
    await page.getByText(/register here/i).click();

    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
