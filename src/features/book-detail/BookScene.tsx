"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { Book } from "@/features/library/mockBooks";
import Book3D from "./Book3D";

interface BookSceneProps {
  book: Book;
}

/** The on-demand 3D stage for a single book. Transparent background so the
    modal's dark panel shows through; lighting is mostly-dark with a warm gold
    rim to match the editorial/cinematic brand. Only mounts client-side (the
    modal renders nothing on the server), so the Canvas never hits SSR. */
export default function BookScene({ book }: BookSceneProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      // Offset to the left so the book is first seen at an angle (front cover
      // plus a hint of the left edge), and pulled in close so it reads larger
      // and fills the frame. x:z is kept at the same -0.8 ratio as before, so
      // the left viewing angle is unchanged — only the distance shrank.
      camera={{ position: [-4, 1.7, 5], fov: 35 }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent" }}
    >
      {/* Soft fill so the dark faces don't crush to black... */}
      <ambientLight intensity={0.6} />
      {/* ...a cool key from the front-right to model the cover... */}
      <directionalLight position={[3, 4, 5]} intensity={2} color="#fff4e0" />
      {/* ...and a warm gold rim from the left for the brand glow. */}
      <spotLight
        position={[-4, 3, 3]}
        intensity={25}
        angle={0.6}
        penumbra={1}
        color="#c9973a"
      />

      <Suspense fallback={null}>
        <Book3D book={book} />
      </Suspense>

      {/* Drag to rotate the book left/right only — no auto-spin. Pinning the
          polar angle just above horizontal gives a fixed tilt-down view and
          removes vertical drag in one move (min === max, so the camera can't
          tilt up or down). Zoom/pan stay off so the book stays framed. */}
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 2.4}
        maxPolarAngle={Math.PI / 2.4}
      />
    </Canvas>
  );
}
