"use client";

import { useRef } from "react";

// A Google-dictionary-style lookup card for the word "Kitab", shown below
// the hero headline: headword + speaker icon, then "noun · /phonetic/",
// then two numbered senses (the literal meaning, and a wink at what this
// app actually is) — left-aligned like a real dictionary entry. Reuses the
// app's own dark panel convention (bg-[#0f0f0f] + border-white/10, same as
// BookDetailModal/EditProfileModal) rather than inventing new card colors,
// so text stays on the normal foreground/muted tokens throughout — only the
// speaker button's blue is a deliberate, scoped exception, kept regardless
// of surrounding background since it's Google's own brand color.
// The speaker plays a real recorded pronunciation clip rather than browser
// text-to-speech (an English TTS voice would badly mangle a Nepali/Arabic/
// Urdu/Hindi word) — drop three takes at the paths below for the button to
// work; play() rejects silently until they exist. Clips cycle in order
// (1, 2, 3, 1, ...) rather than at random, so repeat plays feel consistent.
const PRONUNCIATION_CLIPS = [
  "/audio/kitab-1.mp3",
  "/audio/kitab-2.mp3",
  "/audio/kitab-3.mp3",
];

export default function WordLookup() {
  const nextClipIndex = useRef(0);
  const currentAudio = useRef<HTMLAudioElement | null>(null);

  function playPronunciation() {
    currentAudio.current?.pause();

    const clip = PRONUNCIATION_CLIPS[nextClipIndex.current];
    nextClipIndex.current =
      (nextClipIndex.current + 1) % PRONUNCIATION_CLIPS.length;

    const audio = new Audio(clip);
    currentAudio.current = audio;
    audio.play().catch(() => {});
  }

  return (
    <div className="mt-20 flex flex-col items-start gap-2 rounded-2xl border border-[#e8b84b]/20 bg-[#0f0f0f] px-8 py-6 text-left shadow-[0_0_16px_2px_rgba(232,184,75,0.15),0_0_40px_8px_rgba(232,184,75,0.08)]">
      <div className="flex items-center gap-2.5">
        <span className="font-serif text-2xl text-foreground">Kitab</span>
        <button
          type="button"
          onClick={playPronunciation}
          aria-label="Play pronunciation"
          title="Play pronunciation"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4285F4] text-white outline-none transition-colors hover:bg-[#3367D6] focus-visible:ring-2 focus-visible:ring-[#4285F4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f0f]"
        >
          <SpeakerIcon />
        </button>
      </div>

      <p className="font-sans text-sm text-muted">
        <span className="italic">noun</span> · /kɪˈtɑːb/
      </p>

      <ol className="mt-1 flex max-w-xs flex-col gap-1.5 font-sans text-sm text-foreground/80">
        <li className="flex gap-2">
          <span className="text-muted">1.</span>
          <span>
            Something which is written, such as a book. (in Nepali, Arabic,
            and Hindi)
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-muted">2.</span>
          <span>In other cases, your favourite digital book tracking platform.</span>
        </li>
      </ol>
    </div>
  );
}

// Google's own "volume_up" Material Symbols glyph (same shape Search's
// dictionary card and Translate use for pronunciation) — reproduced by path
// rather than pulling in an icon library for one glyph, matching how
// BookDetailModal hand-rolls its icons too. Filled, not stroked, since
// Material icons are solid shapes.
function SpeakerIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}
