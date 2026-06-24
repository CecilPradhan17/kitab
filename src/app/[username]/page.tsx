import ProfileHeader from "@/features/profile/ProfileHeader";
import { mockProfile } from "@/features/profile/mockProfile";
import LibraryView from "@/features/library/LibraryView";
import { mockBooks } from "@/features/library/mockBooks";

/** Public profile page — the shareable front door of a user's library.
    Mock-data phase: the [username] route param is intentionally ignored and the
    same mock profile renders regardless of the URL. This gets replaced with a
    real fetch keyed on the username once the backend exists. */
export default function ProfilePage() {
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

        <LibraryView books={mockBooks} />
      </section>
    </main>
  );
}
