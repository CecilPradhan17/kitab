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
      camera={{ position: [0, 0, 7], fov: 35 }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent" }}
    >
      {/* Soft fill so the dark faces don't crush to black... */}
      <ambientLight intensity={0.6} />
      {/* ...a cool key from the front-right to model the cover... */}
      <directionalLight position={[3, 4, 5]} intensity={2} color="#fff4e0" />
      {/* ...and a warm gold rim from the left for the brand glow. */}
      <spotLight
        position={[-4, 2, 3]}
        intensity={25}
        angle={0.6}
        penumbra={1}
        color="#c9973a"
      />

      <Suspense fallback={null}>
        <Book3D book={book} />
      </Suspense>

      {/* Drag to rotate; gentle auto-spin for the "wow". Zoom/pan off so the
          book stays framed, and polar limits stop it flipping fully over. */}
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={1.2}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.7}
      />
    </Canvas>
  );
}
