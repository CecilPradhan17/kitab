import * as THREE from "three";
import type { Book } from "@/features/library/mockBooks";
import { deriveSpineColor, FALLBACK_SPINE_COLOR } from "@/lib/coverColor";

// Offscreen, imperative Three.js render of a single book to a transparent PNG
// data URL — the hero image for the story export card. This is NOT React Three
// Fiber: we render exactly once, outside React's loop, then dispose everything.
// The geometry recipe + lighting deliberately mirror the live view
// (book-detail/Book3D + BookScene) so the export matches what the user saw.

// Mirrors Book3D's geometry: a 2:3 cover ratio with a thin hardcover depth.
const WIDTH = 2;
const HEIGHT = 3;
const DEPTH = 0.45;
const PAGE_COLOR = "#e8e0cf";

// Portrait render target. Transparent, so the card's background and gold
// underglow show through; pixelRatio 2 keeps the hero crisp when the card is
// captured at full 1080×1920.
const RENDER_WIDTH = 1000;
const RENDER_HEIGHT = 1240;
const PIXEL_RATIO = 2;

// Baked-in cinematic pose (the export render is fixed, not user-controlled): the
// book is turned so the front cover plus the left spine and top page-edge show.
const TILT_Y = THREE.MathUtils.degToRad(-22);
const TILT_X = THREE.MathUtils.degToRad(3);

/** Render `book` to a transparent PNG data URL at the angle/lighting of the
    export spec. Browser-only (needs WebGL + a DOM canvas). Resolves once the
    cover texture has loaded and the single frame is captured. */
export async function renderBookToDataURL(book: Book): Promise<string> {
  // Load the cover up front so we have its pixels for both the texture and the
  // spine-color extraction. crossOrigin keeps the canvas clean (Open Library
  // serves `Access-Control-Allow-Origin: *`), which toDataURL() requires.
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  const cover = await loader.loadAsync(book.coverUrl);
  cover.colorSpace = THREE.SRGBColorSpace;
  cover.anisotropy = 8;

  const spineColor =
    deriveSpineColor(cover.image as CanvasImageSource) ?? FALLBACK_SPINE_COLOR;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    30,
    RENDER_WIDTH / RENDER_HEIGHT,
    0.1,
    100,
  );
  // Slightly above and back so the lookAt reveals the top page-edge.
  camera.position.set(0, 0.35, 7.2);
  camera.lookAt(0, 0, 0);

  // Lighting mirrors BookScene: soft ambient fill so dark faces don't crush, a
  // warm directional key from the front-right, and a gold rim from the left.
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xfff4e0, 2);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.SpotLight(0xc9973a, 25, 0, 0.6, 1);
  rim.position.set(-4, 3, 3); // target defaults to the origin — the book
  scene.add(rim);

  // Same material order as Book3D: [+X, -X, +Y, -Y, +Z, -Z] =
  // [page, spine, page, page, cover, spine].
  const geometry = new THREE.BoxGeometry(WIDTH, HEIGHT, DEPTH);
  const page = () =>
    new THREE.MeshStandardMaterial({ color: PAGE_COLOR, roughness: 0.9 });
  const materials = [
    page(),
    new THREE.MeshStandardMaterial({ color: spineColor, roughness: 0.55 }),
    page(),
    page(),
    new THREE.MeshStandardMaterial({ map: cover, roughness: 0.45 }),
    new THREE.MeshStandardMaterial({ color: spineColor, roughness: 0.7 }),
  ];
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.rotation.set(TILT_X, TILT_Y, 0);
  scene.add(mesh);

  // Offscreen renderer. preserveDrawingBuffer is REQUIRED or toDataURL() returns
  // a blank image (CLAUDE.md). alpha + transparent clear give the cut-out PNG.
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(PIXEL_RATIO);
  renderer.setSize(RENDER_WIDTH, RENDER_HEIGHT);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // matches R3F's default look
  renderer.setClearColor(0x000000, 0);

  renderer.render(scene, camera);
  const dataUrl = canvas.toDataURL("image/png");

  // Dispose everything: an offscreen renderer that isn't torn down leaks its GPU
  // context, and browsers cap how many WebGL contexts can be live at once.
  geometry.dispose();
  materials.forEach((m) => m.dispose());
  cover.dispose();
  renderer.dispose();
  renderer.forceContextLoss();

  return dataUrl;
}
