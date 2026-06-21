import BookCard from "@/features/library/BookCard";
import { mockBooks } from "@/features/library/mockBooks";

// TEMPORARY preview scaffold so BookCard can be reviewed visually.
// This will be replaced by the LibraryGrid component in its own step.
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

      <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
        {mockBooks.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </main>
  );
}
