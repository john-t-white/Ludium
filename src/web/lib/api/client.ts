export type ApiFetchOptions = {
	cache?: RequestCache;
	next?: NextFetchRequestConfig;
};

/**
 * Fetches from the API. Each call site must declare its own caching intent via `options`.
 * For dynamic or user-specific data, pass `{ cache: 'no-store' }` explicitly.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions): Promise<T> {
	const baseUrl = process.env.NEXT_PUBLIC_API_URL;

	if (!baseUrl) {
		console.warn('NEXT_PUBLIC_API_URL is not set');
		throw new Error('NEXT_PUBLIC_API_URL is not configured');
	}

	const response = await fetch(baseUrl + path, options);

	if (!response.ok) {
		throw new Error(`API request failed with status ${response.status}`);
	}

	return response.json() as Promise<T>;
}
