import ProfileHeader from "@/features/profile/ProfileHeader";
import { mockProfile } from "@/features/profile/mockProfile";
import LibraryView from "@/features/library/LibraryView";
import { getPublicBooks } from "@/features/library/booksApi";

// Public profile page — accessible to all visitors, no auth required.
// Books come from the public API endpoint (no token needed).
// Profile header is still mock data until Chunk 6 wires up the profile API.
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const books = await getPublicBooks(username);

  return (
    <main className="flex-1">
      <ProfileHeader profile={mockProfile} />

      <section className="px-8 py-16 sm:px-16">
        <header className="mb-12">
          <p className="font-sans text-[0.65rem] uppercase tracking-[0.25em] text-accent">
            The Library
          </p>
          <h2 className="mt-2 font-serif text-4xl text-foreground">
            Books, read.
          </h2>
        </header>

        <LibraryView books={books} />
      </section>
    </main>
  );
}
