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

    // Mirrors .lamp-root's --cone-w: clamp(240px, 88vw, 900px) so the dust's
    // spread/fall/sway shrink together with the cone on narrow viewports
    // instead of scattering past the now-narrower visible light. A one-time
    // read at mount (like the cone's own clamp() is resolved at layout
    // time) - only sizes the *magnitude* of the jitter, not a mote's actual
    // position (still calc(50% + offset), so it stays centered and correct
    // even if this goes stale after a later resize).
    const coneScale = Math.min(900, Math.max(240, window.innerWidth * 0.88)) / 900;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const mote = document.createElement("div");
      mote.className = "gold-mote";

      const spread = (220 + Math.random() * 100) * coneScale;
      const offsetX = Math.random() * spread * 2 - spread;
      // Which side of center this mote spawned on, so its outward drift
      // below continues away from center (matching the cone's own widening)
      // instead of drifting in a random direction independent of its start.
      const driftSign = offsetX >= 0 ? 1 : -1;
      // Total additional distance from its spawn point a mote drifts by the
      // time it's fully fallen - the light itself is much wider at the
      // bottom of the fall than at the top (see the cone's flare), so motes
      // should spread further out the more they've fallen, not just wobble
      // in place around their spawn x the whole way down.
      const maxDrift = (140 + Math.random() * 120) * coneScale;

      const duration = 20 + Math.random() * 16; // 20s - 36s
      const delay = -Math.random() * duration; // stagger + mid-fall starts
      const fallDistance = (620 + Math.random() * 60) * coneScale;
      const size = 1 + Math.random() * 1;

      const waypoints = [0, 20, 40, 60, 80, 100].map((pct, idx) => ({
        pct,
        // Outward drift scales with fall progress (pct/100), plus a small
        // random jitter each waypoint for natural wobble on top of it.
        x:
          idx === 0
            ? 0
            : driftSign * maxDrift * (pct / 100) +
              (Math.random() * 36 - 18) * coneScale,
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
    //
    // No clip-path here (removed after trying a hard cutoff above the bar) -
    // .gold-bar's own box-shadow bleeding a little above the line, fainter
    // than the cone below, is the intended look, not a bug to clip away.
    <div className="lamp-root pointer-events-none absolute left-1/2 top-0 h-full w-screen -translate-x-1/2 overflow-hidden">
      <style jsx>{`
        /* Single responsive source of truth for the lamp's scale, shared by
           the bar and the cone (via calc()/var() below) so they always
           shrink together in proportion - on a narrow viewport the whole
           fixture scales down instead of the cone's flare just getting
           clipped at the screen edge with no visible taper. Caps out at the
           same 900px the cone was fixed to before, so nothing changes on
           desktop; 88vw keeps ~12% breathing room past the flare on mobile. */
        .lamp-root {
          --cone-w: clamp(240px, 88vw, 900px);
        }

        .gold-bar {
          position: absolute;
          top: 12%;
          left: 50%;
          transform: translateX(-50%);
          /* 380 / 900 = the bar's original ratio to the cone's full width -
             keeps the bar the same relative length as the cone scales. */
          width: calc(var(--cone-w) * 0.4222);
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
          /* Two animations on the same element, touching different
             properties (transform vs. opacity) so they don't conflict:
             lampBarGrow runs once on load (the bar starting short and
             extending to full length), flicker keeps looping forever
             underneath it. flicker's start is delayed to match
             lampBarGrow's duration so the idle flicker only kicks in once
             the bar has finished growing, instead of flickering mid-grow. */
          animation:
            lampBarGrow 2.4s cubic-bezier(0.16, 1, 0.3, 1) both,
            flicker 4s ease-in-out infinite 2.4s;
        }

        /* Bar grows from a short stub to full length, anchored at its own
           center (default transform-origin) so it extends outward evenly
           in both directions rather than sliding in from one side. */
        @keyframes lampBarGrow {
          0% {
            transform: translateX(-50%) scaleX(0.08);
            opacity: 0;
          }
          100% {
            transform: translateX(-50%) scaleX(1);
            opacity: 1;
          }
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
          /* Anchors the scale-up at the cone's top edge (where it meets the
             bar) instead of its center, so the light reads as spreading
             downward/outward from the bar rather than growing from its own
             middle. */
          transform-origin: 50% 0%;
          width: var(--cone-w);
          /* height: auto + aspect-ratio (not a fixed height) so the cone
             scales as a whole with its width - the polygon points below are
             viewBox coordinates, so the entire shape (including the flare's
             angle) scales down together instead of just getting clipped. */
          aspect-ratio: 900 / 700;
          height: auto;
          overflow: visible;
          /* Same load-in beat as the bar's lampBarGrow (same duration/easing,
             started together) so the light expands in lockstep with the bar
             extending, rather than the two growing out of sync. */
          animation: lampConeGrow 2.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes lampConeGrow {
          0% {
            transform: translateX(-50%) scale(0.08);
            opacity: 0;
          }
          100% {
            transform: translateX(-50%) scale(1);
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .gold-bar {
            animation: flicker 4s ease-in-out infinite;
          }

          .cone-svg {
            animation: none;
          }
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
        viewBox="0 0 900 700"
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
          {/* Fainter, much-more-blurred copy of the same gradient for the
              outer layer below - the inner cone's own edge (still a real
              polygon, just blurred by softEdge) reads as a "cutoff" rather
              than a contrasting line because this second, wider, softer
              layer keeps the light trailing off naturally past it instead
              of the inner cone's edge being the abrupt end of all light. */}
          <linearGradient id="coneFadeOuter" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f6d989" stopOpacity="0.28" />
            <stop offset="30%" stopColor="#e8b84b" stopOpacity="0.12" />
            <stop offset="60%" stopColor="#e8b84b" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#e8b84b" stopOpacity="0" />
          </linearGradient>
          <filter id="softEdgeWide" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="55" />
          </filter>
        </defs>
        {/* Top edge (220/680, ±230) overhangs .gold-bar's own edges (±170)
            by 60px each side, so the glow softly fades past the ends of the
            bar itself instead of stopping in a hard vertex flush with the
            bar's width. Bottom edge back to ±820 (~3.6x the top width).
            The outer polygon is the same shape scaled up ~1.35x with a
            fainter fill and a much wider blur, drawn first (behind) so it
            extends past the inner cone's edges - see coneFadeOuter above.
            Bottom y raised 560 -> 660 (both polygons, same x) to reach a
            bit further down - the gradients are objectBoundingBox-relative
            so the same front-loaded-then-soft-tail fade just stretches over
            the extra distance instead of needing new stops. */}
        <polygon
          points="140,0 760,0 1557,660 -657,660"
          fill="url(#coneFadeOuter)"
          filter="url(#softEdgeWide)"
        />
        <polygon
          points="220,0 680,0 1270,660 -370,660"
          fill="url(#coneFade)"
          filter="url(#softEdge)"
        />
      </svg>

      <div ref={dustRef} className="absolute inset-0" />
    </div>
  );
}
