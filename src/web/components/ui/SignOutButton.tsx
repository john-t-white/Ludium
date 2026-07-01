'use client';

import { signOut } from 'next-auth/react';

export function SignOutButton() {
	return (
		<button
			type="button"
			onClick={() => signOut({ callbackUrl: '/' })}
			className="inline-flex min-h-11 items-center rounded-md border border-foreground/20 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
		>
			Sign out
		</button>
	);
}
