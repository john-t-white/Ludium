import { Page } from '@playwright/test';

export class HomePage {
	constructor(private page: Page) {}

	async goto() {
		await this.page.goto('/');
	}

	heading() {
		return this.page.getByRole('heading', { level: 1 });
	}
}
