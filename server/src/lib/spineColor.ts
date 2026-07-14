import sharp from "sharp";

// Mirrors src/lib/coverColor.ts's extraction tuning constants exactly, so
// server-computed colors match what the old client-side extraction produced.
// See that file for the reasoning behind each constant.
const SAMPLE_EDGE = 24;
const HUE_BUCKETS = 12;
const MIN_SAT = 0.18;
const MIN_LIGHT = 0.12;
const MAX_LIGHT = 0.9;

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l]; // gray — no hue
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function toHex(r: number, g: number, b: number): string {
  const channel = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/**
 * Extracts a cover's raw dominant color server-side, at ingest time —
 * the sharp-based equivalent of the old client-side deriveSpineColor's
 * downscale-and-bucket step (src/lib/coverColor.ts), stopping short of that
 * function's final re-light/darken styling, which stays on the frontend.
 *
 * Same algorithm, different pixel source: sharp's raw RGBA buffer here vs.
 * canvas ImageData there. Returns null if the image has no visible pixels
 * (fully transparent) rather than throwing — ingest should never fail
 * because color extraction couldn't find anything to sample.
 */
export async function extractRawSpineColor(imageBuffer: Buffer): Promise<string | null> {
  const { data } = await sharp(imageBuffer)
    .resize(SAMPLE_EDGE, SAMPLE_EDGE, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Per-hue running totals, plus an overall average for the grayscale fallback.
  const buckets = Array.from({ length: HUE_BUCKETS }, () => ({ weight: 0, count: 0, r: 0, g: 0, b: 0 }));
  const overall = { count: 0, r: 0, g: 0, b: 0 };

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // skip transparent pixels
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;

    overall.count++;
    overall.r += r;
    overall.g += g;
    overall.b += b;

    const [h, s, l] = rgbToHsl(r, g, b);
    if (s < MIN_SAT || l < MIN_LIGHT || l > MAX_LIGHT) continue;

    const bucket = buckets[Math.min(HUE_BUCKETS - 1, Math.floor(h * HUE_BUCKETS))];
    bucket.weight += s;
    bucket.count++;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
  }

  if (overall.count === 0) return null;

  const winner = buckets.reduce((a, b) => (b.weight > a.weight ? b : a));
  if (winner.weight === 0) {
    // Grayscale / muddy cover: no dominant hue, return the plain average raw
    // (the frontend darkens this itself — see relightSpineColor).
    return toHex(overall.r / overall.count, overall.g / overall.count, overall.b / overall.count);
  }

  return toHex(winner.r / winner.count, winner.g / winner.count, winner.b / winner.count);
}
