import { SHIMMER } from "@/lib/shimmer";

/** Loading placeholder for StoryExportCard, shown in ExportModal's preview
    box while the offscreen 3D hero render is still in flight. Mirrors the
    real card's actual current layout (see StoryExportCard.tsx): KITAB
    watermark header, hero, title/author, a divider, the Started/Finished/
    Book# metadata columns, another divider, the "Reader's note:" heading +
    quote centered in the remaining space, and the avatar+name attribution
    pinned to the base. Built with relative/percentage sizing rather than
    StoryExportCard's fixed 1080-scale pixel values, since this only ever
    renders inside the small preview box (never captured by html-to-image),
    so there's no native resolution to match. */
export default function StoryExportCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex h-full w-full flex-col items-center bg-[#080706] px-[8%] pb-[6%] pt-[6%]"
    >
      {/* KITAB watermark, flanked by divider lines */}
      <div className="flex items-center gap-2">
        <div className={`${SHIMMER} h-px w-6`} />
        <div className={`${SHIMMER} h-2 w-10 rounded-sm`} />
        <div className={`${SHIMMER} h-px w-6`} />
      </div>

      {/* Hero */}
      <div className={`${SHIMMER} mt-[8%] aspect-[2/3] w-[42%] rounded-md`} />

      {/* Title + author */}
      <div className={`${SHIMMER} mt-[7%] h-5 w-3/5 rounded-sm`} />
      <div className={`${SHIMMER} mt-2 h-3 w-1/3 rounded-sm`} />

      {/* Divider */}
      <div className={`${SHIMMER} mt-[6%] h-px w-full`} />

      {/* Started / Finished / Book# columns */}
      <div className="mt-[6%] flex w-full justify-between">
        <div className={`${SHIMMER} h-3 w-1/5 rounded-sm`} />
        <div className={`${SHIMMER} h-3 w-1/5 rounded-sm`} />
        <div className={`${SHIMMER} h-3 w-1/6 rounded-sm`} />
      </div>

      {/* Divider */}
      <div className={`${SHIMMER} mt-[6%] h-px w-full`} />

      {/* "Reader's note:" heading + quote, centered in the remaining space —
          same idea as the real card's flex-1/justify-center quote section. */}
      <div className="mt-[5%] flex w-full flex-1 flex-col items-start justify-center gap-2.5">
        <div className={`${SHIMMER} h-2.5 w-1/3 rounded-sm`} />
        <div className={`${SHIMMER} h-3 w-full rounded-sm`} />
        <div className={`${SHIMMER} h-3 w-5/6 rounded-sm`} />
        <div className={`${SHIMMER} h-3 w-2/3 rounded-sm`} />
      </div>

      {/* Attribution: dash + avatar, name below — pinned toward the base */}
      <div className="flex w-full flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <div className={`${SHIMMER} h-px w-3`} />
          <div className={`${SHIMMER} h-6 w-6 rounded-full`} />
        </div>
        <div className={`${SHIMMER} h-2.5 w-1/4 rounded-sm`} />
      </div>
    </div>
  );
}
