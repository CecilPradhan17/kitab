"use client";

import FloatingDevice from "./FloatingDevice";

// Phase 1 of the scroll hero: the "problem" beat. Three device concepts
// (book / phone / e-reader) scattered loosely around a centered headline —
// each image carries its own tilt, and the headline itself carries a
// small complementary tilt (both static CSS rotate(), not animated) so the
// whole composition reads as one deliberately "scattered" arrangement
// rather than images floating past straight-laid text.
export default function HeroPhaseScattered() {
  return (
    <div className="relative h-full w-full">
      <FloatingDevice
        src="/hero/book-scattered.png"
        alt=""
        className="absolute right-[-2%] top-[2%] w-[72vw] max-w-[560px] sm:right-[2%] sm:top-[0%]"
        rotate={-12}
        drift
        driftDurationS={4.5}
      />
      <FloatingDevice
        src="/hero/phone-scattered.png"
        alt=""
        className="absolute left-[-4%] top-[34%] w-[46vw] max-w-[360px] sm:left-[0%] sm:top-[32%]"
        rotate={9}
        drift
        driftDurationS={5.2}
        driftDelayS={0.6}
      />
      <FloatingDevice
        src="/hero/ereader-scattered.png"
        alt=""
        className="absolute bottom-[0%] right-[-2%] w-[54vw] max-w-[420px] sm:bottom-[4%] sm:right-[2%]"
        rotate={-6}
        drift
        driftDurationS={3.8}
        driftDelayS={1.1}
      />

      <div className="absolute inset-0 flex items-center justify-center px-6">
        <h2
          className="rotate-[-1.5deg] text-center font-serif text-foreground"
          style={{ fontSize: "clamp(1.75rem, 5vw, 3.25rem)", lineHeight: 1.15 }}
        >
          <span className="block">Got your</span>
          <span className="block">reads</span>
          <span className="block">scattered?</span>
        </h2>
      </div>
    </div>
  );
}
