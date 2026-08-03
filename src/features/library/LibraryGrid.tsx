import type { Book } from "./mockBooks";
import BookCard from "./BookCard";
import AddBookButton from "@/features/add-book/AddBookButton";

interface LibraryGridProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  /** Owner-only: renders the add-book tile as the first grid item. */
  isOwner: boolean;
  onBookAdded: () => void;
}

export default function LibraryGrid({
  books,
  onSelectBook,
  isOwner,
  onBookAdded,
}: LibraryGridProps) {
  // A visitor looking at an empty library sees a message; an owner sees the
  // add-book tile instead (below), so there's always a way to get started.
  if (books.length === 0 && !isOwner) {
    return (
      <div className="flex w-full justify-center py-16">
        <p className="max-w-sm text-center font-sans text-lg font-medium text-accent">
          The user has not added any books yet, tell them to start now :)
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 justify-items-center gap-x-8 gap-y-12 sm:mx-[10vw] sm:grid-cols-4 [&>*]:w-full [&>*]:max-w-40">
      {isOwner && <AddBookButton onBookAdded={onBookAdded} />}
      {books.map((book) => (
        <BookCard key={book.id} book={book} onSelect={onSelectBook} />
      ))}
    </div>
  );
}
