"use client";

// A Google-dictionary-style lookup card for the word "Kitab", shown below
// the hero headline: headword + speaker icon, phonetic spelling, meaning.
// The speaker plays a real recorded pronunciation clip rather than browser
// text-to-speech (an English TTS voice would badly mangle a Nepali/Arabic/
// Urdu/Hindi word) — drop the audio file at public/audio/kitab.mp3 for the
// button to work; play() rejects silently until it exists.
export default function WordLookup() {
  function playPronunciation() {
    new Audio("/audio/kitab.mp3").play().catch(() => {});
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
          className="flex h-8 w-8 items-center justify-center rounded-full text-accent outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
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

// Hand-rolled to match BookDetailModal's icon pattern (stroke-based, no
// icon library) rather than pulling in a new dependency for one glyph.
function SpeakerIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8v4h3l4 3V5L6 8H3Z" />
      <path d="M13 7.5a3 3 0 0 1 0 5" />
      <path d="M15.3 5.5a6 6 0 0 1 0 9" />
    </svg>
  );
}
