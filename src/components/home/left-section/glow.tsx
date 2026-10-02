import { useId } from "react";

export default function Glow() {
  const id = useId();

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-gray-950">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`${id}-desktop`} cx="100%" cy="50%" r="100%">
            <stop offset="0%" stopColor="rgba(56, 189, 248, 0.3)" />
            <stop offset="53.95%" stopColor="rgba(0, 71, 255, 0.09)" />
            <stop offset="100%" stopColor="rgba(10, 14, 23, 0)" />
          </radialGradient>

          <radialGradient id={`${id}-mobile`} cx="50%" cy="100%" r="100%">
            <stop offset="0%" stopColor="rgba(56, 189, 248, 0.3)" />
            <stop offset="53.95%" stopColor="rgba(0, 71, 255, 0.09)" />
            <stop offset="100%" stopColor="rgba(10, 14, 23, 0)" />
          </radialGradient>
        </defs>

        <rect
          width="100"
          height="100"
          fill={`url(#${id}-desktop)`}
          className="hidden lg:block"
        />

        <rect
          width="100"
          height="100"
          fill={`url(#${id}-mobile)`}
          className="lg:hidden"
        />
      </svg>

      <div className="absolute inset-x-0 bottom-0 h-px bg-white/20 mix-blend-overlay lg:inset-y-0 lg:right-0 lg:left-auto lg:h-auto lg:w-px" />
    </div>
  );
}
