'use client';

import { signIn } from 'next-auth/react';

export function SignInButton() {
	// Read the URL at click time (client-only) so the return redirect preserves
	// the full path plus query-string state (filters/pagination), per the URL-state
	// convention in src/web/CLAUDE.md. Using useSearchParams here would force a
	// Suspense boundary on every page, since this button lives in the global header.
	const handleSignIn = () => {
		const callbackUrl = window.location.pathname + window.location.search;
		signIn('google', { callbackUrl });
	};

	return (
		<button
			type="button"
			onClick={handleSignIn}
			className="inline-flex min-h-11 items-center rounded-md border border-foreground/20 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
		>
			Sign in with Google
		</button>
	);
}
