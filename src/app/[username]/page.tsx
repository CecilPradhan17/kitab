"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Book } from "@/features/library/mockBooks";
import type { Profile } from "@/features/profile/types";
import ProfileHeader from "@/features/profile/ProfileHeader";
import { getProfile } from "@/features/profile/profileApi";
import LibraryView from "@/features/library/LibraryView";
import { getPublicBooks } from "@/features/library/booksApi";
import { getStoredUser } from "@/lib/auth";

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

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="font-sans text-[0.65rem] uppercase tracking-[0.2em] text-muted">
          Loading…
        </p>
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
