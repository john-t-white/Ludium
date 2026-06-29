import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './client';

const BASE_URL = 'https://api.example.test';

function mockFetchResponse(body: unknown, ok = true, status = 200): Response {
	return {
		ok,
		status,
		json: () => Promise.resolve(body),
	} as Response;
}

describe('apiFetch', () => {
	beforeEach(() => {
		process.env.NEXT_PUBLIC_API_URL = BASE_URL;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('ApiFetch_GivenOptions_ExpectOptionsSpreadIntoFetchCall', async () => {
		const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse({ value: 1 }));
		vi.stubGlobal('fetch', fetchMock);

		const options = { next: { revalidate: 3600 } };
		await apiFetch('/path', options);

		expect(fetchMock).toHaveBeenCalledWith(BASE_URL + '/path', options);
	});

	it('ApiFetch_GivenCacheOption_ExpectFetchCalledWithCacheOption', async () => {
		const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse({ value: 1 }));
		vi.stubGlobal('fetch', fetchMock);

		const options = { cache: 'force-cache' as const };
		await apiFetch('/path', options);

		expect(fetchMock).toHaveBeenCalledWith(BASE_URL + '/path', options);
	});

	it('ApiFetch_GivenNoOptions_ExpectFetchCalledWithUndefinedOptions', async () => {
		const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse({ value: 1 }));
		vi.stubGlobal('fetch', fetchMock);

		await apiFetch('/path');

		expect(fetchMock).toHaveBeenCalledWith(BASE_URL + '/path', undefined);
	});

	it('ApiFetch_GivenMissingApiUrl_ExpectThrowsAndFetchNeverCalled', async () => {
		delete process.env.NEXT_PUBLIC_API_URL;
		const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse({ value: 1 }));
		vi.stubGlobal('fetch', fetchMock);

		await expect(apiFetch('/path')).rejects.toThrow('NEXT_PUBLIC_API_URL is not configured');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('ApiFetch_GivenNonOkResponse_ExpectThrowsWithStatus', async () => {
		const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse(null, false, 500));
		vi.stubGlobal('fetch', fetchMock);

		await expect(apiFetch('/path')).rejects.toThrow('API request failed with status 500');
	});

	it('ApiFetch_GivenOkResponse_ExpectReturnsParsedJson', async () => {
		const body = { appName: 'MyApp' };
		const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse(body));
		vi.stubGlobal('fetch', fetchMock);

		const result = await apiFetch<{ appName: string }>('/path');

		expect(result).toEqual(body);
	});
});
