import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { getToken } from 'next-auth/jwt';
import { headers } from 'next/headers';

// Aligned to the API's app-JWT lifetime (60 min). With the default `updateAge`
// (24h) exceeding this, the session never slides — expiry is absolute from login,
// so the Auth.js session can never outlive the API token it carries.
const SESSION_MAX_AGE_SECONDS = 60 * 60;

// The test-login path bypasses real Google verification, so it must be
// structurally impossible in production: the provider below is only constructed
// when this is true, and a production build carrying the flag fails fast.
const testLoginEnabled =
	process.env.NODE_ENV !== 'production' &&
	process.env.AUTH_ENABLE_TEST_LOGIN === 'true';

if (
	process.env.NODE_ENV === 'production' &&
	process.env.AUTH_ENABLE_TEST_LOGIN === 'true'
) {
	throw new Error(
		'AUTH_ENABLE_TEST_LOGIN must never be enabled in production — the test-login path bypasses Google verification.',
	);
}

type LoginResponse = {
	token: string;
	user: { id: string; name: string };
};

function requireApiBaseUrl(): string {
	const baseUrl = process.env.NEXT_PUBLIC_API_URL;
	if (!baseUrl) {
		throw new Error('NEXT_PUBLIC_API_URL is not configured');
	}
	return baseUrl;
}

async function postJson(path: string, body: unknown): Promise<LoginResponse> {
	const response = await fetch(`${requireApiBaseUrl()}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
		cache: 'no-store',
	});
	if (!response.ok) {
		throw new Error(`${path} failed with status ${response.status}`);
	}
	return (await response.json()) as LoginResponse;
}

// Reads the `exp` claim (seconds since epoch) from the API's app JWT so the
// Auth.js session's absolute expiry stays in lockstep with the token even if the
// API changes its lifetime. The signature is verified by the API on every
// request — we only need the timing here, never trust, so we don't verify it.
function readAppTokenExpMs(appToken: string): number | undefined {
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

const providers: NextAuthConfig['providers'] = [
	Google({
		clientId: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		authorization: { params: { scope: 'openid email profile' } },
	}),
];

if (testLoginEnabled) {
	providers.push(
		Credentials({
			id: 'test-login',
			name: 'Test Login',
			credentials: {
				googleSubjectId: {},
				name: {},
			},
			async authorize(credentials) {
				const googleSubjectId = credentials?.googleSubjectId;
				const name = credentials?.name;
				if (typeof googleSubjectId !== 'string' || typeof name !== 'string') {
					return null;
				}
				const { token, user } = await postJson('/api/v1/auth/test-login', {
					googleSubjectId,
					name,
				});
				return { id: user.id, name: user.name, appToken: token };
			},
		}),
	);
}

const config: NextAuthConfig = {
	providers,
	session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE_SECONDS },
	trustHost: true,
	pages: { error: '/auth/error' },
	callbacks: {
		async jwt({ token, account, user }) {
			// `account` is only present on the initial sign-in.
			if (!account) {
				return token;
			}
			if (account.provider === 'google' && account.id_token) {
				const { token: appToken, user: appUser } = await postJson(
					'/api/v1/auth/login',
					{ idToken: account.id_token },
				);
				token.appToken = appToken;
				token.userId = appUser.id;
				token.name = appUser.name;
				token.appTokenExpMs = readAppTokenExpMs(appToken);
			} else if (account.provider === 'test-login' && user?.appToken) {
				token.appToken = user.appToken;
				token.userId = user.id;
				token.name = user.name ?? null;
				token.appTokenExpMs = readAppTokenExpMs(user.appToken);
			}
			return token;
		},
		async session({ session, token }) {
			// Belt-and-braces alongside the absolute `maxAge`: once past the app
			// token's own expiry, present the session as signed-out so the UI stops
			// showing a signed-in state backed by a dead API token.
			const expired =
				typeof token.appTokenExpMs === 'number' &&
				Date.now() >= token.appTokenExpMs;
			if (expired) {
				session.user.id = '';
				session.user.name = null;
				return session;
			}
			session.user.id = typeof token.userId === 'string' ? token.userId : '';
			session.user.name = typeof token.name === 'string' ? token.name : null;
			return session;
		},
	},
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);

// Server-only accessor for the API app JWT. It lives in the encrypted Auth.js
// session cookie and is never exposed via the client `session` object, so calls
// to the .NET API (made server-side) read it here to attach as a Bearer token.
export async function getAppToken(): Promise<string | undefined> {
	const secret = process.env.AUTH_SECRET;
	if (!secret) {
		return undefined;
	}
	const token = await getToken({
		req: { headers: await headers() },
		secret,
	});
	return typeof token?.appToken === 'string' ? token.appToken : undefined;
}
