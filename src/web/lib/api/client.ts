import { getAppToken } from '@/lib/auth';

export type ApiFetchOptions = {
	cache?: RequestCache;
	next?: NextFetchRequestConfig;
	headers?: HeadersInit;
};

/** Thrown by `authedApiFetch` when the API rejects the app token (expired or invalid). */
export class UnauthorizedError extends Error {
	constructor() {
		super('API request was unauthorized');
		this.name = 'UnauthorizedError';
	}
}

function resolveBaseUrl(): string {
	const baseUrl = process.env.NEXT_PUBLIC_API_URL;

	if (!baseUrl) {
		console.warn('NEXT_PUBLIC_API_URL is not set');
		throw new Error('NEXT_PUBLIC_API_URL is not configured');
	}

	return baseUrl;
}

/**
 * Fetches from the API. Each call site must declare its own caching intent via `options`.
 * For dynamic or user-specific data, pass `{ cache: 'no-store' }` explicitly.
 */
export async function apiFetch<T>(
	path: string,
	options: ApiFetchOptions,
): Promise<T> {
	const response = await fetch(resolveBaseUrl() + path, options);

	if (!response.ok) {
		throw new Error(`API request failed with status ${response.status}`);
	}

	return response.json() as Promise<T>;
}

/**
 * Fetches from the API on behalf of the signed-in user, attaching the app JWT as
 * a Bearer token. Server-side only (reads the encrypted session cookie). Throws
 * `UnauthorizedError` on a 401 so callers can transition the user to signed-out.
 */
export async function authedApiFetch<T>(
	path: string,
	options: ApiFetchOptions = {},
): Promise<T> {
	const token = await getAppToken();
	const headers = new Headers(options.headers);
	if (token) {
		headers.set('Authorization', `Bearer ${token}`);
	}

	const response = await fetch(resolveBaseUrl() + path, {
		...options,
		headers,
	});

	if (response.status === 401) {
		throw new UnauthorizedError();
	}
	if (!response.ok) {
		throw new Error(`API request failed with status ${response.status}`);
	}

	return response.json() as Promise<T>;
}
