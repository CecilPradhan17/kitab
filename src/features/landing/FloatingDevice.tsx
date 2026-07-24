"use client";

import { motion, useReducedMotion, type MotionStyle } from "framer-motion";

interface FloatingDeviceProps {
  src: string;
  alt: string;
  /** Tailwind position classes (top/left/right/bottom + size) — the only
      layout this component takes from its parent, since scattered vs.
      organized placement differs per phase. */
  className?: string;
  /** Fixed tilt in degrees. Kept separate from the drift animation below so
      the tilt persists as the resting pose even when drift is disabled. */
  rotate: number;
  /** Loops a small translateY drift for a floating feel. Off for the
      organized Phase 3 layout (those sit still) and for reduced-motion. */
  drift?: boolean;
  driftDurationS?: number;
  driftDelayS?: number;
  /** Extra motion style merged in on top of rotate/filter below — used by
      callers that drive this device's opacity from a scroll-linked
      MotionValue (e.g. the staggered phone/e-reader reveal in
      HeroPhaseScattered). Omit for a device that's just always shown. */
  style?: MotionStyle;
}

// One device image (book / phone / e-reader), shared between the scattered
// Phase 1 and organized Phase 3 layouts. Only opacity/transform are ever
// animated here (translateY drift + a static rotate), never top/left/width/
// height, so this stays GPU-accelerated. The drop-shadow is applied in CSS
// rather than baked into the PNG, per the asset brief, so all three devices
// get a consistent, tunable shadow regardless of source art.
export default function FloatingDevice({
  src,
  alt,
  className = "",
  rotate,
  drift = false,
  driftDurationS = 4,
  driftDelayS = 0,
  style,
}: FloatingDeviceProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldDrift = drift && !prefersReducedMotion;

  return (
    <motion.img
      src={src}
      alt={alt}
      className={`pointer-events-none select-none ${className}`}
      style={{
        rotate,
        filter: "drop-shadow(0 20px 30px rgba(0, 0, 0, 0.55))",
        ...style,
      }}
      animate={
        shouldDrift
          ? { y: [0, -14, 0] }
          : undefined
      }
      transition={
        shouldDrift
          ? {
              duration: driftDurationS,
              delay: driftDelayS,
              repeat: Infinity,
              ease: "easeInOut",
            }
          : undefined
      }
    />
  );
}
