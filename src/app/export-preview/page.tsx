"use client";

import { useEffect, useState } from "react";
import StoryExportCard, {
  CARD_WIDTH,
  CARD_HEIGHT,
} from "@/features/story-export/StoryExportCard";
import { renderBookToDataURL } from "@/features/story-export/renderBook";
import { mockBooks } from "@/features/library/mockBooks";

// Scratch route for tuning the export card + offscreen render (Chunks 1–2). The
// card is authored at native 1080×1920, so we scale the whole thing down to fit
// the screen — never the card's internal sizes. Delete this route once the
// export modal (Chunk 3) renders the card for real.
const PREVIEW_SCALE = 0.42;

export default function ExportPreviewPage() {
  const book = mockBooks[6]; // "Dune" — long title + quote, stress-tests layout
  const [heroSrc, setHeroSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Run the offscreen 3D render once on mount and feed the resulting PNG into
  // the card's hero slot. Guarded so a fast unmount can't set state late.
  useEffect(() => {
    let cancelled = false;
    renderBookToDataURL(book)
      .then((url) => {
        if (!cancelled) setHeroSrc(url);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.stack ?? err.message : String(err);
        console.error("[export-preview] render failed:", message);
        if (!cancelled) setError(message);
      });
    return () => {
      cancelled = true;
    };
  }, [book]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#161616] p-10">
      <div
        style={{
          width: CARD_WIDTH * PREVIEW_SCALE,
          height: CARD_HEIGHT * PREVIEW_SCALE,
        }}
      >
        {heroSrc ? (
          <div
            style={{
              transform: `scale(${PREVIEW_SCALE})`,
              transformOrigin: "top left",
            }}
          >
            <StoryExportCard book={book} heroSrc={heroSrc} />
          </div>
        ) : error ? (
          <pre className="max-w-[400px] whitespace-pre-wrap font-mono text-xs text-red-400">
            {error}
          </pre>
        ) : (
          <p className="font-sans text-sm tracking-widest text-muted uppercase">
            Rendering…
          </p>
        )}
      </div>
    </main>
  );
}
