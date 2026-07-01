import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { apiFetch, authedApiFetch, UnauthorizedError } from './client';
import { getAppToken } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({ getAppToken: vi.fn() }));

const getAppTokenMock = getAppToken as unknown as Mock;

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
		const fetchMock = vi
			.fn()
			.mockResolvedValue(mockFetchResponse({ value: 1 }));
		vi.stubGlobal('fetch', fetchMock);

		const options = { next: { revalidate: 3600 } };
		await apiFetch('/path', options);

		expect(fetchMock).toHaveBeenCalledWith(BASE_URL + '/path', options);
	});

	it('ApiFetch_GivenCacheOption_ExpectFetchCalledWithCacheOption', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(mockFetchResponse({ value: 1 }));
		vi.stubGlobal('fetch', fetchMock);

		const options = { cache: 'force-cache' as const };
		await apiFetch('/path', options);

		expect(fetchMock).toHaveBeenCalledWith(BASE_URL + '/path', options);
	});

	it('ApiFetch_GivenEmptyOptions_ExpectFetchCalledWithEmptyOptions', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(mockFetchResponse({ value: 1 }));
		vi.stubGlobal('fetch', fetchMock);

		await apiFetch<unknown>('/path', {});

		expect(fetchMock).toHaveBeenCalledWith(BASE_URL + '/path', {});
	});

	it('ApiFetch_GivenMissingApiUrl_ExpectThrowsAndFetchNeverCalled', async () => {
		delete process.env.NEXT_PUBLIC_API_URL;
		const fetchMock = vi
			.fn()
			.mockResolvedValue(mockFetchResponse({ value: 1 }));
		vi.stubGlobal('fetch', fetchMock);

		await expect(apiFetch('/path', {})).rejects.toThrow(
			'NEXT_PUBLIC_API_URL is not configured',
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('ApiFetch_GivenNonOkResponse_ExpectThrowsWithStatus', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(mockFetchResponse(null, false, 500));
		vi.stubGlobal('fetch', fetchMock);

		await expect(apiFetch('/path', {})).rejects.toThrow(
			'API request failed with status 500',
		);
	});

	it('ApiFetch_GivenOkResponse_ExpectReturnsParsedJson', async () => {
		const body = { appName: 'MyApp' };
		const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse(body));
		vi.stubGlobal('fetch', fetchMock);

		const result = await apiFetch<{ appName: string }>('/path', {});

		expect(result).toEqual(body);
	});
});

function headersFromCall(fetchMock: Mock): Headers {
	const init = fetchMock.mock.calls[0][1] as RequestInit;
	return new Headers(init.headers);
}

describe('authedApiFetch', () => {
	beforeEach(() => {
		process.env.NEXT_PUBLIC_API_URL = BASE_URL;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	it('AuthedApiFetch_GivenSession_ExpectBearerTokenAttached', async () => {
		getAppTokenMock.mockResolvedValue('app-jwt-123');
		const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse({ id: '1' }));
		vi.stubGlobal('fetch', fetchMock);

		await authedApiFetch('/users/me', {});

		expect(headersFromCall(fetchMock).get('Authorization')).toBe(
			'Bearer app-jwt-123',
		);
	});

	it('AuthedApiFetch_GivenNoSession_ExpectNoAuthorizationHeader', async () => {
		getAppTokenMock.mockResolvedValue(undefined);
		const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse({ id: '1' }));
		vi.stubGlobal('fetch', fetchMock);

		await authedApiFetch('/users/me', {});

		expect(headersFromCall(fetchMock).has('Authorization')).toBe(false);
	});

	it('AuthedApiFetch_Given401_ExpectThrowsUnauthorizedError', async () => {
		getAppTokenMock.mockResolvedValue('expired-jwt');
		const fetchMock = vi
			.fn()
			.mockResolvedValue(mockFetchResponse(null, false, 401));
		vi.stubGlobal('fetch', fetchMock);

		await expect(authedApiFetch('/users/me', {})).rejects.toBeInstanceOf(
			UnauthorizedError,
		);
	});

	it('AuthedApiFetch_GivenNonOkResponse_ExpectThrowsWithStatus', async () => {
		getAppTokenMock.mockResolvedValue('app-jwt-123');
		const fetchMock = vi
			.fn()
			.mockResolvedValue(mockFetchResponse(null, false, 500));
		vi.stubGlobal('fetch', fetchMock);

		await expect(authedApiFetch('/users/me', {})).rejects.toThrow(
			'API request failed with status 500',
		);
	});

	it('AuthedApiFetch_GivenOkResponse_ExpectReturnsParsedJson', async () => {
		getAppTokenMock.mockResolvedValue('app-jwt-123');
		const body = { id: '1', name: 'Ada Tester' };
		const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse(body));
		vi.stubGlobal('fetch', fetchMock);

		const result = await authedApiFetch<{ id: string; name: string }>(
			'/users/me',
			{},
		);

		expect(result).toEqual(body);
	});
});
