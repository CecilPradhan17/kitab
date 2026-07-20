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

  useEffect(() => {
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
          <header className="mb-12">
            <p className="font-sans text-[0.65rem] uppercase tracking-[0.25em] text-accent">
              The Library
            </p>
            <h2 className="mt-2 font-serif text-4xl text-foreground">
              Books, read.
            </h2>
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
        <header className="mb-12">
          <p className="font-sans text-[0.65rem] uppercase tracking-[0.25em] text-accent">
            The Library
          </p>
          <h2 className="mt-2 font-serif text-4xl text-foreground">
            Books, read.
          </h2>
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
