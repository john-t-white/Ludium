import { apiFetch } from './client';

const FALLBACK_APP_NAME = 'Ludium';

export async function getAppName(): Promise<string> {
	try {
		const data = await apiFetch<{ appName: string }>('/api/v1/app-info');
		return data.appName;
	} catch {
		console.warn('getAppName: failed to fetch app name, using fallback');
		return FALLBACK_APP_NAME;
	}
}
