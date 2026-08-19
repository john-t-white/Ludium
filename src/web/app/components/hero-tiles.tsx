"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  tiles: [string, string][];
};

export function HeroTiles({ tiles }: Props) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateFades() {
    const el = stripRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  useEffect(() => {
    updateFades();
    window.addEventListener("resize", updateFades);
    return () => window.removeEventListener("resize", updateFades);
  }, []);

  return (
    <div className="relative w-full max-w-md lg:max-w-none lg:flex-1">
      <div
        ref={stripRef}
        onScroll={updateFades}
        className="scrollbar-hide flex gap-3 overflow-x-auto lg:grid lg:grid-cols-4 lg:overflow-visible"
      >
        {tiles.map(([c1, c2], i) => (
          <div
            key={i}
            className="aspect-square w-20 shrink-0 rounded-lg lg:w-auto"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, ${c1} 0 8px, ${c2} 8px 16px)`,
            }}
          />
        ))}
      </div>
      {canScrollLeft && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-9 bg-[linear-gradient(to_left,transparent,var(--bg))]" />
      )}
      {canScrollRight && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-9 bg-[linear-gradient(to_right,transparent,var(--bg))]" />
      )}
    </div>
  );
}
