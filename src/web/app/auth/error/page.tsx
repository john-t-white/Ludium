import { redirect } from 'next/navigation';

type AuthErrorPageProps = {
	searchParams: Promise<{ error?: string }>;
};

// NFR-2: a visitor who cancels or denies Google consent must not be interrupted.
// Auth.js routes all OAuth errors here; we render nothing and return them to
// anonymous browsing on the home page. Genuine misconfigurations are still
// logged server-side so they stay observable without surfacing an error screen.
export default async function AuthErrorPage({
	searchParams,
}: AuthErrorPageProps) {
	const { error } = await searchParams;
	if (error && error !== 'AccessDenied') {
		console.error(`Auth.js sign-in error: ${error}`);
	}
	redirect('/');
}
