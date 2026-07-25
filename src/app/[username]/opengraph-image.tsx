import { ImageResponse } from "next/og";
import { getProfile } from "@/features/profile/profileApi";
import { getPublicBooks } from "@/features/library/booksApi";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A Kitab reading library share card";

// Branded per-profile share card - mirrors the story-export card's dark/gold
// aesthetic (see CLAUDE.md's "Story export feature spec"), but text-only:
// no avatar/cover image is fetched here, on purpose. Every image load in
// this app that crossed an origin boundary (WebGL textures - see
// coverIngest's history in CLAUDE.md) turned into a real reliability
// problem; keeping this card to text and shapes sidesteps that whole class
// of failure for something that only needs to look clean at
// link-preview size.
export default async function Image({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfile(username);
  const books = profile ? await getPublicBooks(username) : [];
  const name = profile?.displayName ?? profile?.username ?? username;

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
          background: "#0a0a0a",
          color: "#ededed",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: 10,
            color: "#c9973a",
            textTransform: "uppercase",
            marginBottom: 48,
          }}
        >
          Kitab
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 600,
            maxWidth: 900,
            textAlign: "center",
          }}
        >
          {name}&rsquo;s Library
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 24,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#c9973a",
          }}
        >
          {books.length} {books.length === 1 ? "Book" : "Books"} Read
        </div>
        <div
          style={{
            marginTop: 64,
            width: 120,
            height: 2,
            background: "#c9973a",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
