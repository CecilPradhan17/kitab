import type { Book } from "./mockBooks";
import BookCard from "./BookCard";

interface LibraryGridProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
}

export default function LibraryGrid({ books, onSelectBook }: LibraryGridProps) {
  if (books.length === 0) {
    return (
      <p className="font-sans text-sm text-muted">
        No books yet — the shelves are waiting.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 justify-items-center gap-x-8 gap-y-12 sm:mx-[10vw] sm:grid-cols-4 [&>*]:w-full [&>*]:max-w-40">
      {books.map((book) => (
        <BookCard key={book.id} book={book} onSelect={onSelectBook} />
      ))}
    </div>
  );
}
