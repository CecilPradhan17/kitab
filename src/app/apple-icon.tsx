import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Same book-shaped monogram as icon.tsx, scaled up for iOS home-screen icons.
// Kept fully opaque (iOS fills transparent PNG icons with an unwanted
// background otherwise) and full-bleed, with borderRadius as the only
// remaining "book" cue at this size.
export default async function AppleIcon() {
  const cormorant = await readFile(
    path.join(process.cwd(), "src/app/fonts/CormorantGaramond-Medium.woff"),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 22,
          background: "#141414",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Cormorant Garamond",
            fontWeight: 500,
            fontSize: 158,
            color: "#c9973a",
          }}
        >
          K
        </span>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Cormorant Garamond", data: cormorant, weight: 500, style: "normal" },
      ],
    },
  );
}
