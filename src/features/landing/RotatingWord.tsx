"use client";

import { useEffect, useState } from "react";

interface RotatingWordOption {
  text: string;
  /** Per-word styling — lets each word carry its own font/case/color. */
  className?: string;
}

interface RotatingWordProps {
  words: RotatingWordOption[];
  /** How long each word stays fully visible before scrolling to the next, in ms. */
  intervalMs?: number;
}

// Cycles through `words`, scrolling the next one up into view (like a
// mechanical flip display) rather than fading. Two layers share one box:
// an invisible "sizer" stack — one span per word, all in normal flow, each
// forced to the same line-height regardless of font — fixes the box's
// width to the widest word and its height to exactly one line, so the rest
// of the sentence never shifts. The real, visible words sit in an
// absolutely-positioned track on top, clipped to that box and translated
// vertically to bring the current word into view.
export default function RotatingWord({
  words,
  intervalMs = 5000,
}: RotatingWordProps) {
  const [index, setIndex] = useState(0);
  const transitionMs = 500;

  useEffect(() => {
    const advance = setInterval(() => {
      setIndex((current) => (current + 1) % words.length);
    }, intervalMs + transitionMs);

    return () => clearInterval(advance);
  }, [intervalMs, words.length]);

  return (
    <span className="relative inline-grid align-baseline text-left leading-[1.2]">
      {/* Baseline anchor: plain text, no per-word font override, so the
          grid's synthesized baseline (used by align-baseline above to seat
          this whole box on the sentence's baseline) comes from the
          surrounding font rather than from whichever word happens to be
          first in `words`. Without this, a word styled in a different font
          (e.g. Kitab's Cormorant) becoming the de facto reference would
          throw every other word's vertical position off. */}
      <span
        aria-hidden
        className="invisible col-start-1 row-start-1 whitespace-nowrap leading-[1.2]"
      >
        {words[0].text}
      </span>

      {words.map((word) => (
        <span
          key={`${word.text}-sizer`}
          aria-hidden
          className={`invisible col-start-1 row-start-1 whitespace-nowrap leading-[1.2] ${word.className ?? ""}`}
        >
          {word.text}
        </span>
      ))}

      <span className="absolute inset-0 overflow-hidden">
        <span
          className="flex flex-col transition-transform ease-in-out"
          style={{
            transitionDuration: `${transitionMs}ms`,
            transform: `translateY(-${(index * 100) / words.length}%)`,
          }}
        >
          {words.map((word, i) => (
            <span
              key={word.text}
              aria-hidden={i !== index}
              className={`whitespace-nowrap leading-[1.2] ${word.className ?? ""}`}
            >
              {word.text}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
