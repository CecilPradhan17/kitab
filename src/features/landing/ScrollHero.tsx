"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll } from "framer-motion";
import HeroStages, { HERO_STAGES, HeroStageContent } from "./HeroStages";

// The landing page's scroll-driven hero: a 300vh wrapper with a 100vh
// sticky inner container pins the viewport in place while scroll progress
// (0-1 across the wrapper) drives which of the three HERO_STAGES is visible
// - see HeroStages for the crossfade breakpoints. Unlike the old
// Phase1/Phase3 design, all three stages live inside the same panel and
// never slide or black out between each other.
//
// Under prefers-reduced-motion, the pin-scrub is skipped entirely (not
// just the drift sub-animations) - scroll-jacking a large section is
// itself a motion effect reduced-motion users want to avoid. The three
// stages instead render stacked in normal document flow, each with a
// single one-shot fade as it scrolls into view.
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

  if (prefersReducedMotion) {
    return (
      <div className="w-full p-4 sm:p-8">
        <div className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-black">
          {HERO_STAGES.map((stage) => (
            <motion.div
              key={stage.heading}
              className="flex min-h-[70vh] items-center justify-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6 }}
            >
              <HeroStageContent {...stage} />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative h-[300vh] w-full">
      <div className="sticky top-0 h-screen w-full overflow-hidden p-4 sm:p-8">
        <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/10 bg-black">
          <HeroStages scrollYProgress={scrollYProgress} />
        </div>
      </div>
    </div>
  );
}
