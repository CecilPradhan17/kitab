// Shared by every skeleton placeholder block across the app: a warm-dark
// shimmer gradient (not the standard cold grey skeleton) sweeping via the
// `animate-shimmer` utility registered in globals.css. bg-[#1a1917] is the
// fallback/base tone the gradient sits on; the gradient itself is 3-stop so
// the sweep reads as a highlight passing over the block rather than a flat
// color shift.
export const SHIMMER =
  "animate-shimmer bg-[#1a1917] bg-[length:200%_100%] bg-[linear-gradient(90deg,#1a1917_25%,#2a2520_50%,#1a1917_75%)]";
