import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Global Accessibility', () => {
  test('app has proper document structure', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang');
  });

  test('all interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    const isFocusable =
      (await focusedElement.evaluate((el) => {
        const tagName = el.tagName.toLowerCase();
        return ['input', 'button', 'a', 'select', 'textarea'].includes(tagName);
      })) || (await focusedElement.getAttribute('tabindex')) !== null;

    expect(isFocusable).toBeTruthy();
  });

  test('form inputs have associated labels', async ({ page }) => {
    await page.goto('/');

    const inputs = page.locator('input:not([type="hidden"])');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const placeholder = await input.getAttribute('placeholder');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      const hasLabel =
        (id && (await page.locator(`label[for="${id}"]`).count())) > 0 ||
        placeholder !== null ||
        ariaLabel !== null ||
        ariaLabelledBy !== null;

      expect(hasLabel).toBeTruthy();
    }
  });

  test('buttons have accessible names', async ({ page }) => {
    await page.goto('/');

    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');

      const hasAccessibleName = (text && text.trim().length > 0) || ariaLabel !== null || title !== null;

      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('color contrast is sufficient', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();

    const colorContrastViolations = accessibilityScanResults.violations.filter(
      (violation) => violation.id === 'color-contrast',
    );

    expect(colorContrastViolations).toEqual([]);
  });
});
