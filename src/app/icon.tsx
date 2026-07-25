import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Simple gold-on-dark "K" monogram, generated so the favicon matches the
// brand accent without needing a separate designed image asset. The full
// KITAB wordmark treatment (see CLAUDE.md) is reserved for larger surfaces -
// at 32px a single letterform reads better than a squeezed-in wordmark.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#c9973a",
          fontSize: 22,
          fontWeight: 600,
        }}
      >
        K
      </div>
    ),
    { ...size },
  );
}
