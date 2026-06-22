import LibraryView from "@/features/library/LibraryView";
import { mockBooks } from "@/features/library/mockBooks";

export default function Home() {
  return (
    <main className="flex-1 px-8 py-16 sm:px-16">
      <header className="mb-12">
        <p className="font-sans text-[0.65rem] uppercase tracking-[0.25em] text-accent">
          The Library
        </p>
        <h1 className="mt-2 font-serif text-4xl text-foreground">
          Books, read.
        </h1>
      </header>

      <LibraryView books={mockBooks} />
    </main>
  );
}
