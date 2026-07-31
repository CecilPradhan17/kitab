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
          fontSize: "clamp(2rem, 5.5vw, 4.5rem)",
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

// One label per HERO_STAGES[1].images entry, rendered above its image in
// LibraryStageBottom - same font-serif italic treatment as the reveal text
// beside SharePhone, so the two three-image rows (Build/Share) read as one
// consistent caption style.
const LIBRARY_IMAGE_LABELS = ["Interactive", "3D Book", "Modals"];

function LibraryStageHeading({ wordIndex }: { wordIndex: number }) {
  return (
    <h2
      className="w-full text-center font-sans font-bold text-foreground"
      style={{
        fontSize: "clamp(2rem, 5.5vw, 4.5rem)",
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

// A CSS-drawn phone frame (no image asset) whose own screen holds the
// prompt (caption/arrow/"Share" button) and, once clicked, share-1.png -
// the two crossfade in place rather than the button living outside the
// phone. At sm+ the phone is pinned via absolute right-0 (not a flex
// sibling) specifically so its size can change without shifting
// library-1.png - growing/shrinking it just extends its left edge, since
// its right edge stays anchored to the row's own right edge. The frame is
// sized by HEIGHT (not width) on sm+ - a width-driven size let the
// phone's aspect-[10/19] balloon taller than the panel's available
// vertical space, pushing content below the panel's bottom edge where
// overflow-hidden silently clipped it off. Reset-on-scroll-away is
// handled by the caller remounting this via a key change rather than an
// effect here (React's own recommended pattern for "reset state when
// some condition changes" - see LibraryStageBottom).
function SharePhone() {
  const [revealed, setRevealed] = useState(false);

  return (
    // On mobile, library-1.png is hidden (see LibraryStageBottom) so
    // there's nothing to balance the phone's position against - it sits
    // in normal flow, centered, and sized by height to be as large as the
    // panel comfortably allows. At sm+ this reverts to the original
    // absolute right-0 anchoring alongside the image.
    <div className="relative aspect-[10/19] h-[55vh] w-auto shrink-0 rounded-[1.75rem] border-2 border-white/15 bg-black p-1.5 shadow-2xl sm:absolute sm:right-0 sm:top-1/2 sm:h-[58vh] sm:w-auto sm:-translate-y-1/2">
      <div className="absolute left-1/2 top-1.5 z-10 h-1 w-8 -translate-x-1/2 rounded-full bg-white/15" />
      <div className="relative h-full w-full overflow-hidden rounded-[1.25rem] bg-neutral-950">
        {/* The caption/arrow/button prompt lives on the phone's own
            screen now (rather than beside the phone) so it reads as the
            phone's UI - it fades out as share-1.png fades in below. */}
        <div
          className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-4 text-center transition-opacity duration-500 ${
            revealed ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <p className="max-w-[18ch] text-center font-sans text-sm text-muted">
            Generate custom shareable book images
          </p>
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent"
          >
            <path d="M12 4v14M6 13l6 6 6-6" />
          </svg>
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="rounded-full bg-accent px-9 py-3.5 font-sans text-base font-semibold uppercase tracking-wide text-background shadow-lg shadow-accent/30 transition-colors hover:bg-accent/90"
          >
            Share
          </button>
        </div>
        <img
          src="/hero/share-1.png"
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 ${
            revealed ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        />
      </div>

      {/* Mobile-only equivalents of the beside-the-phone text below - there's
          no room beside the phone there (it fills the available width), so
          this splits into a short line above and below instead. bottom-full/
          top-full anchor them flush against the phone frame's own top/bottom
          edge, same right-full trick as the desktop version. */}
      <div
        className={`absolute bottom-full left-1/2 mb-4 -translate-x-1/2 whitespace-nowrap text-center font-serif text-2xl italic text-foreground transition-opacity duration-500 sm:hidden ${
          revealed ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        Easy to share
      </div>
      <div
        className={`absolute left-1/2 top-full mt-4 -translate-x-1/2 whitespace-nowrap text-center font-serif text-2xl italic text-foreground transition-opacity duration-500 sm:hidden ${
          revealed ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        Custom images
      </div>

      {/* Fades in beside the phone once revealed. right-full anchors it
          flush against the phone frame's own left edge (not a fixed
          offset), so it stays put beside the phone regardless of the
          phone's own size. Desktop-only (see the wrapper's sm:absolute
          comment above) - on mobile the phone already fills the available
          width, leaving no room beside it. */}
      <div
        className={`absolute right-full top-1/2 mr-6 hidden w-max -translate-y-1/2 text-right transition-opacity duration-500 sm:block ${
          revealed ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <p className="font-serif text-4xl italic leading-snug text-foreground">Aesthetic</p>
        <p className="font-serif text-4xl italic leading-snug text-foreground">custom</p>
        <p className="font-serif text-4xl italic leading-snug text-foreground">shareable images.</p>
      </div>
    </div>
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
          className="flex h-full w-full snap-x snap-mandatory items-center gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-between sm:gap-0 sm:overflow-visible"
        >
          {HERO_STAGES[1].images.map((src, i) => (
            <div
              key={src}
              className="flex w-full max-w-xs shrink-0 snap-start flex-col items-center gap-3 sm:shrink"
            >
              <p className="text-center font-serif text-2xl italic leading-snug text-muted sm:text-4xl">
                {LIBRARY_IMAGE_LABELS[i]}
              </p>
              {/* max-h-[38vh] lives on the img itself, not a wrapper - a
                  percentage max-height (max-h-full) only resolves against a
                  parent with a DEFINITE height; a wrapper sized by its own
                  max-h alone has an auto height, so max-h-full on the image
                  was silently ignored per spec, leaving the image at its
                  full natural (uncapped) height. That overflowed upward out
                  of its own box - centered via items-center, an oversized
                  flex child overflows equally on both sides - straight into
                  the label above it. A viewport-relative unit like vh needs
                  no definite parent, so capping the img directly actually
                  works: it can't grow tall enough to overflow the panel's
                  overflow-hidden edge if the heading above wraps to two
                  lines and eats into the row's available space, and w-auto
                  lets the width shrink to match, preserving aspect ratio. */}
              <img
                ref={(el) => {
                  carouselImgRefs.current[i] = el;
                }}
                src={src}
                alt=""
                className="h-auto max-h-[38vh] w-auto max-w-full object-contain sm:max-h-[44vh]"
              />
            </div>
          ))}
        </div>
      </div>
      <div
        aria-hidden={activeIndex !== 1}
        className={`absolute inset-0 flex flex-col items-center justify-center gap-6 transition-opacity duration-500 sm:flex-row sm:justify-start ${
          activeIndex === 1 ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Hidden on mobile - there's no room to keep it readable next to
            a phone that's meant to be as large as possible there, so the
            phone takes over the whole panel instead (see SharePhone). At
            sm+, the phone is absolutely positioned (out of this flex flow
            entirely - see SharePhone), so this image is the only in-flow
            child and just sits at the row's left edge. */}
        <img src="/hero/library-1.png" alt="" className="hidden w-full max-w-xs sm:block" />
        {/* Keyed on activeIndex so scrolling back to Share always remounts
            a fresh (un-shared) reveal instead of remembering a previous
            click. */}
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
