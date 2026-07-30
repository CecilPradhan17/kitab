"use client";

import { useEffect, useRef, useState } from "react";
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
          <picture>
            {/* Below Tailwind's sm breakpoint (640px), swap in a
                mobile-cropped variant of the same artwork rather than
                shrinking the desktop image, which reads too small/cluttered
                on narrow screens. */}
            <source media="(max-width: 639px)" srcSet="/hero/mobile_stackedBooks.png" />
            <img src={images[0]} alt="" className="w-full max-w-4xl" />
          </picture>
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
// slot. The two candidate words sit in the same CSS grid cell (stacked via
// grid-area, not absolute positioning, so the slot doesn't need an
// explicit height) and crossfade via opacity; both stay in the DOM the
// whole time (only opacity toggles), so the cell's auto width is always
// sized to the wider of the two words regardless of which is currently
// visible - no explicit width needed to keep the slot's width constant.
const LIBRARY_WORDS = ["Build", "Share"];
const LIBRARY_SUFFIX = "your digital library with Kitab";

function LibraryStageHeading({ wordIndex }: { wordIndex: number }) {
  return (
    <h2
      className="w-full text-center font-sans font-bold text-foreground"
      style={{
        fontSize: "clamp(2.5rem, 8vw, 6rem)",
        lineHeight: 1.05,
        letterSpacing: "-0.02em",
      }}
    >
      {/* No fixed width (see the comment above LIBRARY_WORDS) - the grid
          cell auto-sizes to the wider word, so there's no leftover slack
          for text-align to distribute and no extra gap before the literal
          space + "your" below, at any breakpoint. The mobile-only
          ml-[0.5ch] adds breathing room on the left of "Build"/"Share"
          without introducing any right-side slack. */}
      <span className="relative ml-[0.5ch] inline-grid align-baseline sm:ml-0">
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

// A "Share" button and a CSS-drawn phone frame (no image asset), rendered
// as a Fragment (not wrapped in their own flex div). The phone is pinned
// via absolute right-0 (not a flex sibling) specifically so its size can
// change without shifting library-1.png or the button - growing/shrinking
// it just extends its left edge, since its right edge stays anchored to
// the row's own right edge. The button's gap from library-1.png is a
// fixed value (matched to what justify-between used to compute here) so
// it also stays put regardless of the phone's size. Starts empty; clicking
// Share reveals share-1.png inside the screen. The frame is sized by
// HEIGHT (not width) on sm+ - a width-driven size let the phone's
// aspect-[9/19] balloon taller than the panel's available vertical space,
// pushing content below the panel's bottom edge where overflow-hidden
// silently clipped it off. Reset-on-scroll-away is handled by the caller
// remounting this via a key change rather than an effect here (React's own
// recommended pattern for "reset state when some condition changes" - see
// LibraryStageBottom).
function SharePhone() {
  const [revealed, setRevealed] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="shrink-0 rounded-full bg-accent px-9 py-3.5 font-sans text-base font-semibold uppercase tracking-wide text-background shadow-lg shadow-accent/30 transition-colors hover:bg-accent/90"
      >
        Share
      </button>

      <div className="absolute right-0 top-1/2 aspect-[10/19] w-36 -translate-y-1/2 rounded-[1.75rem] border-2 border-white/15 bg-black p-1.5 shadow-2xl sm:h-[58vh] sm:w-auto">
        <div className="absolute left-1/2 top-1.5 z-10 h-1 w-8 -translate-x-1/2 rounded-full bg-white/15" />
        <div className="relative h-full w-full overflow-hidden rounded-[1.25rem] bg-neutral-950">
          <img
            src="/hero/share-1.png"
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 ${
              revealed ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
          />
        </div>
      </div>
    </>
  );
}

// The library stage's bottom row. Both branches independently render
// library-1.png as their own first child rather than sharing one element
// outside the crossfade - safe (no flash/jump) because justify-between
// always pins the first child to the row's left edge regardless of what
// the other children are, so it lands at the exact same position in both.
// This lets justify-between give equal, self-computed gaps in the Share
// branch (image - button - phone) instead of a fixed/hand-picked one.
function LibraryStageBottom({ activeIndex }: { activeIndex: number }) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const carouselImgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const carouselDirectionRef = useRef(1);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Auto-advances the mobile carousel below, left to right and then back
  // right to left once it reaches the last image (a bounce, not a loop-
  // around jump), one step every 3.5s. Runs unconditionally rather than
  // only while this Build layer is visible - simplest option, and it's a
  // harmless no-op at sm+ where the row isn't scrollable (overflow-visible)
  // and scrollTo has nothing to do.
  useEffect(() => {
    const lastIndex = HERO_STAGES[1].images.length - 1;
    const id = setInterval(() => {
      setCarouselIndex((prev) => {
        let next = prev + carouselDirectionRef.current;
        if (next < 0 || next > lastIndex) {
          carouselDirectionRef.current *= -1;
          next = prev + carouselDirectionRef.current;
        }
        return next;
      });
    }, 3500);
    return () => clearInterval(id);
  }, []);

  // Scrolls by the pixel delta between the container and the target image
  // (rather than the simpler element.scrollIntoView()) specifically so it
  // never walks up past this container looking for a scrollable ancestor -
  // at sm+, where this row has overflow-visible and isn't meant to scroll
  // at all, scrollIntoView would otherwise fall back to scrolling the
  // whole page.
  useEffect(() => {
    const container = carouselRef.current;
    const target = carouselImgRefs.current[carouselIndex];
    if (!container || !target) return;
    const delta = target.getBoundingClientRect().left - container.getBoundingClientRect().left;
    container.scrollTo({ left: container.scrollLeft + delta, behavior: "smooth" });
  }, [carouselIndex]);

  return (
    <div className="relative mt-6 flex w-full max-w-[1040px] flex-1 items-center">
      <div
        aria-hidden={activeIndex !== 0}
        className={`absolute inset-0 flex items-center transition-opacity duration-500 ${
          activeIndex === 0 ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Below sm, three side-by-side images would either overflow or
            get squeezed unreadably small, so this becomes a native
            horizontal scroll-snap carousel instead - swipeable, images
            keep their original size (w-full max-w-xs, same as the sm+
            row) and simply overflow the viewport, snapping to each
            image's left edge as you swipe (or as the auto-advance effect
            above scrolls it). At sm+ this reverts to the original fixed
            justify-between row - no scrolling, no snap. */}
        <div
          ref={carouselRef}
          className="flex w-full snap-x snap-mandatory items-center gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-between sm:gap-0 sm:overflow-visible"
        >
          {HERO_STAGES[1].images.map((src, i) => (
            <img
              key={src}
              ref={(el) => {
                carouselImgRefs.current[i] = el;
              }}
              src={src}
              alt=""
              className="w-full max-w-xs shrink-0 snap-start sm:shrink"
            />
          ))}
        </div>
      </div>
      <div
        aria-hidden={activeIndex !== 1}
        className={`absolute inset-0 flex items-center justify-start gap-[159px] transition-opacity duration-500 ${
          activeIndex === 1 ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <img src="/hero/library-1.png" alt="" className="w-full max-w-xs" />
        {/* Keyed on activeIndex so scrolling back to Share always remounts
            a fresh (un-shared) reveal instead of remembering a previous
            click. The phone is absolutely positioned (see SharePhone) so
            its size can change independently of this fixed gap. */}
        <SharePhone key={activeIndex} />
      </div>
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
        {/* pt-12/sm:pt-16 (not the pt-16/sm:pt-24 stage 0 uses) - tighter
            on purpose, to free up vertical room for the phone below
            without touching the heading's own font size. */}
        <div className="flex h-full w-full flex-col items-center px-6 pt-12 sm:pt-16">
          <LibraryStageHeading wordIndex={libraryWordIndex} />
          <LibraryStageBottom activeIndex={libraryWordIndex} />
        </div>
      </div>
    </div>
  );
}
