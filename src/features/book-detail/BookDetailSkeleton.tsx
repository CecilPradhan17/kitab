import { SHIMMER } from "@/lib/shimmer";

/** Loading placeholder for BookDetailModal, shown until the 3D scene's cover
    texture has loaded. Mirrors the real modal's actual current layout (see
    BookDetailModal.tsx) — not the story-export card's Started/Finished/Book#
    metadata-columns layout, which this modal doesn't have. Sized to match the
    real content closely enough that nothing visibly jumps when it's swapped
    out (both render simultaneously — see BookDetailModal's sceneReady logic —
    so this only needs to *look* right, not literally drive the layout). */
export default function BookDetailSkeleton() {
  return (
    <div
      aria-hidden
      className="flex w-full flex-col gap-4 sm:flex-row sm:gap-10"
    >
      {/* Top/left: matches the 3D viewer's own sizing exactly, so switching
          to the real canvas never resizes this slot. */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`${SHIMMER} aspect-[2/3] w-[clamp(11rem,24vh,13rem)] rounded-xl sm:w-72`}
        />
      </div>

      {/* Right/bottom: title, author, date line, then the quote area centered
          in the remaining space, then the Share button — same proportions
          and positions as the real metadata column. */}
      <div className="flex flex-1 flex-col items-center sm:items-start">
        <div className={`${SHIMMER} h-7 w-4/5 rounded-md sm:h-9 sm:w-3/5`} />
        <div className={`${SHIMMER} mt-3 h-4 w-2/5 rounded-md sm:h-5 sm:w-1/3`} />
        <div className={`${SHIMMER} mt-4 h-3 w-1/3 rounded-md sm:mt-7`} />

        <div className="flex w-full flex-1 flex-col items-center justify-center">
          <div className={`${SHIMMER} h-24 w-full rounded-md sm:h-32`} />
        </div>

        <div className={`${SHIMMER} h-9 w-32 rounded-full`} />
      </div>
    </div>
  );
}
