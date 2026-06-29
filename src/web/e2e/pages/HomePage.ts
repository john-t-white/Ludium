import { Page } from '@playwright/test';

export class HomePage {
	constructor(private page: Page) {}

	async goto() {
		await this.page.goto('/');
	}

	logo() {
		return this.page.getByRole('img', { name: /ludium/i });
	}

	wordmark() {
		return this.page.getByText('LUDIUM');
	}
}
