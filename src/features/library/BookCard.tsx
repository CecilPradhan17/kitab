import type { Book } from "./mockBooks";

interface BookCardProps {
  book: Book;
}

export default function BookCard({ book }: BookCardProps) {
  return (
    <article className="group relative flex flex-col">
      {/* Cover, with an underglow anchored to its bottom edge so the light
          appears to spill out from beneath the book. */}
      <div className="relative">
        {/* Underglow: a blurred ellipse straddling the cover's bottom edge —
            most of it spills downward. Subtle at rest, blooms on hover. */}
                <div
          aria-hidden
          className="
            pointer-events-none
            absolute
            left-1/2
            bottom-0
            -translate-x-1/2
            translate-y-1
            w-[80%]
            h-4
            rounded-full
            bg-[#ee8e24]
            opacity-90
            blur-md
          "
        />

        <div
          aria-hidden
          className="
            pointer-events-none
            absolute
            left-1/2
            bottom-0
            -translate-x-1/2
            translate-y-2
            w-[95%]
            h-8
            rounded-full
            bg-[#ee8e24]
            opacity-40
            blur-xl
          "
        />

        <div className="relative aspect-[2/3] overflow-hidden rounded-lg ring-1 ring-white/10 shadow-2xl shadow-black/60 transition-transform duration-500 group-hover:-translate-y-1">
          <img
            src={book.coverUrl}
            alt={`Cover of ${book.title} by ${book.author}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      {/* Metadata */}
      <div className="relative mt-4 flex flex-col gap-1">
        <span className="font-sans text-[0.65rem] uppercase tracking-[0.2em] text-accent">
          #{book.bookNumber}
        </span>
        <h3 className="font-serif text-lg leading-snug text-foreground">
          {book.title}
        </h3>
        <p className="font-sans text-sm text-muted">{book.author}</p>
      </div>
    </article>
  );
}
