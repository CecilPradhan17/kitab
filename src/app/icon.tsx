import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const cormorant = await readFile(
    path.join(process.cwd(), "src/app/fonts/CormorantGaramond-Medium.woff"),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 4,
          background: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Cormorant Garamond",
            fontWeight: 500,
            fontSize: 28,
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
