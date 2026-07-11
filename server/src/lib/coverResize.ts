import sharp from "sharp";

// Small variant for the library grid card; larger variant for the 3D detail
// render and story export card, which both show the cover close-up/full-bleed.
const GRID_SIZE = { width: 500, height: 750 };
const TEXTURE_SIZE = { width: 1000, height: 1500 };

export interface CoverVariants {
  gridBuffer: Buffer;
  textureBuffer: Buffer;
}

/**
 * Resizes a raw cover image into the two variants every stored book cover
 * needs. Shared by the Open Library ingest pipeline (coverIngest.ts) and
 * custom book cover uploads (customBooks.ts) so the sizing/encoding is
 * defined in exactly one place.
 */
export async function resizeCoverVariants(raw: Buffer): Promise<CoverVariants> {
  const [gridBuffer, textureBuffer] = await Promise.all([
    sharp(raw)
      .resize(GRID_SIZE.width, GRID_SIZE.height, { fit: "cover", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer(),
    sharp(raw)
      .resize(TEXTURE_SIZE.width, TEXTURE_SIZE.height, { fit: "cover", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer(),
  ]);

  return { gridBuffer, textureBuffer };
}
