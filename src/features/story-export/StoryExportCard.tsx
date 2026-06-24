import type { Book } from "@/features/library/mockBooks";

// The export card is authored at EXACTLY the Instagram-Story resolution. These
// are fixed device pixels, not responsive units, because `html-to-image` will
// later capture this div at 1:1 — every size below is in real output pixels, so
// the on-screen preview must be scaled down by its container, never the card.
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;

// Near-black card field + warm gold accent, per the export spec. Slightly
// warmer/darker than the app background (#0a0a0a) so the card reads as its own
// cinematic surface once it lands on someone's Story.
const CARD_BG = "#080706";
const ACCENT = "#c9973a";
// Quote + metadata body sit in a muted warm white rather than pure foreground
// white, so the gold accents stay the brightest thing on the card.
const WARM_WHITE = "#ece4d4";

/** ISO date ("2024-05-12") → "May 2024" for the metadata columns. Local to the
    card because it's presentation, not domain logic. */
function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

interface StoryExportCardProps {
  book: Book;
  /** The hero image painted into the upper half — a base64 PNG of the offscreen
      3D book render (Chunk 2). Until that exists, any cover URL works as a
      stand-in so the layout/typography can be tuned. */
  heroSrc: string;
  /** Editable quote; the preview re-renders live as the user types (Chunk 3).
      Defaults to the book's stored quote. */
  quote?: string;
}

/** The 9:16 share card — dark, editorial, gold-accented. Purely presentational:
    it takes a book, a pre-rendered hero image, and an optional quote, and lays
    them out at native 1080×1920. It applies NO tilt or 3D transform of its own —
    the hero image arrives already composed (the render bakes in the camera
    angle), so the card just frames it. */
export default function StoryExportCard({
  book,
  heroSrc,
  quote,
}: StoryExportCardProps) {
  const displayQuote = quote ?? book.quote;

  return (
    <div
      className="relative flex flex-col items-center overflow-hidden font-sans"
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT, background: CARD_BG }}
    >
      {/* Very faint warm glow pooling at the top center — atmosphere, not a
          spotlight. Kept low-opacity so it never reads as a gradient banner. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[760px]"
        style={{
          background: `radial-gradient(ellipse 70% 100% at 50% 0%, ${ACCENT}1f 0%, transparent 70%)`,
        }}
      />

      {/* ── Hero: the 3D book render, upper half ───────────────────────────── */}
      <div className="relative mt-[150px] flex h-[680px] w-full items-center justify-center">
        {/* Gold underglow — a wide, heavily-blurred ellipse pooled beneath the
            book's base, echoing the grid card's underglow but warmer/larger for
            the hero. Sits behind the book image. */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[40px] h-[150px] w-[460px] rounded-[50%]"
          style={{
            background: ACCENT,
            opacity: 0.32,
            filter: "blur(90px)",
          }}
        />
        <img
          src={heroSrc}
          alt=""
          aria-hidden
          className="relative max-h-full w-auto object-contain"
          style={{ filter: "drop-shadow(0 40px 60px rgba(0,0,0,0.6))" }}
        />
      </div>

      {/* ── Title + author ─────────────────────────────────────────────────── */}
      <h1 className="mt-[40px] max-w-[860px] px-[60px] text-center font-serif text-[72px] font-medium leading-[1.08] text-white">
        {book.title}
      </h1>
      <p
        className="mt-[22px] text-center font-sans text-[30px] tracking-[0.04em]"
        style={{ color: ACCENT }}
      >
        {book.author}
      </p>

      {/* ── Divider ────────────────────────────────────────────────────────── */}
      <Divider />

      {/* ── Metadata columns ───────────────────────────────────────────────── */}
      <div className="flex w-[760px] items-start justify-between">
        <MetaColumn label="Started" value={formatMonthYear(book.dateStarted)} />
        <MetaColumn
          label="Finished"
          value={formatMonthYear(book.dateFinished)}
        />
        <MetaColumn label="Book" value={`No. ${book.bookNumber}`} />
      </div>

      {/* ── Divider ────────────────────────────────────────────────────────── */}
      <Divider />

      {/* ── Quote ──────────────────────────────────────────────────────────── */}
      <div className="relative mt-[20px] flex w-[820px] flex-col items-center px-[40px]">
        {/* Oversized opening quotation mark, gold, sitting above the quote. */}
        <span
          aria-hidden
          className="font-serif italic leading-[0.6]"
          style={{ color: ACCENT, fontSize: 180, opacity: 0.85 }}
        >
          &ldquo;
        </span>
        <blockquote
          className="mt-[-30px] text-center font-serif text-[44px] italic leading-[1.4]"
          style={{ color: WARM_WHITE }}
        >
          {displayQuote}
        </blockquote>
      </div>

      {/* ── KITAB watermark, flanked by divider lines, pinned to the base ──── */}
      <div className="mb-[90px] mt-auto flex items-center gap-[28px]">
        <span
          aria-hidden
          className="block h-px w-[90px]"
          style={{ background: `${ACCENT}80` }}
        />
        <span
          className="font-sans text-[28px] font-medium uppercase tracking-[0.5em] text-white"
          style={{ paddingLeft: "0.5em" /* offset the trailing letter-spacing */ }}
        >
          Kitab
        </span>
        <span
          aria-hidden
          className="block h-px w-[90px]"
          style={{ background: `${ACCENT}80` }}
        />
      </div>
    </div>
  );
}

/** Thin gold-tinted horizontal rule used between sections. */
function Divider() {
  return (
    <span
      aria-hidden
      className="my-[44px] block h-px w-[520px]"
      style={{
        background: `linear-gradient(to right, transparent, ${ACCENT}66, transparent)`,
      }}
    />
  );
}

/** One metadata column: a small-caps gold label over a light value. */
function MetaColumn({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-[14px]">
      <span
        className="font-sans text-[22px] uppercase tracking-[0.28em]"
        style={{ color: ACCENT, paddingLeft: "0.28em" }}
      >
        {label}
      </span>
      <span
        className="font-sans text-[30px] tracking-[0.02em]"
        style={{ color: WARM_WHITE }}
      >
        {value}
      </span>
    </div>
  );
}
