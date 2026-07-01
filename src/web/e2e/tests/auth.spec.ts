import { test, expect } from '@playwright/test';
import { Header } from '../pages/Header';
import { HomePage } from '../pages/HomePage';
import { signInAs, getSession } from '../helpers/auth';
import { primaryUser } from '../fixtures/testUsers';

test.describe('Authentication', () => {
	test('SignIn_WhenAnonymous_ShowsSignInButton', async ({ page }) => {
		const header = new Header(page);

		await page.goto('/');

		await expect(header.signInButton()).toBeVisible();
		await expect(header.signOutButton()).toHaveCount(0);
	});

	test('SignIn_WhenTestUserSignsIn_ShowsUserName', async ({ page }) => {
		const header = new Header(page);

		await signInAs(page, primaryUser);
		await page.goto('/');

		await expect(header.userName(primaryUser.name)).toBeVisible();
		await expect(header.signOutButton()).toBeVisible();
		await expect(header.signInButton()).toHaveCount(0);
	});

	test('SignOut_WhenSignedIn_ReturnsToAnonymousState', async ({ page }) => {
		const header = new Header(page);
		await signInAs(page, primaryUser);
		await page.goto('/');
		await expect(header.userName(primaryUser.name)).toBeVisible();

		await header.signOut();

		await expect(header.signInButton()).toBeVisible();
		await expect(header.userName(primaryUser.name)).toHaveCount(0);
		const cookies = await page.context().cookies();
		expect(cookies.find(c => c.name.includes('session-token'))).toBeUndefined();
		const session = await getSession(page);
		expect(session?.user).toBeFalsy();
	});

	test('AnonymousBrowsing_WhenNotSignedIn_WorksWithoutInterruption', async ({ page }) => {
		const home = new HomePage(page);
		const header = new Header(page);
		const errors: string[] = [];
		page.on('pageerror', err => errors.push(err.message));

		await home.goto();

		await expect(page).toHaveURL('/');
		await expect(home.wordmark()).toBeVisible();
		await expect(header.signInButton()).toBeVisible();
		expect(errors).toHaveLength(0);
	});

	test('SignIn_WhenConsentDenied_ReturnsToAnonymousStateNoErrorPage', async ({ page }) => {
		const header = new Header(page);
		const home = new HomePage(page);

		await page.goto('/auth/error?error=AccessDenied');

		// Settles on the home page in anonymous state — the real home content renders
		// (not an error screen) and the sign-in button is shown again.
		await expect(header.signInButton()).toBeVisible();
		await expect(page).toHaveURL('/');
		await expect(home.wordmark()).toBeVisible();
	});
});
