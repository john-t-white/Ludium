import { describe, expect, it } from 'vitest';
import nextConfig, { securityHeaders } from './next.config';

const CONFIRMED_CSP =
	"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";

describe('next.config security headers', () => {
	it('NextConfig_SecurityHeaders_ExpectContentSecurityPolicyPresent', () => {
		const csp = securityHeaders.find((h) => h.key === 'Content-Security-Policy');

		expect(csp).toBeDefined();
	});

	it('NextConfig_SecurityHeaders_ExpectCspMatchesConfirmedPolicy', () => {
		const csp = securityHeaders.find((h) => h.key === 'Content-Security-Policy');

		expect(csp?.value).toBe(CONFIRMED_CSP);
	});

	it('NextConfig_SecurityHeaders_ExpectCspIsEnforcingNotReportOnly', () => {
		const reportOnly = securityHeaders.find(
			(h) => h.key === 'Content-Security-Policy-Report-Only',
		);

		expect(reportOnly).toBeUndefined();
	});

	it('NextConfig_Headers_ExpectCspAppliedToAllRoutes', async () => {
		if (typeof nextConfig.headers !== 'function') {
			throw new Error('nextConfig.headers is not defined');
		}

		const headerGroups = await nextConfig.headers();
		const allRoutes = headerGroups.find((group) => group.source === '/(.*)');

		expect(allRoutes).toBeDefined();
		expect(allRoutes?.headers).toContainEqual({
			key: 'Content-Security-Policy',
			value: CONFIRMED_CSP,
		});
	});

	it('NextConfig_Headers_ExpectAllSecurityHeadersAppliedToAllRoutes', async () => {
		if (typeof nextConfig.headers !== 'function') {
			throw new Error('nextConfig.headers is not defined');
		}

		const headerGroups = await nextConfig.headers();
		const allRoutes = headerGroups.find((group) => group.source === '/(.*)');

		expect(allRoutes).toBeDefined();
		expect(allRoutes?.headers).toContainEqual({
			key: 'X-Content-Type-Options',
			value: 'nosniff',
		});
		expect(allRoutes?.headers).toContainEqual({
			key: 'X-Frame-Options',
			value: 'DENY',
		});
		expect(allRoutes?.headers).toContainEqual({
			key: 'Referrer-Policy',
			value: 'strict-origin-when-cross-origin',
		});
		expect(allRoutes?.headers).toContainEqual({
			key: 'X-Permitted-Cross-Domain-Policies',
			value: 'none',
		});
		expect(allRoutes?.headers).toContainEqual({
			key: 'Content-Security-Policy',
			value: CONFIRMED_CSP,
		});
	});
});
