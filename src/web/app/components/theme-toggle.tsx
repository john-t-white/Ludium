"use client";

import { useLayoutEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useLayoutEffect(() => {
    if (document.documentElement.getAttribute("data-theme") === "dark") {
      // Corrects the SSR-safe "light" default to match the real theme the
      // pre-hydration script (layout.tsx) already applied to <html>.
      // useLayoutEffect (not useEffect) runs before the browser paints, so
      // this never becomes a visible flash of the wrong label/icon.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme("dark");
    }
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-full bg-text-primary px-4 py-2 text-sm font-semibold text-bg shadow-lg"
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
