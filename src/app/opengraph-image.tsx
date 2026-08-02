import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Kitab";

// No params here (unlike [username]/opengraph-image.tsx), so this route has
// nothing dynamic to fetch - Next prerenders it once at build time, which is
// why loading the real brand font over the network is fine here but wasn't
// worth it for the per-profile card.
async function loadLogoFont() {
  const cssUrl =
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500";
  // Google's CSS2 API serves woff2 to a modern browser's User-Agent (which
  // satori, what ImageResponse renders with, can't parse), but falls back
  // to ttf for a request with no recognized UA at all - which is what
  // Node's fetch sends by default, so no UA-spoofing trick is needed here.
  const css = await (await fetch(cssUrl)).text();
  const match = css.match(/src: url\(([^)]+)\) format\('(opentype|truetype)'\)/);
  if (!match) throw new Error("Could not resolve Cormorant Garamond font URL");
  const fontResponse = await fetch(match[1]);
  return fontResponse.arrayBuffer();
}

// The site-wide share card, shown for the root/landing link and any route
// that doesn't define its own opengraph-image (e.g. /login, /register).
// Text-and-shapes only, same reasoning as the per-profile card: the KITAB
// wordmark treatment (font-logo, white, tracking-[0.5em] - see
// [username]/page.tsx's header) is the one thing this needs to get right.
export default async function Image() {
  const cormorant = await loadLogoFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 50% 35%, rgba(201,151,58,0.16), transparent 60%), #0a0a0a",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Cormorant Garamond",
            fontWeight: 500,
            fontSize: 108,
            color: "#ffffff",
            textTransform: "uppercase",
            letterSpacing: "0.5em",
            paddingLeft: "0.5em",
          }}
        >
          KITAB
        </div>
        <div
          style={{
            marginTop: 56,
            width: 140,
            height: 2,
            background: "#c9973a",
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Cormorant Garamond",
          data: cormorant,
          style: "normal",
          weight: 500,
        },
      ],
    },
  );
}
