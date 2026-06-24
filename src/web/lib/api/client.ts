export async function apiFetch<T>(path: string): Promise<T> {
	const baseUrl = process.env.NEXT_PUBLIC_API_URL;

	if (!baseUrl) {
		console.warn('NEXT_PUBLIC_API_URL is not set');
		throw new Error('NEXT_PUBLIC_API_URL is not configured');
	}

	const response = await fetch(baseUrl + path, { cache: 'no-store' });

	if (!response.ok) {
		throw new Error(`API request failed with status ${response.status}`);
	}

	return response.json() as Promise<T>;
}
