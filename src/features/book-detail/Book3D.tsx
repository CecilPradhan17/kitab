"use client";

import { useState } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import type { Book } from "@/features/library/mockBooks";
import { deriveSpineColor, FALLBACK_SPINE_COLOR } from "@/lib/coverColor";

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
