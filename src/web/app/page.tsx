import Image from "next/image";
import { HeroTiles } from "./components/hero-tiles";

const heroTiles: [string, string][] = [
  ["#f59e0b", "#d9702f"],
  ["#5b9279", "#3d7259"],
  ["#4f7fb0", "#6f9c5e"],
  ["#c9524f", "#8a6fbf"],
  ["#e8865a", "#d9702f"],
  ["#3d7259", "#5b9279"],
  ["#8a6fbf", "#c9524f"],
  ["#6f9c5e", "#4f7fb0"],
];

const features = [
  {
    title: "Log the feeling, not just a score",
    body: "A quick, honest read on how a play actually felt — no star ratings pretending to be objective.",
  },
  {
    title: "Get matched, not reviewed",
    body: "Find your next favorite game — and other players who felt exactly like you did.",
  },
  {
    title: "Already on BoardGameGeek?",
    body: "Import your whole collection in one click and start logging plays right away.",
    logo: true,
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16 lg:gap-24 lg:py-24">
      <section className="flex flex-col items-center gap-12 text-center lg:flex-row lg:items-center lg:gap-16 lg:text-left">
        <div className="flex flex-col items-center lg:items-start">
          <h1 className="max-w-xl font-sora text-4xl font-extrabold text-text-primary lg:text-5xl">
            Track how you feel about every game you play.
          </h1>
          <p className="mt-6 max-w-md text-lg text-text-secondary">
            Log plays, capture what stuck with you, and get matched to games —
            and people — who feel the same way.
          </p>
          <button
            type="button"
            className="mt-8 flex items-center gap-2.5 rounded-lg border border-input-border bg-input-bg px-7 py-4 text-[15px] font-semibold text-[#3c4043]"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
              />
              <path
                fill="#FBBC05"
                d="M3.97 10.72A5.4 5.4 0 0 1 3.69 9c0-.6.1-1.18.28-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
        <HeroTiles tiles={heroTiles} />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-5">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-card-border bg-card-bg p-8"
          >
            <h2 className="font-sora text-base font-bold text-text-primary">
              {feature.title}
            </h2>
            <p className="mt-2.5 text-sm text-text-secondary">{feature.body}</p>
            {feature.logo && (
              <>
                <Image
                  src="/powered-by-bgg-rgb.svg"
                  alt="Powered by BoardGameGeek"
                  width={135}
                  height={30}
                  className="mt-3.5 block dark:hidden"
                />
                <Image
                  src="/powered-by-bgg-reversed-rgb.svg"
                  alt="Powered by BoardGameGeek"
                  width={135}
                  height={30}
                  className="mt-3.5 hidden dark:block"
                />
              </>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
