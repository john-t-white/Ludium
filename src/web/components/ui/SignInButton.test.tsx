import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { signIn } from 'next-auth/react';
import { SignInButton } from './SignInButton';

vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));

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

	it('SignInButton_WhenClicked_ExpectCallbackPreservesPathAndQueryString', () => {
		window.history.pushState({}, '', '/games?filter=coop&page=2');
		render(<SignInButton />);

		fireEvent.click(
			screen.getByRole('button', { name: /sign in with google/i }),
		);

		expect(signInMock).toHaveBeenCalledWith('google', {
			callbackUrl: '/games?filter=coop&page=2',
		});
	});

	it('SignInButton_WhenClickedWithoutQuery_ExpectCallbackIsPathOnly', () => {
		window.history.pushState({}, '', '/games');
		render(<SignInButton />);

		fireEvent.click(
			screen.getByRole('button', { name: /sign in with google/i }),
		);

		expect(signInMock).toHaveBeenCalledWith('google', {
			callbackUrl: '/games',
		});
	});
});
