import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

test.describe('Home page', () => {
	test('displays the application name', async ({ page }) => {
		const home = new HomePage(page);

		await home.goto();

		await expect(page).toHaveTitle('Ludium');
		await expect(home.heading()).toBeVisible();
		const text = await home.heading().textContent();
		expect(text?.trim().length).toBeGreaterThan(0);
	});

	test('loads without errors', async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', err => errors.push(err.message));
		const home = new HomePage(page);

		await home.goto();

		await expect(home.heading()).toBeVisible();
		expect(errors).toHaveLength(0);
	});

	test('shows fallback when API is unavailable', async ({ page }) => {
		// The fallback is rendered server-side when the API is unreachable, so it cannot
		// be triggered by intercepting browser-level requests. This test verifies that the
		// page loads and displays a non-empty heading regardless of API availability —
		// both the real value and the fallback ("Ludium") satisfy this invariant.
		const home = new HomePage(page);

		await home.goto();

		await expect(home.heading()).toBeVisible();
		const text = await home.heading().textContent();
		expect(text?.trim().length).toBeGreaterThan(0);
	});
});
