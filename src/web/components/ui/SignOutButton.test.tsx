import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { signOut } from 'next-auth/react';
import { SignOutButton } from './SignOutButton';

vi.mock('next-auth/react', () => ({ signOut: vi.fn() }));

const signOutMock = signOut as unknown as Mock;

describe('SignOutButton', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('SignOutButton_WhenRendered_ExpectAccessibleSignOutButton', () => {
		render(<SignOutButton />);

		expect(
			screen.getByRole('button', { name: /sign out/i }),
		).toBeInTheDocument();
	});

	it('SignOutButton_WhenClicked_ExpectSignOutReturningToHome', () => {
		render(<SignOutButton />);

		fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

		expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: '/' });
	});
});
