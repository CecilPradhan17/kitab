import type { Metadata } from "next";
import { getProfile } from "@/features/profile/profileApi";
import { getPublicBooks } from "@/features/library/booksApi";

const MAX_DESCRIPTION_LENGTH = 160;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// page.tsx is a client component ("use client"), and metadata can't be
// exported from one - this sibling server-component layout carries the
// route's per-user metadata instead.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);

  if (!profile) {
    return { title: "Library not found", robots: { index: false } };
  }

  const name = profile.displayName ?? profile.username;
  const books = await getPublicBooks(username);
  const description = truncate(
    profile.bio ?? `${name} has read ${books.length} book${books.length === 1 ? "" : "s"} on Kitab.`,
    MAX_DESCRIPTION_LENGTH,
  );
  const title = `${name}’s Library`;

  return {
    title,
    description,
    // Next doesn't deep-merge nested openGraph/twitter objects between a
    // layout and its child - defining either here fully replaces the root
    // layout's, so type/siteName/card have to be repeated or they silently
    // fall back to Next's own defaults (og:type disappears, twitter:card
    // reverts from "summary_large_image" to "summary").
    openGraph: { type: "website", siteName: "Kitab", title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function UsernameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
