"use client";

import { useEffect, useState } from "react";

interface RotatingWordOption {
  text: string;
  /** Per-word styling — lets each word carry its own font/case/color. */
  className?: string;
}

interface RotatingWordProps {
  words: RotatingWordOption[];
  /** How long each word stays fully visible before crossfading to the next, in ms. */
  intervalMs?: number;
}

// Cycles through `words`, crossfading between them. All words are stacked
// in the same CSS grid cell (grid-area: 1/1) instead of one node whose text
// swaps — an opacity:0 word still occupies its layout space, so the grid
// track sizes itself to the widest word up front and the surrounding text
// never shifts as shorter/longer words rotate through.
export default function RotatingWord({
  words,
  intervalMs = 5000,
}: RotatingWordProps) {
  const [index, setIndex] = useState(0);
  const fadeDuration = 500;

  useEffect(() => {
    const advance = setInterval(() => {
      setIndex((current) => (current + 1) % words.length);
    }, intervalMs + fadeDuration);

    return () => clearInterval(advance);
  }, [intervalMs, words.length]);

  return (
    <span className="relative inline-grid items-baseline align-baseline text-left">
      {words.map((word, i) => (
        <span
          key={word.text}
          aria-hidden={i !== index}
          className={`col-start-1 row-start-1 whitespace-nowrap transition-opacity ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          } ${word.className ?? ""}`}
          style={{ transitionDuration: `${fadeDuration}ms` }}
        >
          {word.text}
        </span>
      ))}
    </span>
  );
}
