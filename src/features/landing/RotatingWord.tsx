"use client";

import { useEffect, useState } from "react";

interface RotatingWordProps {
  words: string[];
  /** How long each word stays fully visible before fading to the next, in ms. */
  intervalMs?: number;
}

// Cycles through `words` in place, cross-fading via opacity: fade the
// current word out, swap the text while it's invisible, fade the next word
// in. Its own component (rather than inline state on LandingPage) so the
// fade timer is the only thing on this otherwise-static page that needs to
// be a client component.
export default function RotatingWord({
  words,
  intervalMs = 2200,
}: RotatingWordProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const fadeDuration = 500;

  useEffect(() => {
    const fadeOut = setTimeout(() => setVisible(false), intervalMs);
    const swap = setTimeout(() => {
      setIndex((current) => (current + 1) % words.length);
      setVisible(true);
    }, intervalMs + fadeDuration);

    return () => {
      clearTimeout(fadeOut);
      clearTimeout(swap);
    };
  }, [index, intervalMs, words.length]);

  return (
    <span
      className={`inline-block text-accent transition-opacity ease-in-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ transitionDuration: `${fadeDuration}ms` }}
    >
      {words[index]}
    </span>
  );
}
