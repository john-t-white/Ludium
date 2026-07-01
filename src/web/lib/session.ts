// Pure session-token helpers, kept separate from lib/auth.ts so they can be
// unit-tested without triggering the module-level NextAuth(config) call.

export type SessionUser = {
	id: string;
	name: string | null;
};

type StoredClaims = {
	userId?: unknown;
	name?: unknown;
	appTokenExpMs?: unknown;
};

/**
 * Reads the `exp` claim (seconds since epoch) from the API's app JWT and returns
 * it in milliseconds. The API verifies the signature on every request — we only
 * need the timing here, never trust — so the token is not verified. Returns
 * `undefined` when the token is malformed or carries no numeric `exp`.
 */
export function readAppTokenExpMs(appToken: string): number | undefined {
	const payloadSegment = appToken.split('.')[1];
	if (!payloadSegment) {
		return undefined;
	}
	try {
		const payload = JSON.parse(
			Buffer.from(payloadSegment, 'base64url').toString('utf8'),
		) as { exp?: unknown };
		return typeof payload.exp === 'number' ? payload.exp * 1000 : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Decides the user identity a session should present. Once past the app token's
 * absolute expiry the session presents as signed-out (empty id, null name) so the
 * UI never shows a signed-in state backed by a dead API token.
 */
export function resolveSessionUser(
	token: StoredClaims,
	nowMs: number,
): SessionUser {
	const expMs =
		typeof token.appTokenExpMs === 'number' ? token.appTokenExpMs : undefined;
	if (expMs !== undefined && nowMs >= expMs) {
		return { id: '', name: null };
	}
	return {
		id: typeof token.userId === 'string' ? token.userId : '',
		name: typeof token.name === 'string' ? token.name : null,
	};
}
