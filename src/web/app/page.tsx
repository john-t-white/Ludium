import { getAppName } from '@/lib/api/appApi';

export default async function HomePage() {
	const appName = await getAppName();

	return (
		<main className="flex min-h-screen flex-col items-center justify-center">
			<div className="text-center">
				<h1 className="text-4xl font-bold tracking-tight">{appName}</h1>
				<p className="mt-4 text-lg text-gray-500">
					A social platform for tabletop gaming
				</p>
			</div>
		</main>
	);
}
