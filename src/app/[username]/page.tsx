"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Book } from "@/features/library/mockBooks";
import type { Profile } from "@/features/profile/types";
import ProfileHeader from "@/features/profile/ProfileHeader";
import ProfileHeaderSkeleton from "@/features/profile/ProfileHeaderSkeleton";
import { getProfile } from "@/features/profile/profileApi";
import LibraryView from "@/features/library/LibraryView";
import BookCardSkeleton from "@/features/library/BookCardSkeleton";
import { getPublicBooks } from "@/features/library/booksApi";
import { getStoredUser } from "@/lib/auth";

// How many placeholder tiles to show while the library loads. Doesn't need
// to match the real count (unknown until the fetch resolves) - just enough
// to fill a couple of rows at the grid's widest (sm:grid-cols-4) so the
// skeleton reads as a populated shelf rather than a token gesture.
const SKELETON_BOOK_COUNT = 8;

// The single library page — same route for the owner and any visitor.
// Ownership only gates which UI renders (add/edit/delete affordances); the
// data fetched and the route itself are identical either way. The real
// security boundary is Express rejecting writes without a matching JWT.
export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchAll = useCallback(async () => {
    const [profileData, booksData] = await Promise.all([
      getProfile(username),
      getPublicBooks(username),
    ]);

    if (!profileData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setProfile(profileData);
    setBooks(booksData);
    setIsOwner(getStoredUser()?.username === username);
    setLoading(false);
  }, [username]);

  // react-hooks/set-state-in-effect fires here, but doesn't apply: this is
  // the standard fetch-on-mount pattern (data fetching is a documented,
  // legitimate effect use case), not the "reset local state when a prop
  // changes" case the rule is actually meant to steer away from a
  // key-remount for. There's no synchronous alternative for an async
  // network call, and fetchAll is intentionally a standalone function since
  // LibraryView also calls it directly (as onBooksChanged) after an
  // add/edit/delete, not just on mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  // The static section header (label + heading) below isn't gated on
  // loading - it's copy, not fetched data - so it renders identically in
  // both branches rather than being part of what the skeleton stands in for.
  if (loading) {
    return (
      <main className="flex-1">
        <ProfileHeaderSkeleton />

        <section className="px-8 py-16 sm:px-16">
          <header className="mb-12 flex justify-center">
            <p
              className="font-logo text-3xl tracking-[0.5em] text-white"
              style={{ paddingLeft: "0.5em" /* offset the trailing letter-spacing */ }}
            >
              KITAB
            </p>
          </header>

          <div className="grid grid-cols-2 justify-items-center gap-x-8 gap-y-12 sm:mx-[10vw] sm:grid-cols-4 [&>*]:w-full [&>*]:max-w-40">
            {Array.from({ length: SKELETON_BOOK_COUNT }, (_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </div>
        </section>
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="font-sans text-sm text-muted">
          This library doesn&rsquo;t exist.
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <ProfileHeader profile={profile} booksReadCount={books.length} isOwner={isOwner} />

      <section className="px-8 py-16 sm:px-16">
        <header className="mb-12 flex flex-col items-center gap-2">
          <p className="font-serif text-xl tracking-wide text-muted">
            {isOwner ? "YOUR" : "THE"}
          </p>
          <div className="relative flex w-full items-center justify-center">
            {/* -left-8/sm:-left-16 exactly cancels the section's own
                px-8/sm:px-16 padding, so the span's outer edge lands on the
                true screen edge instead of just this row's edge. */}
            <span
              aria-hidden
              className="absolute -left-8 right-[calc(50%+8rem)] h-px origin-left animate-line-draw bg-white sm:-left-16"
            />
            <p
              className="font-logo text-4xl tracking-[0.5em] text-white"
              style={{ paddingLeft: "0.5em" /* offset the trailing letter-spacing */ }}
            >
              KITAB
            </p>
            <span
              aria-hidden
              className="absolute -right-8 left-[calc(50%+8rem)] h-px origin-right animate-line-draw bg-white sm:-right-16"
            />
          </div>
          <p className="font-serif text-xl tracking-wide text-muted">
            COLLECTION
          </p>
        </header>

        <LibraryView
          books={books}
          profile={profile}
          isOwner={isOwner}
          onBooksChanged={fetchAll}
        />
      </section>
    </main>
  );
}
