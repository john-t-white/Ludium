import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './client';
import { getAppName } from './appApi';

vi.mock('./client', () => ({
	apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

describe('getAppName', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		apiFetchMock.mockReset();
	});

	it('GetAppName_GivenApiFetchRejects_ExpectFallbackName', async () => {
		apiFetchMock.mockRejectedValue(new Error('network error'));

		const result = await getAppName();

		expect(result).toBe('Ludium');
	});

	it('GetAppName_GivenApiFetchResolves_ExpectReturnedAppName', async () => {
		apiFetchMock.mockResolvedValue({ appName: 'MyApp' });

		const result = await getAppName();

		expect(result).toBe('MyApp');
	});

	it('GetAppName_WhenCalled_ExpectApiFetchCalledWithPathAndRevalidate', async () => {
		apiFetchMock.mockResolvedValue({ appName: 'MyApp' });

		await getAppName();

		expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/app-info', {
			next: { revalidate: 3600 },
		});
	});
});
