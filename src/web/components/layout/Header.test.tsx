import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import { auth } from '@/lib/auth';
import { Header } from './Header';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/components/ui/SignInButton', () => ({
	SignInButton: () => <button type="button">Sign in with Google</button>,
}));
vi.mock('@/components/ui/SignOutButton', () => ({
	SignOutButton: () => <button type="button">Sign out</button>,
}));

const authMock = auth as unknown as Mock;

describe('Header', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('Header_WhenSignedIn_ExpectNameAndSignOutButton', async () => {
		authMock.mockResolvedValue({ user: { id: 'user-1', name: 'Ada Tester' } });

		render(await Header());

		expect(screen.getByText('Ada Tester')).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /sign out/i }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /sign in with google/i }),
		).not.toBeInTheDocument();
	});

	it('Header_WhenSignedOut_ExpectSignInButtonAndNoUserName', async () => {
		authMock.mockResolvedValue(null);

		render(await Header());

		expect(
			screen.getByRole('button', { name: /sign in with google/i }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /sign out/i }),
		).not.toBeInTheDocument();
	});

	it('Header_WhenSessionExpiredAndNameCleared_ExpectSignedOutUi', async () => {
		// The session callback nulls the name once the app token has expired; the
		// header must then present the signed-out state (name gone, sign-in back).
		authMock.mockResolvedValue({ user: { id: '', name: null } });

		render(await Header());

		expect(
			screen.getByRole('button', { name: /sign in with google/i }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /sign out/i }),
		).not.toBeInTheDocument();
	});
});
