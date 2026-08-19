// TEMPORARY dev aid — shows the active Tailwind breakpoint so it's easy to
// see when the layout switches. Remove before shipping.
export function BreakpointIndicator() {
  return (
    <div className="fixed bottom-4 left-4 z-50 rounded-full bg-black px-3 py-1.5 font-mono text-xs font-bold text-white">
      <span className="sm:hidden">base (&lt;640px)</span>
      <span className="hidden sm:inline md:hidden">sm (≥640px)</span>
      <span className="hidden md:inline lg:hidden">md (≥768px)</span>
      <span className="hidden lg:inline xl:hidden">lg (≥1024px)</span>
      <span className="hidden xl:inline 2xl:hidden">xl (≥1280px)</span>
      <span className="hidden 2xl:inline">2xl (≥1536px)</span>
    </div>
  );
}
