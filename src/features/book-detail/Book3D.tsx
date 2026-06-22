"use client";

import { useState } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import type { Book } from "@/features/library/mockBooks";

// One geometry, reused for every book — only the cover texture changes (the
// "cookie-cutter" approach from CLAUDE.md). Dimensions are a 2:3 cover ratio
// with a thin depth so it reads as a hardcover.
const WIDTH = 2;
const HEIGHT = 3;
const DEPTH = 0.45;

// Cream page edges keep the top/bottom/right faces reading as paper.
const PAGE_COLOR = "#e8e0cf";

// Spine + back start dark and are recolored from the cover's dominant hue
// once it loads (see deriveSpineColor). This is the fallback shown until
// extraction runs — and if the canvas read ever fails for any reason.
const FALLBACK_SPINE_COLOR = "#161616";

// Sampling + selection tuning.
const SAMPLE_EDGE = 24; // downscale the cover to this many px per side before reading
const HUE_BUCKETS = 12; // 30°-wide hue bins; the heaviest bin wins
const MIN_SAT = 0.18; // ignore near-gray pixels when voting on the dominant hue
const MIN_LIGHT = 0.12; // ...and ignore near-black/near-white pixels (shadows, paper)
const MAX_LIGHT = 0.9;
// Final spine look: re-light the winning hue to a fixed dark-but-rich value and
// nudge saturation up, so the edge echoes the cover's color without matching its
// brightness or going muddy.
const SPINE_LIGHT = 0.26;
const SPINE_SAT = 0.7;

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

/** Draw the loaded cover into a small canvas, then find its dominant hue:
    bucket every sufficiently-colorful pixel by hue (weighted by saturation),
    take the heaviest bucket, and average its pixels. The winning hue is then
    re-lit to a fixed dark, rich spine color via THREE's HSL setter so it reads
    as a book edge rather than the full cover color. Falls back to the cover's
    plain average for grayscale covers (no bucket clears the saturation gate),
    and returns null if the canvas read fails so the caller keeps the dark
    default. */
function deriveSpineColor(image: CanvasImageSource): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_EDGE;
  canvas.height = SAMPLE_EDGE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(image, 0, 0, SAMPLE_EDGE, SAMPLE_EDGE);
  const { data } = ctx.getImageData(0, 0, SAMPLE_EDGE, SAMPLE_EDGE);

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
    bucket.weight += s; // saturated pixels vote harder for which bucket wins
    bucket.count++;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
  }

  if (overall.count === 0) return null;

  const winner = buckets.reduce((a, b) => (b.weight > a.weight ? b : a));
  const color = new THREE.Color();

  if (winner.weight === 0) {
    // Grayscale / muddy cover: no dominant hue, so darken the plain average.
    color.setRGB(overall.r / overall.count, overall.g / overall.count, overall.b / overall.count);
    color.multiplyScalar(0.35);
    return `#${color.getHexString(THREE.SRGBColorSpace)}`;
  }

  // Average the winning bucket's pixels, then re-light to the fixed spine look.
  // The pixel values we summed are sRGB, so read/write HSL in sRGB space too.
  color.setRGB(winner.r / winner.count, winner.g / winner.count, winner.b / winner.count, THREE.SRGBColorSpace);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl, THREE.SRGBColorSpace);
  color.setHSL(hsl.h, SPINE_SAT, SPINE_LIGHT, THREE.SRGBColorSpace);
  return `#${color.getHexString(THREE.SRGBColorSpace)}`;
}

interface Book3DProps {
  book: Book;
}

export default function Book3D({ book }: Book3DProps) {
  // Recolored from the cover once it loads; dark until then.
  const [spineColor, setSpineColor] = useState(FALLBACK_SPINE_COLOR);

  // Suspends until the cover loads (caught by the <Suspense> in BookScene).
  // CORS on covers.openlibrary.org is "*", so the texture stays canvas-clean
  // and WebGL accepts it. We tag it sRGB so the cover's colors aren't washed
  // out, and bump anisotropy so it stays crisp at glancing angles. The same
  // clean image lets us read its average color for the spine/back.
  const cover = useTexture(book.coverUrl, (loaded) => {
    const texture = Array.isArray(loaded) ? loaded[0] : loaded;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    const derived = deriveSpineColor(texture.image as CanvasImageSource);
    if (derived) setSpineColor(derived);
  });

  // BoxGeometry material order: [+X, -X, +Y, -Y, +Z, -Z]
  //                             right left top bottom front back
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[WIDTH, HEIGHT, DEPTH]} />
      <meshStandardMaterial attach="material-0" color={PAGE_COLOR} roughness={0.9} />
      <meshStandardMaterial attach="material-1" color={spineColor} roughness={0.55} />
      <meshStandardMaterial attach="material-2" color={PAGE_COLOR} roughness={0.9} />
      <meshStandardMaterial attach="material-3" color={PAGE_COLOR} roughness={0.9} />
      <meshStandardMaterial attach="material-4" map={cover} roughness={0.45} />
      <meshStandardMaterial attach="material-5" color={spineColor} roughness={0.7} />
    </mesh>
  );
}
