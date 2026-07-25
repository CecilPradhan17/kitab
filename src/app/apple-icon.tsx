import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Same monogram as icon.tsx, scaled up for iOS home-screen icons (iOS
// applies its own rounded-corner mask, so no border-radius needed here).
export default function AppleIcon() {
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
          fontSize: 110,
          fontWeight: 600,
        }}
      >
        K
      </div>
    ),
    { ...size },
  );
}
