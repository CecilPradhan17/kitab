"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import FloatingDevice from "./FloatingDevice";

interface HeroPhaseScatteredProps {
  /** 0-1 scroll progress through the pinned ScrollHero wrapper, passed down
      so the phone / e-reader / headline can each fade in on their own
      staggered schedule. The book (below) deliberately ignores this — it
      has no opacity transform, so it's simply there as soon as this pinned
      section is in view, meaning it's already part of the frame by the
      time the staggered elements finish fading in alongside it. */
  scrollYProgress: MotionValue<number>;
}

// Shared style for the "Physical books? / Phones? / E-books?" labels —
// same font as the hero headline, just a size step down.
const labelClassName = "absolute bottom-full mb-3 whitespace-nowrap font-serif text-foreground";
const labelStyle = { fontSize: "clamp(1.35rem, 3.8vw, 2.5rem)" };

// Each device's source PNG isn't drawn dead-center in its own canvas (the
// book/phone/e-reader art sits off to one side, measured via a pixel scan
// against the flattened background), and the visual position shifts again
// once the image's own rotate() is applied around its box center. These
// percentages are the resulting horizontal position of each device's
// actual rendered content (not its bounding box), so `left` + a
// translateX(-50%) puts the label directly above the artwork itself.
const CONTENT_CENTER_LEFT = {
  book: "44.9%",
  phone: "38.9%",
  ereader: "53.1%",
};

// Phase 1 of the scroll hero: the "problem" beat. Phone and e-reader (each
// paired with its own caption label) fade in first (staggered, left-to-
// right reading order), then the headline — each still carries its own
// static tilt (rotate()) so the composition reads as "scattered" rather
// than a straight-laid list. All three fade together during the Phase 2
// blackout (0.4-0.6); the book (and its label) does not, since it never
// fades at all.
export default function HeroPhaseScattered({ scrollYProgress }: HeroPhaseScatteredProps) {
  const phoneOpacity = useTransform(scrollYProgress, [0, 0.15, 0.4, 0.6], [0, 1, 1, 0]);
  const ereaderOpacity = useTransform(scrollYProgress, [0.1, 0.25, 0.4, 0.6], [0, 1, 1, 0]);
  const textOpacity = useTransform(scrollYProgress, [0.2, 0.35, 0.4, 0.6], [0, 1, 1, 0]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute right-[6%] top-[10%] w-[58vw] max-w-[680px] sm:right-[14%] sm:top-[12%] sm:w-[86vw]">
        <div className="relative">
          <span
            className={labelClassName}
            style={{ ...labelStyle, left: CONTENT_CENTER_LEFT.book, transform: "translateX(-50%)" }}
          >
            Physical books?
          </span>
          <FloatingDevice src="/hero/book-scattered.png" alt="" className="w-full" rotate={-12} />
        </div>
      </div>

      <motion.div
        className="absolute left-[6%] top-[40%] w-[40vw] max-w-[480px] sm:left-[14%] sm:top-[28%] sm:w-[60vw]"
        style={{ opacity: phoneOpacity }}
      >
        <div className="relative">
          <span
            className={labelClassName}
            style={{ ...labelStyle, left: CONTENT_CENTER_LEFT.phone, transform: "translateX(-50%)" }}
          >
            Phones?
          </span>
          <FloatingDevice src="/hero/phone-scattered.png" alt="" className="w-full" rotate={9} />
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-[6%] right-[6%] w-[46vw] max-w-[560px] sm:bottom-[10%] sm:right-[14%] sm:w-[70vw]"
        style={{ opacity: ereaderOpacity }}
      >
        <div className="relative">
          <span
            className={labelClassName}
            style={{ ...labelStyle, left: CONTENT_CENTER_LEFT.ereader, transform: "translateX(-50%)" }}
          >
            E-books?
          </span>
          <FloatingDevice src="/hero/ereader-scattered.png" alt="" className="w-full" rotate={-6} />
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-0 flex items-center justify-center px-6"
        style={{ opacity: textOpacity }}
      >
        <h2
          className="rotate-[-1.5deg] text-left font-serif text-foreground"
          style={{ fontSize: "clamp(1.75rem, 5vw, 3.25rem)", lineHeight: 1.6 }}
        >
          <span className="block">Got your</span>
          <span className="block">reads</span>
          <span className="block">scattered?</span>
        </h2>
      </motion.div>
    </div>
  );
}
