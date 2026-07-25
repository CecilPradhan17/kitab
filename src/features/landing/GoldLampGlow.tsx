"use client";

import { useEffect, useRef } from "react";

/**
 * Gold light bar + soft glow cone + drifting dust, meant to sit
 * absolutely-positioned behind/above hero text.
 *
 * Usage:
 *   <div className="relative">
 *     <GoldLampGlow />
 *     <h1 className="relative z-10">Your hero text</h1>
 *   </div>
 *
 * Parent needs `position: relative` and enough height above the text for
 * the bar/cone/dust to read (the cone alone renders at a fixed 640px tall
 * before its own fade, so a tightly-wrapped short parent will clip it via
 * overflow-hidden below). This component is purely decorative
 * (pointer-events: none throughout) and absolutely fills its parent.
 */
export default function GoldLampGlow() {
  const dustRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion || !dustRef.current) return;

    const container = dustRef.current;
    const styleSheet = document.createElement("style");
    document.head.appendChild(styleSheet);
    const sheet = styleSheet.sheet!;
    const PARTICLE_COUNT = 28;
    const motes: HTMLDivElement[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const mote = document.createElement("div");
      mote.className = "gold-mote";

      const spread = 220 + Math.random() * 100;
      const offsetX = Math.random() * spread * 2 - spread;

      const duration = 20 + Math.random() * 16; // 20s - 36s
      const delay = -Math.random() * duration; // stagger + mid-fall starts
      const fallDistance = 620 + Math.random() * 60;
      const size = 1 + Math.random() * 1;

      const waypoints = [0, 20, 40, 60, 80, 100].map((pct, idx) => ({
        pct,
        x: idx === 0 ? 0 : Math.random() * 36 - 18,
        y: (fallDistance * pct) / 100,
      }));

      const animName = `sway${i}-${Math.random().toString(36).slice(2, 7)}`;
      const frames = waypoints
        .map(
          (w) =>
            `${w.pct}% { transform: translate(${w.x.toFixed(
              1
            )}px, ${w.y.toFixed(1)}px); }`
        )
        .join("\n");
      const opacityFrames = `
        0% { opacity: 0; }
        10% { opacity: 0.8; }
        80% { opacity: 0.35; }
        100% { opacity: 0; }
      `;

      sheet.insertRule(
        `@keyframes ${animName} { ${frames} }`,
        sheet.cssRules.length
      );
      sheet.insertRule(
        `@keyframes ${animName}-opacity { ${opacityFrames} }`,
        sheet.cssRules.length
      );

      // 50% + a fixed px jitter (not an absolute px position derived from
      // container.clientWidth) so motes stay centered under the light if
      // the container's own width/position ever changes after mount - a
      // one-time px calculation would otherwise go stale, as it just did
      // when the container widened to w-screen.
      mote.style.left = `calc(50% + ${offsetX.toFixed(1)}px)`;
      mote.style.top = "13%";
      mote.style.width = `${size}px`;
      mote.style.height = `${size}px`;
      mote.style.animation = `${animName} ${duration}s linear infinite ${delay}s, ${animName}-opacity ${duration}s linear infinite ${delay}s`;

      container.appendChild(mote);
      motes.push(mote);
    }

    return () => {
      motes.forEach((m) => m.remove());
      styleSheet.remove();
    };
  }, []);

  return (
    // w-screen (not inset-0) because the flare below is now wide enough to
    // exceed this component's own parent (capped at max-w-2xl for text
    // readability) - clipping against that narrower box would cut the light
    // off hard well before its gradient fades to 0. Centering on 100vw
    // instead means it can only ever get clipped by the viewport edge
    // itself, which reads as the glow bleeding off-screen, not a stray box.
    <div className="pointer-events-none absolute left-1/2 top-0 h-full w-screen -translate-x-1/2 overflow-hidden">
      <style jsx>{`
        .gold-bar {
          position: absolute;
          top: 12%;
          left: 50%;
          transform: translateX(-50%);
          width: 340px;
          height: 3px;
          border-radius: 2px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            #f6d989 15%,
            #f6d989 85%,
            transparent 100%
          );
          box-shadow:
            0 0 8px 1px #f6d989,
            0 0 24px 4px rgba(246, 217, 137, 0.6);
          animation: flicker 4s ease-in-out infinite;
        }

        @keyframes flicker {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.92;
          }
        }

        .cone-svg {
          position: absolute;
          top: 12%;
          left: 50%;
          transform: translateX(-50%);
          width: 900px;
          height: 640px;
          overflow: visible;
        }

        :global(.gold-mote) {
          position: absolute;
          border-radius: 50%;
          background: #f3d38a;
          box-shadow: 0 0 3px 0.5px rgba(243, 211, 138, 0.7);
        }
      `}</style>

      <div className="gold-bar" />

      <svg
        className="cone-svg"
        viewBox="0 0 900 640"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Front-loaded falloff (steep drop by 30%, long soft tail to 0)
              instead of a near-linear fade - closer to how a real light
              source dims with distance than an even gradient reads. */}
          <linearGradient id="coneFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f6d989" stopOpacity="0.6" />
            <stop offset="30%" stopColor="#e8b84b" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#e8b84b" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#e8b84b" stopOpacity="0" />
          </linearGradient>
          <filter id="softEdge" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="26" />
          </filter>
        </defs>
        {/* Top edge (280/620) matches .gold-bar's actual rendered width
            (340px, so ±170 from the shared center at local x=450) - the
            light should start exactly at the bar's edges. Bottom edge
            widened well past the svg's own 0-900 viewBox (±170 -> ±820,
            nearly 5x the top width) for a very steep slant/wide flare;
            .cone-svg has overflow: visible so points outside its nominal
            box still render, and the root is full-viewport-width (see
            above) so nothing clips them before the gradient fades to 0 -
            on most desktop widths this now reaches edge to edge. */}
        <polygon
          points="280,0 620,0 1270,560 -370,560"
          fill="url(#coneFade)"
          filter="url(#softEdge)"
        />
      </svg>

      <div ref={dustRef} className="absolute inset-0" />
    </div>
  );
}
