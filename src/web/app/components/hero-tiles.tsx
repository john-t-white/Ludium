"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  tiles: [string, string][];
};

export function HeroTiles({ tiles }: Props) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, scrollLeft: 0 });
  const isScrollable = canScrollLeft || canScrollRight;

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

  useEffect(() => {
    if (!isDragging) return;

    function onWindowMouseMove(e: MouseEvent) {
      if (e.buttons !== 1) {
        setIsDragging(false);
        return;
      }
      const el = stripRef.current;
      if (!el) return;
      el.scrollLeft =
        dragStartRef.current.scrollLeft - (e.pageX - dragStartRef.current.x);
    }

    function onWindowMouseUp() {
      setIsDragging(false);
    }

    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
    };
  }, [isDragging]);

  function onMouseDown(e: React.MouseEvent) {
    if (!isScrollable) return;
    const el = stripRef.current;
    if (!el) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.pageX, scrollLeft: el.scrollLeft };
  }

  return (
    <div className="relative w-full">
      <div
        ref={stripRef}
        onScroll={updateFades}
        onMouseDown={onMouseDown}
        tabIndex={0}
        role="region"
        aria-label="Box art gallery"
        className={`scrollbar-hide grid grid-rows-2 grid-flow-col gap-3 overflow-x-auto ${isScrollable ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""}`}
      >
        {tiles.map(([c1, c2], i) => (
          <div
            key={i}
            className="aspect-square w-20 shrink-0 select-none rounded-lg sm:w-40"
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
