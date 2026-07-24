"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import HeroPhaseScattered from "./HeroPhaseScattered";
import HeroPhaseOrganized from "./HeroPhaseOrganized";

// The landing page's scroll-driven hero: a 300vh wrapper with a 100vh
// sticky inner container pins the viewport in place while scroll progress
// (0-1 across the wrapper) drives two opacity layers via useTransform —
// Phase 1 (scattered "problem" beat) fades in over 0-0.4, fades back out
// to a full blackout by 0.6, then Phase 3 (organized "resolution" beat)
// fades in over 0.6-1. Only opacity/transform are ever animated (never
// layout properties), so this stays on the GPU-accelerated path.
//
// Under prefers-reduced-motion, the pin-scrub is skipped entirely (not
// just the drift sub-animations) — scroll-jacking a large section is
// itself a motion effect reduced-motion users want to avoid, not just the
// floating loop inside it. Both phases render in normal document flow
// instead, each with a single one-shot fade as it scrolls into view.
export default function ScrollHero() {
  const prefersReducedMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // In the reduced-motion branch below, wrapperRef's div is never rendered,
  // so its .current would stay null forever — passing target: undefined
  // instead avoids framer-motion's "ref defined but not hydrated" error
  // (scrollYProgress goes unused on that path anyway).
  const { scrollYProgress } = useScroll({
    target: prefersReducedMotion ? undefined : wrapperRef,
    offset: ["start start", "end end"],
  });

  // Phase 1's own elements (phone / e-reader / headline) each compute their
  // staggered opacity from scrollYProgress internally — see
  // HeroPhaseScattered. Only Phase 3 still fades as one shared layer.
  const organizedOpacity = useTransform(scrollYProgress, [0.6, 1], [0, 1]);
  const scatteredPointerEvents = useTransform(scrollYProgress, (v) =>
    v < 0.5 ? "auto" : "none",
  );
  const organizedPointerEvents = useTransform(scrollYProgress, (v) =>
    v < 0.5 ? "none" : "auto",
  );
  // Reduced-motion's HeroPhaseScattered still needs a scrollYProgress value
  // for its internal per-element useTransform calls, but there's no
  // pin-scrub to derive one from here — a fixed value past every element's
  // fade-in breakpoint (see HeroPhaseScattered) holds them all at opacity 1,
  // so the whole group fades in together via the wrapping whileInView below
  // instead of staggering.
  const settledProgress = useMotionValue(0.4);

  if (prefersReducedMotion) {
    return (
      <div className="flex w-full flex-col">
        <motion.div
          className="flex min-h-[70vh] items-center justify-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
        >
          <HeroPhaseScattered scrollYProgress={settledProgress} />
        </motion.div>
        <motion.div
          className="flex min-h-[70vh] items-center justify-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
        >
          <HeroPhaseOrganized />
        </motion.div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative h-[300vh] w-full">
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{ pointerEvents: scatteredPointerEvents }}
        >
          <HeroPhaseScattered scrollYProgress={scrollYProgress} />
        </motion.div>

        <motion.div
          className="absolute inset-0"
          style={{ opacity: organizedOpacity, pointerEvents: organizedPointerEvents }}
        >
          <HeroPhaseOrganized />
        </motion.div>
      </div>
    </div>
  );
}
