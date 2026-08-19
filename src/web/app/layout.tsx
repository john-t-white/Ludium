import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import { ThemeToggle } from "./components/theme-toggle";
import { BreakpointIndicator } from "./components/breakpoint-indicator";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Ludium",
  description: "Board games, matched by how they actually played.",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <header className="flex items-center border-b border-header-border bg-header-bg px-6 py-6">
          <Image src="/ludium-logo.svg" alt="Ludium" width={140} height={53} priority />
        </header>
        <ThemeToggle />
        <BreakpointIndicator />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
