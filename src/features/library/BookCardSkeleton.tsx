import { SHIMMER } from "@/lib/shimmer";

/** Loading placeholder for BookCard, shown while the initial library fetch
    is in flight. Mirrors BookCard's shape (cover, then a small label/title/
    author stack) so the skeleton grid lines up with the real one once it
    swaps in — meant to be rendered inside the same grid classes as
    LibraryGrid, not standalone. */
export default function BookCardSkeleton() {
  return (
    <div aria-hidden className="flex w-full flex-col">
      <div className={`${SHIMMER} aspect-[2/3] w-full rounded-lg`} />
      <div className="mt-4 flex flex-col gap-2">
        <div className={`${SHIMMER} h-3 w-8 rounded-md`} />
        <div className={`${SHIMMER} h-5 w-4/5 rounded-md`} />
        <div className={`${SHIMMER} h-4 w-3/5 rounded-md`} />
      </div>
    </div>
  );
}
