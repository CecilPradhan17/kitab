"use client";

import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import type { Book } from "@/features/library/mockBooks";

// One geometry, reused for every book — only the cover texture changes (the
// "cookie-cutter" approach from CLAUDE.md). Dimensions are a 2:3 cover ratio
// with a thin depth so it reads as a hardcover.
const WIDTH = 2;
const HEIGHT = 3;
const DEPTH = 0.45;

// Non-cover faces. Cream page edges + a dark spine/back keep the focus on the
// cover while still reading as a real book object.
const PAGE_COLOR = "#e8e0cf";
const SPINE_COLOR = "#161616";
const BACK_COLOR = "#1c1c1c";

interface Book3DProps {
  book: Book;
}

export default function Book3D({ book }: Book3DProps) {
  // Suspends until the cover loads (caught by the <Suspense> in BookScene).
  // CORS on covers.openlibrary.org is "*", so the texture stays canvas-clean
  // and WebGL accepts it. We tag it sRGB so the cover's colors aren't washed
  // out, and bump anisotropy so it stays crisp at glancing angles.
  const cover = useTexture(book.coverUrl, (loaded) => {
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
      <meshStandardMaterial attach="material-1" color={SPINE_COLOR} roughness={0.55} />
      <meshStandardMaterial attach="material-2" color={PAGE_COLOR} roughness={0.9} />
      <meshStandardMaterial attach="material-3" color={PAGE_COLOR} roughness={0.9} />
      <meshStandardMaterial attach="material-4" map={cover} roughness={0.45} />
      <meshStandardMaterial attach="material-5" color={BACK_COLOR} roughness={0.7} />
    </mesh>
  );
}
