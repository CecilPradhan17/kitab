"use client";

import { useState } from "react";
import { useMotionValueEvent, type MotionValue } from "framer-motion";

interface Stage {
  heading: string;
  images: string[];
}

// The three scroll-driven beats of the pinned hero - all three stay inside
// the same panel and crossfade in place (see HeroStages below) rather than
// sliding/blacking out between separate "phases" like the old design did.
// Stage 1 is a single hero image; stages 2/3 are a three-image row.
export const HERO_STAGES: Stage[] = [
  {
    heading: "Can't keep track of your books?",
    images: ["/hero/stackedBooks.png"],
  },
  {
    heading: "Build your digital library with Kitab",
    images: ["/hero/library-1.png", "/hero/library-2.png", "/hero/library-3.png"],
  },
  {
    heading: "Share your digital library with Kitab",
    images: ["/hero/share-1.png", "/hero/share-2.png", "/hero/share-3.png"],
  },
];

// Splits on the literal word "Kitab" and re-renders it in the app's
// established logo treatment (font-logo, gold, wide-tracked - same inline
// usage as the "Your digital Kitab collection" headline on LandingPage.tsx)
// instead of plain text, wherever it appears in a stage heading.
function renderHeading(heading: string) {
  const parts = heading.split("Kitab");
  if (parts.length === 1) return heading;
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 && (
        <span className="relative top-[0.08em] font-logo uppercase tracking-wide text-accent">
          Kitab
        </span>
      )}
    </span>
  ));
}

export function HeroStageContent({ heading, images }: Stage) {
  return (
    <div className="flex h-full w-full flex-col items-center px-6 pt-16 sm:pt-24">
      <h2
        className="text-center font-sans font-bold text-foreground"
        style={{
          fontSize: "clamp(2.5rem, 8vw, 6rem)",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
        }}
      >
        {renderHeading(heading)}
      </h2>
      <div className="mt-10 flex w-full flex-1 items-center justify-center">
        {images.length === 1 ? (
          <img src={images[0]} alt="" className="w-full max-w-4xl" />
        ) : (
          <div className="flex w-full max-w-4xl items-center justify-center gap-6 sm:gap-10">
            {images.map((src) => (
              <img key={src} src={src} alt="" className="w-full max-w-xs" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Stages 1/2 ("Build"/"Share ... with Kitab") share everything but one
// word - rather than crossfading two full headings (which re-centers the
// whole line and visibly shifts "your digital library with Kitab" sideways,
// since text-center repositions based on the total string width), this
// renders the shared words once and only swaps "Build"/"Share" inside a
// fixed-width slot. The two candidate words sit in the same CSS grid cell
// (stacked via grid-area, not absolute positioning, so the slot doesn't
// need an explicit height) and crossfade via opacity; the fixed w-[6ch]
// keeps the slot's width constant regardless of which word is showing, so
// nothing after it ever moves.
const LIBRARY_WORDS = ["Build", "Share"];
const LIBRARY_SUFFIX = "your digital library with Kitab";

function LibraryStageHeading({ wordIndex }: { wordIndex: number }) {
  return (
    <h2
      className="text-center font-sans font-bold text-foreground"
      style={{
        fontSize: "clamp(2.5rem, 8vw, 6rem)",
        lineHeight: 1.05,
        letterSpacing: "-0.02em",
      }}
    >
      <span className="relative inline-grid w-[5.5ch] text-right align-baseline">
        {LIBRARY_WORDS.map((word, i) => (
          <span
            key={word}
            aria-hidden={wordIndex !== i}
            className={`[grid-area:1/1] transition-opacity duration-500 ${
              wordIndex === i ? "opacity-100" : "opacity-0"
            }`}
          >
            {word}
          </span>
        ))}
      </span>{" "}
      {renderHeading(LIBRARY_SUFFIX)}
    </h2>
  );
}

// The two library-stage image rows, stacked and crossfaded the same way as
// the heading's swap word above - both stay mounted so switching between
// them is a pure opacity fade, never a mount/unmount layout jump.
function LibraryStageImages({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="relative mt-10 flex w-full max-w-4xl flex-1 items-center justify-center">
      {[HERO_STAGES[1], HERO_STAGES[2]].map((stage, i) => (
        <div
          key={stage.heading}
          aria-hidden={activeIndex !== i}
          className={`absolute inset-0 flex items-center justify-center gap-6 transition-opacity duration-500 sm:gap-10 ${
            activeIndex === i ? "opacity-100" : "opacity-0"
          }`}
        >
          {stage.images.map((src) => (
            <img key={src} src={src} alt="" className="w-full max-w-xs" />
          ))}
        </div>
      ))}
    </div>
  );
}

interface HeroStagesProps {
  /** 0-1 scroll progress through the pinned ScrollHero wrapper - which
      HERO_STAGES entry is active is derived from this as a discrete step
      (see the 0.35/0.65 cutoffs below), not a continuously scroll-scrubbed
      opacity. */
  scrollYProgress: MotionValue<number>;
}

// Crossfades stage 0 against the shared stage-1/2 "library" skeleton.
// Deliberately NOT driven by independent useTransform() opacities fed
// straight into each layer's style, the "obvious" framer-motion approach -
// that produced incorrect/stale computed opacity at the DOM level in
// practice (confirmed the underlying motion values themselves were
// computing correctly, but what actually rendered didn't reliably match).
// Deriving a plain "which stage is active" integer via useMotionValueEvent
// and letting Tailwind's transition-opacity handle the actual fade sidesteps
// that failure mode entirely. Only used in ScrollHero's non-reduced-motion
// branch - the reduced-motion branch renders HERO_STAGES in normal document
// flow instead (as three independent headings - there's no crossfade there,
// so the shared-word optimization doesn't apply), since there's no
// pin-scrub to derive stage from.
export default function HeroStages({ scrollYProgress }: HeroStagesProps) {
  const [activeStage, setActiveStage] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const stage = v < 0.35 ? 0 : v < 0.65 ? 1 : 2;
    setActiveStage((prev) => (prev === stage ? prev : stage));
  });

  const libraryWordIndex = activeStage === 2 ? 1 : 0;

  return (
    <div className="relative h-full w-full">
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          activeStage === 0 ? "opacity-100" : "opacity-0"
        }`}
      >
        <HeroStageContent {...HERO_STAGES[0]} />
      </div>

      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          activeStage !== 0 ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex h-full w-full flex-col items-center px-6 pt-16 sm:pt-24">
          <LibraryStageHeading wordIndex={libraryWordIndex} />
          <LibraryStageImages activeIndex={libraryWordIndex} />
        </div>
      </div>
    </div>
  );
}
