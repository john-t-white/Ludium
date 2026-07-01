import { Page, Locator } from '@playwright/test';

/**
 * The global header rendered by the root layout on every page. Encapsulates the
 * signed-in / signed-out controls so specs never reference raw locators. The
 * header controls are directly visible at both desktop and mobile viewports.
 */
export class Header {
	constructor(private page: Page) {}

	private banner(): Locator {
		return this.page.getByRole('banner');
	}

	signInButton(): Locator {
		return this.banner().getByRole('button', { name: /sign in with google/i });
	}

	signOutButton(): Locator {
		return this.banner().getByRole('button', { name: /sign out/i });
	}

	userName(name: string): Locator {
		return this.banner().getByText(name);
	}

	async signOut(): Promise<void> {
		await this.signOutButton().click();
	}
}
