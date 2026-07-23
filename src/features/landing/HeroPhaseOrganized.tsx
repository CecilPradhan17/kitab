"use client";

import FloatingDevice from "./FloatingDevice";

// Phase 3 of the scroll hero: the "resolution" beat. Same three device
// concepts as Phase 1, but composed into a neat, level row (drift off,
// rotate near-zero) under the Kitab wordmark — the visual payoff after the
// Phase 2 blackout.
export default function HeroPhaseOrganized() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-10 px-6 text-center">
      <span className="font-logo text-5xl uppercase tracking-[0.15em] text-accent sm:text-7xl">
        Kitab
      </span>

      <div className="flex items-end justify-center gap-4 sm:gap-8">
        <FloatingDevice
          src="/hero/ereader-organized.png"
          alt=""
          className="w-[20vw] max-w-[140px]"
          rotate={-2}
        />
        <FloatingDevice
          src="/hero/book-organized.png"
          alt=""
          className="w-[26vw] max-w-[190px]"
          rotate={0}
        />
        <FloatingDevice
          src="/hero/phone-organized.png"
          alt=""
          className="w-[16vw] max-w-[120px]"
          rotate={2}
        />
      </div>

      <p className="max-w-sm font-sans text-sm text-muted sm:text-base">
        Every book, in one place — track what you read, and share the
        library you&apos;ve built.
      </p>
    </div>
  );
}
