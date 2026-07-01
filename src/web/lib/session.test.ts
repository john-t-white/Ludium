import { describe, expect, it } from 'vitest';
import { readAppTokenExpMs, resolveSessionUser } from './session';

function jwtWithPayload(payload: unknown): string {
	const segment = Buffer.from(JSON.stringify(payload)).toString('base64url');
	return `header.${segment}.signature`;
}

describe('readAppTokenExpMs', () => {
	it('ReadAppTokenExpMs_GivenNumericExp_ExpectMilliseconds', () => {
		const token = jwtWithPayload({ exp: 1_700_000_000, sub: 'user-1' });

		expect(readAppTokenExpMs(token)).toBe(1_700_000_000_000);
	});

	it('ReadAppTokenExpMs_GivenNoExpClaim_ExpectUndefined', () => {
		const token = jwtWithPayload({ sub: 'user-1' });

		expect(readAppTokenExpMs(token)).toBeUndefined();
	});

	it('ReadAppTokenExpMs_GivenNonNumericExp_ExpectUndefined', () => {
		const token = jwtWithPayload({ exp: 'not-a-number' });

		expect(readAppTokenExpMs(token)).toBeUndefined();
	});

	it('ReadAppTokenExpMs_GivenMissingPayloadSegment_ExpectUndefined', () => {
		expect(readAppTokenExpMs('single-segment')).toBeUndefined();
	});

	it('ReadAppTokenExpMs_GivenMalformedPayload_ExpectUndefined', () => {
		expect(
			readAppTokenExpMs('header.@@@not-json@@@.signature'),
		).toBeUndefined();
	});
});

describe('resolveSessionUser', () => {
	const now = 1_700_000_000_000;

	it('ResolveSessionUser_GivenUnexpiredToken_ExpectIdentity', () => {
		const user = resolveSessionUser(
			{ userId: 'user-1', name: 'Ada Tester', appTokenExpMs: now + 60_000 },
			now,
		);

		expect(user).toEqual({ id: 'user-1', name: 'Ada Tester' });
	});

	it('ResolveSessionUser_GivenExpiredToken_ExpectSignedOut', () => {
		const user = resolveSessionUser(
			{ userId: 'user-1', name: 'Ada Tester', appTokenExpMs: now - 1 },
			now,
		);

		expect(user).toEqual({ id: '', name: null });
	});

	it('ResolveSessionUser_GivenExpiryExactlyNow_ExpectSignedOut', () => {
		const user = resolveSessionUser(
			{ userId: 'user-1', name: 'Ada Tester', appTokenExpMs: now },
			now,
		);

		expect(user).toEqual({ id: '', name: null });
	});

	it('ResolveSessionUser_GivenNoExpiry_ExpectIdentityKept', () => {
		const user = resolveSessionUser(
			{ userId: 'user-1', name: 'Ada Tester' },
			now,
		);

		expect(user).toEqual({ id: 'user-1', name: 'Ada Tester' });
	});

	it('ResolveSessionUser_GivenMissingClaims_ExpectEmptyIdentity', () => {
		const user = resolveSessionUser({}, now);

		expect(user).toEqual({ id: '', name: null });
	});
});
