import { Logo } from "@/components/ui/Logo";

export default function HomePage() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center">
			<div className="text-center">
				<Logo />
				<p className="mt-4 text-lg text-gray-500">
					A social platform for tabletop gaming
				</p>
			</div>
		</main>
	);
}
