'use client';

import { signIn } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export function SignInButton() {
	const pathname = usePathname();

	return (
		<button
			type="button"
			onClick={() => signIn('google', { callbackUrl: pathname })}
			className="inline-flex min-h-11 items-center rounded-md border border-foreground/20 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
		>
			Sign in with Google
		</button>
	);
}
