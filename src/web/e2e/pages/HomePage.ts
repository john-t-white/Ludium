import { Page } from '@playwright/test';

export class HomePage {
	constructor(private page: Page) {}

	async goto() {
		await this.page.goto('/');
	}

	wordmark() {
		// Scoped to main content: the header also renders a "LUDIUM" brand logo,
		// so an unscoped lookup would match two elements.
		return this.page.getByRole('main').getByText('LUDIUM');
	}
}
