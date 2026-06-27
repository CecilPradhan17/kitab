import LibraryView from "@/features/library/LibraryView";
import { getBooks } from "@/features/library/booksApi";
import AddBookButton from "@/features/add-book/AddBookButton";

export default async function Home() {
  const books = await getBooks();

  return (
    <main className="flex-1 px-8 py-16 sm:px-16">
      <header className="mb-12 flex items-start justify-between gap-6">
        <div>
          <p className="font-sans text-[0.65rem] uppercase tracking-[0.25em] text-accent">
            The Library
          </p>
          <h1 className="mt-2 font-serif text-4xl text-foreground">
            Books, read.
          </h1>
        </div>
        <AddBookButton />
      </header>

      <LibraryView books={books} />
    </main>
  );
}
