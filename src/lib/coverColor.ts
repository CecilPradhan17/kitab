import * as THREE from "three";

// Spine-color styling, shared by the live 3D view (book-detail/Book3D) and
// the offscreen export renderer (story-export). Dominant-hue *extraction*
// used to happen here too, via a canvas read of the loaded cover texture —
// moved server-side (server/src/lib/spineColor.ts), computed once at ingest
// and stored on the book, because the canvas read required requesting the
// cover with `crossOrigin`, which some ad-blockers/privacy extensions block
// outright for cross-site image fetches. What's left here is pure color
// math: re-light the server-computed raw dominant color into the final spine
// look, tunable without re-ingesting every book.

// Spine + back color when a book has no raw dominant color at all (added
// before this pipeline existed, or extraction found nothing to sample).
export const FALLBACK_SPINE_COLOR = "#161616";

// Final spine look: re-light the raw color to a fixed dark-but-rich value and
// nudge saturation up, so the edge echoes the cover's color without matching
// its brightness or going muddy. Mirrors the tuning the old client-side
// extraction used (server/src/lib/spineColor.ts keeps the matching
// MIN_SAT/etc. constants for the extraction half).
const MIN_SAT = 0.18;
const SPINE_LIGHT = 0.26;
const SPINE_SAT = 0.7;

/** Re-lights a raw dominant color (from Book.spineColor, computed server-side
    at ingest) into the final spine/back tint. A low-saturation raw color
    (grayscale/muddy cover) is just darkened rather than re-hued, so it
    doesn't get an arbitrary color it never had. Pass null (no raw color
    available) to get FALLBACK_SPINE_COLOR back. */
export function relightSpineColor(rawColor: string | null): string {
  if (!rawColor) return FALLBACK_SPINE_COLOR;

  const color = new THREE.Color(rawColor);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl, THREE.SRGBColorSpace);

  if (hsl.s < MIN_SAT) {
    color.multiplyScalar(0.35);
  } else {
    color.setHSL(hsl.h, SPINE_SAT, SPINE_LIGHT, THREE.SRGBColorSpace);
  }

  return `#${color.getHexString(THREE.SRGBColorSpace)}`;
}
