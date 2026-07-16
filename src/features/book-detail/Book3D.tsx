"use client";

import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import type { Book } from "@/features/library/mockBooks";
import { relightSpineColor } from "@/lib/coverColor";
import { toMediaUrl } from "@/lib/mediaUrl";

// One geometry, reused for every book — only the cover texture changes (the
// "cookie-cutter" approach from CLAUDE.md). Dimensions are a 2:3 cover ratio
// with a thin depth so it reads as a hardcover.
const WIDTH = 2;
const HEIGHT = 3;
const DEPTH = 0.45;

// Cream page edges keep the top/bottom/right faces reading as paper.
const PAGE_COLOR = "#e8e0cf";

interface Book3DProps {
  book: Book;
}

export default function Book3D({ book }: Book3DProps) {
  // book.spineColor is the raw dominant color computed server-side at
  // ingest (server/src/lib/spineColor.ts) — re-lighting it into the final
  // spine/back tint is now just synchronous color math, no async
  // extraction/canvas-pixel-read needed once the texture itself loads.
  const spineColor = relightSpineColor(book.spineColor);

  // Suspends until the cover loads (caught by the <Suspense> in BookScene).
  // textureUrl is the larger S3/CloudFront variant made for close-up 3D use
  // (falls back to coverUrl for books added before that pipeline existed).
  //
  // crossOrigin is REQUIRED for WebGL to display a cross-origin texture at
  // all (texImage2D/texSubImage2D throws SecurityError and refuses the
  // upload outright without it — unlike canvas 2D's drawImage, which
  // succeeds on a tainted source and only blocks later pixel-reads). That
  // makes this a cross-site CORS-mode request whenever textureUrl points at
  // CloudFront, which turned out to be unreliable in ways that were never
  // fully root-caused despite CloudFront's config checking out correctly at
  // every layer tested (see git history around 2026-07-11 to 07-16).
  // toMediaUrl() sidesteps the whole problem: it rewrites a CloudFront URL to
  // this app's own same-origin /media proxy (next.config.ts), so the request
  // is same-origin and never subject to CORS in the first place — no Origin
  // header, nothing to strip or get cached wrong. Non-CloudFront URLs (the
  // Open Library ingest-failure fallback) pass through unchanged.
  const cover = useTexture(toMediaUrl(book.textureUrl), (loaded) => {
    const texture = Array.isArray(loaded) ? loaded[0] : loaded;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
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
