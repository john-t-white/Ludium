import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e/tests',
	reporter: process.env.CI
		? [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }], ['junit', { outputFile: 'test-results/results.xml' }]]
		: 'list',
	timeout: 30000,
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
	},
	projects: [
		{
			name: 'desktop',
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'mobile',
			use: { ...devices['Pixel 5'] },
		},
	],
});
