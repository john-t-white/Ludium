import Link from 'next/link';
import { auth } from '@/lib/auth';
import { Logo } from '@/components/ui/Logo';
import { SignInButton } from '@/components/ui/SignInButton';
import { SignOutButton } from '@/components/ui/SignOutButton';

export async function Header() {
	const session = await auth();
	const name = session?.user?.name;

	return (
		<header className="border-b border-foreground/10">
			<nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
				<Link
					href="/"
					className="inline-flex items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
					aria-label="Ludium home"
				>
					<Logo />
				</Link>
				<div className="flex items-center gap-3">
					{name ? (
						<>
							<span className="text-sm text-foreground">{name}</span>
							<SignOutButton />
						</>
					) : (
						<SignInButton />
					)}
				</div>
			</nav>
		</header>
	);
}
