import { Page, expect } from '@playwright/test';
import { TestUser } from '../fixtures/testUsers';

/**
 * Establishes a real Auth.js session for `user` by driving the env-gated
 * `test-login` credentials provider through the standard Auth.js endpoints.
 * The session httpOnly cookie is set on the page's browser context, so any
 * subsequent navigation renders the signed-in UI. Requires the app to run with
 * AUTH_ENABLE_TEST_LOGIN=true and the .NET API reachable via NEXT_PUBLIC_API_URL.
 */
export async function signInAs(page: Page, user: TestUser): Promise<void> {
	const csrfResponse = await page.request.get('/api/auth/csrf');
	expect(csrfResponse.ok()).toBeTruthy();
	const { csrfToken } = await csrfResponse.json();

	const callbackResponse = await page.request.post('/api/auth/callback/test-login', {
		form: {
			csrfToken,
			googleSubjectId: user.googleSubjectId,
			name: user.name,
			callbackUrl: '/',
			json: 'true',
		},
	});
	expect(callbackResponse.ok()).toBeTruthy();
}

/** Returns the current Auth.js session payload; `null` when anonymous. */
export async function getSession(page: Page): Promise<{ user?: { name?: string } } | null> {
	const response = await page.request.get('/api/auth/session');
	expect(response.ok()).toBeTruthy();
	return response.json();
}
