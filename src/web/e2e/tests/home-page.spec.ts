import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

test.describe('Home page', () => {
	test('HomePage_WhenLoaded_DisplaysLogo', async ({ page }) => {
		const home = new HomePage(page);

		await home.goto();

		await expect(page).toHaveTitle('Ludium');
		await expect(home.wordmark()).toBeVisible();
	});

	test('HomePage_WhenLoaded_HasNoPageErrors', async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', err => errors.push(err.message));
		const home = new HomePage(page);

		await home.goto();

		await expect(home.wordmark()).toBeVisible();
		expect(errors).toHaveLength(0);
	});
});
