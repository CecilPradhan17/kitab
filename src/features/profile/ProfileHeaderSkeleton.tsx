import { SHIMMER } from "@/lib/shimmer";

/** Loading placeholder for ProfileHeader, shown while the initial
    profile/books fetch is in flight on /[username]. Mirrors ProfileHeader's
    centered single-column layout (avatar, name, handle, stat, action row) —
    not sized pixel-for-pixel, just close enough that nothing visibly jumps
    when the real header swaps in. */
export default function ProfileHeaderSkeleton() {
  return (
    <header
      aria-hidden
      className="relative w-full px-6 pb-12 pt-14 sm:pb-16 sm:pt-20"
      style={{
        background:
          "radial-gradient(ellipse 50% 40% at 50% 0%, #191309 0%, #0a0908 75%)",
        borderBottom: "0.5px solid rgba(201, 151, 58, 0.15)",
      }}
    >
      <div className="mx-auto flex max-w-[38rem] flex-col items-center">
        {/* Avatar */}
        <div className={`${SHIMMER} h-24 w-24 rounded-full sm:h-28 sm:w-28`} />

        {/* Name + handle */}
        <div className={`${SHIMMER} mt-6 h-8 w-48 rounded-md sm:h-9`} />
        <div className={`${SHIMMER} mt-2 h-4 w-28 rounded-md`} />

        {/* Stat: number over label */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <div className={`${SHIMMER} h-7 w-10 rounded-md`} />
          <div className={`${SHIMMER} h-3 w-20 rounded-md`} />
        </div>

        {/* Action pills */}
        <div className="mt-8 flex items-center gap-3">
          <div className={`${SHIMMER} h-9 w-28 rounded-full`} />
          <div className={`${SHIMMER} h-9 w-32 rounded-full`} />
        </div>
      </div>
    </header>
  );
}
