import type { Metadata } from 'next';
import { Geist, Geist_Mono, Poppins } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

const poppins = Poppins({
	variable: '--font-poppins-var',
	weight: ['700'],
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'Ludium',
	description: 'Ludium — the social platform for tabletop gaming',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} antialiased`}
			>
				<Header />
				{children}
			</body>
		</html>
	);
}
