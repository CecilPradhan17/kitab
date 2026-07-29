"use client";

import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import FloatingDevice from "./FloatingDevice";

interface HeroPhaseScatteredProps {
  /** 0-1 scroll progress through the pinned ScrollHero wrapper, passed down
      so the three devices (fading in together) and the headline (after
      them) can each derive their own opacity from the same scroll value. */
  scrollYProgress: MotionValue<number>;
}

interface OrbitingDeviceProps {
  src: string;
  sizeClassName: string;
  /** Fixed resting tilt - untouched by the orbit below, since translating
      around a center point (x/y motion values) never rotates the element
      itself, unlike rotating a pivoted wrapper would. */
  tilt: number;
  /** Pixels from the container's dead center. Desktop-only (see the
      sm:hidden/hidden sm:block split below), so this can stay a single
      fixed value tuned for the desktop container instead of needing to
      also work at mobile widths. */
  radius: number;
  /** Degrees, standard math convention (0 = right, increasing
      counter-clockwise) - but since screen y grows downward, increasing
      angle with y = r*sin(angle) sweeps clockwise on screen, not
      counter-clockwise, which is the whole point here. */
  startAngleDeg: number;
  durationS: number;
  opacity: MotionValue<number>;
}

// One device, continuously revolving clockwise around the container's
// center point (where the hero text sits) - orbit angle is a plain motion
// value driven by animate() in an effect (not Framer's declarative
// `animate` prop) so its sine/cosine can feed x/y via useTransform. Skipped
// entirely under prefers-reduced-motion, same as FloatingDevice's own drift
// loop. Desktop-only - see the render split below.
function OrbitingDevice({
  src,
  sizeClassName,
  tilt,
  radius,
  startAngleDeg,
  durationS,
  opacity,
}: OrbitingDeviceProps) {
  const angle = useMotionValue(startAngleDeg);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;
    const controls = animate(angle, startAngleDeg + 360, {
      duration: durationS,
      repeat: Infinity,
      ease: "linear",
    });
    return () => controls.stop();
  }, [angle, startAngleDeg, durationS, prefersReducedMotion]);

  const x = useTransform(angle, (a) => radius * Math.cos((a * Math.PI) / 180));
  const y = useTransform(angle, (a) => radius * Math.sin((a * Math.PI) / 180));

  return (
    <motion.div className="absolute left-1/2 top-1/2" style={{ x, y, opacity }}>
      <div className={`-translate-x-1/2 -translate-y-1/2 ${sizeClassName}`}>
        <FloatingDevice src={src} alt="" className="w-full" rotate={tilt} />
      </div>
    </motion.div>
  );
}

// Phase 1 of the scroll hero: the "problem" beat. All three devices fade in
// together first, then the headline once they've settled. On sm+ screens,
// the devices then continue revolving slowly clockwise around the headline;
// on mobile they stay put at their scattered resting positions (a circular
// orbit needs real room to swing through, which a narrow mobile container
// doesn't have without the devices clipping past its edges). Each device
// still carries its own fixed tilt (rotate()) so the composition reads as
// "scattered" rather than a straight-laid list. All four fade together
// during the Phase 2 blackout (0.4-0.6).
export default function HeroPhaseScattered({ scrollYProgress }: HeroPhaseScatteredProps) {
  const deviceOpacity = useTransform(scrollYProgress, [0, 0.15, 0.4, 0.6], [0, 1, 1, 0]);
  const textOpacity = useTransform(scrollYProgress, [0.15, 0.3, 0.4, 0.6], [0, 1, 1, 0]);

  return (
    <div className="relative h-full w-full">
      {/* Mobile: static scattered layout, no orbit. */}
      <div className="sm:hidden">
        <motion.div
          className="absolute right-[6%] top-[10%] w-[27vw] max-w-[320px]"
          style={{ opacity: deviceOpacity }}
        >
          <FloatingDevice src="/hero/book-scattered.png" alt="" className="w-full" rotate={-12} />
        </motion.div>

        <motion.div
          className="absolute left-[6%] top-[40%] w-[40vw] max-w-[480px]"
          style={{ opacity: deviceOpacity }}
        >
          <FloatingDevice src="/hero/phone-scattered.png" alt="" className="w-full" rotate={9} />
        </motion.div>

        <motion.div
          className="absolute bottom-[6%] right-[6%] w-[46vw] max-w-[560px]"
          style={{ opacity: deviceOpacity }}
        >
          <FloatingDevice src="/hero/ereader-scattered.png" alt="" className="w-full" rotate={-6} />
        </motion.div>
      </div>

      {/* sm+: same three devices, now revolving. book-scattered.png's own
          book fills ~59% of its canvas width, vs. ~33%/~40% for the
          phone/e-reader art in theirs (measured via each PNG's alpha
          bounding box) - at matching CSS widths the book rendered nearly 2x
          larger than the other two, hence the narrower max-w here. */}
      <div className="hidden sm:block">
        <OrbitingDevice
          src="/hero/book-scattered.png"
          sizeClassName="w-[40vw] max-w-[320px]"
          tilt={-12}
          radius={340}
          startAngleDeg={-60}
          durationS={60}
          opacity={deviceOpacity}
        />

        <OrbitingDevice
          src="/hero/phone-scattered.png"
          sizeClassName="w-[60vw] max-w-[480px]"
          tilt={9}
          radius={340}
          startAngleDeg={180}
          durationS={60}
          opacity={deviceOpacity}
        />

        <OrbitingDevice
          src="/hero/ereader-scattered.png"
          sizeClassName="w-[70vw] max-w-[560px]"
          tilt={-6}
          radius={340}
          startAngleDeg={60}
          durationS={60}
          opacity={deviceOpacity}
        />
      </div>

      <motion.div
        className="absolute inset-0 flex items-center justify-center px-6"
        style={{ opacity: textOpacity }}
      >
        <h2
          className="rotate-[-1.5deg] text-center font-serif text-foreground"
          style={{ fontSize: "clamp(1.75rem, 5vw, 3.25rem)", lineHeight: 1.6 }}
        >
          <span className="block">Your</span>
          <span className="block">reads</span>
          <span className="block">are</span>
          <span className="block">scattered.</span>
        </h2>
      </motion.div>
    </div>
  );
}
