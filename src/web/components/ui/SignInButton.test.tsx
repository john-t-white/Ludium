import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { signIn } from 'next-auth/react';
import { SignInButton } from './SignInButton';

vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/games' }));

const signInMock = signIn as unknown as Mock;

describe('SignInButton', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('SignInButton_WhenRendered_ExpectAccessibleGoogleButton', () => {
		render(<SignInButton />);

		expect(
			screen.getByRole('button', { name: /sign in with google/i }),
		).toBeInTheDocument();
	});

	it('SignInButton_WhenClicked_ExpectSignInWithGoogleAndCurrentPathCallback', () => {
		render(<SignInButton />);

		fireEvent.click(
			screen.getByRole('button', { name: /sign in with google/i }),
		);

		expect(signInMock).toHaveBeenCalledWith('google', {
			callbackUrl: '/games',
		});
	});
});
