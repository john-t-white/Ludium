import { Page } from '@playwright/test';

export class HomePage {
	constructor(private page: Page) {}

	async goto() {
		await this.page.goto('/');
	}

	wordmark() {
		return this.page.getByText('LUDIUM');
	}
}
