import type { Book } from "./mockBooks";

interface BookCardProps {
  book: Book;
  /**
   * Underglow color for the card. Defaults to the brand gold. In a later step
   * this will be the dominant color extracted from the cover image, so every
   * book gets a glow that matches its art. Passed in as a prop (not computed
   * here) to keep this component purely presentational.
   */
  accentColor?: string;
}

export default function BookCard({
  book,
  accentColor = "#c9973a",
}: BookCardProps) {
  return (
    <article
      // `--glow` drives both the blurred underglow and the cover's hover ring,
      // so swapping in a per-cover color later only touches this one variable.
      style={{ "--glow": accentColor } as React.CSSProperties}
      className="group relative flex flex-col"
    >
      {/* Underglow: a blurred wash of the accent color, sitting behind and
          slightly below the cover. Subtle at rest, blooms on hover. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-2 top-2 rounded-[1.5rem] bg-[var(--glow)] opacity-25 blur-2xl transition-all duration-500 group-hover:opacity-60 group-hover:blur-3xl"
      />

      {/* Cover */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg ring-1 ring-white/10 shadow-2xl shadow-black/60 transition-transform duration-500 group-hover:-translate-y-1">
        <img
          src={book.coverUrl}
          alt={`Cover of ${book.title} by ${book.author}`}
          crossOrigin="anonymous"
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>

      {/* Metadata */}
      <div className="relative mt-4 flex flex-col gap-1">
        <span className="font-sans text-[0.65rem] uppercase tracking-[0.2em] text-accent">
          Book No. {book.bookNumber}
        </span>
        <h3 className="font-serif text-lg leading-snug text-foreground">
          {book.title}
        </h3>
        <p className="font-sans text-sm text-muted">{book.author}</p>
      </div>
    </article>
  );
}
