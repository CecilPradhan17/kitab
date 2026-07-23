"use client";

// A Google-dictionary-style lookup card for the word "Kitab", shown below
// the hero headline: headword + speaker icon, phonetic spelling, meaning.
// The speaker plays a real recorded pronunciation clip rather than browser
// text-to-speech (an English TTS voice would badly mangle a Nepali/Arabic/
// Urdu/Hindi word) — drop three takes at the paths below for the button to
// work; play() rejects silently until they exist.
const PRONUNCIATION_CLIPS = [
  "/audio/kitab-1.mp3",
  "/audio/kitab-2.mp3",
  "/audio/kitab-3.mp3",
];

export default function WordLookup() {
  function playPronunciation() {
    const clip =
      PRONUNCIATION_CLIPS[
        Math.floor(Math.random() * PRONUNCIATION_CLIPS.length)
      ];
    new Audio(clip).play().catch(() => {});
  }

  return (
    <div className="mt-10 flex flex-col items-center gap-2">
      <div className="flex items-center gap-2.5">
        <span className="font-serif text-2xl text-foreground">Kitab</span>
        <button
          type="button"
          onClick={playPronunciation}
          aria-label="Play pronunciation"
          title="Play pronunciation"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8F0FE] text-[#444746] outline-none transition-colors hover:bg-[#D3E3FD] focus-visible:ring-2 focus-visible:ring-[#4285F4]"
        >
          <SpeakerIcon />
        </button>
      </div>

      <p className="font-sans text-sm text-muted">/kɪˈtɑːb/</p>

      <p className="max-w-xs font-sans text-sm text-foreground/80">
        <span className="italic text-muted">noun</span> · Nepali, Arabic,
        Urdu, Hindi — a book.
      </p>
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
