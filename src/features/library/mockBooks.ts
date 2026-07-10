// Mock data for the library grid (frontend prototyping phase only).
// Shape matches the eventual real data shape exactly, so swapping this for a
// real fetch later requires no component changes.
//
// Covers are sourced from Open Library by ISBN:
//   https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg
// (real, high-res cover images — gives realistic dimensions/quality to design
// against, instead of placeholder gray boxes.)

// The canonical shape of a book. Components depend on THIS, not on where the
// data comes from — so swapping mock data for a real API fetch later is a
// no-op for any component that accepts a `Book`.
export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  // Larger variant used for the 3D render (detail view + story export).
  // Falls back to coverUrl on the API for books added before this existed.
  textureUrl: string;
  dateStarted: string;   // ISO date, e.g. "2024-05-12"
  dateFinished: string;  // ISO date, e.g. "2024-05-28"
  bookNumber: number;
  quote: string;
}

export const mockBooks: Book[] = [
  {
    id: "b1f7c2a0-1d3e-4a5b-8c9d-0e1f2a3b4c5d",
    title: "The Alchemist",
    author: "Paulo Coelho",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780061122415-L.jpg",
    textureUrl: "https://covers.openlibrary.org/b/isbn/9780061122415-L.jpg",
    dateStarted: "2024-01-04",
    dateFinished: "2024-01-12",
    bookNumber: 41,
    quote: "And, when you want something, all the universe conspires in helping you to achieve it.",
  },
  {
    id: "c2e8d3b1-2e4f-4b6c-9d0e-1f2a3b4c5d6e",
    title: "Sapiens: A Brief History of Humankind",
    author: "Yuval Noah Harari",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg",
    textureUrl: "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg",
    dateStarted: "2024-01-18",
    dateFinished: "2024-02-09",
    bookNumber: 42,
    quote: "We did not domesticate wheat. It domesticated us.",
  },
  {
    id: "d3f9e4c2-3f5a-4c7d-ae1f-2a3b4c5d6e7f",
    title: "Educated",
    author: "Tara Westover",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg",
    textureUrl: "https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg",
    dateStarted: "2024-02-14",
    dateFinished: "2024-02-27",
    bookNumber: 43,
    quote: "You can love someone and still choose to say goodbye to them.",
  },
  {
    id: "e4a0f5d3-4a6b-4d8e-bf2a-3b4c5d6e7f80",
    title: "Atomic Habits",
    author: "James Clear",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg",
    textureUrl: "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg",
    dateStarted: "2024-03-02",
    dateFinished: "2024-03-15",
    bookNumber: 44,
    quote: "You do not rise to the level of your goals. You fall to the level of your systems.",
  },
  {
    id: "f5b1a6e4-5b7c-4e9f-c03b-4c5d6e7f8091",
    title: "The Midnight Library",
    author: "Matt Haig",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg",
    textureUrl: "https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg",
    dateStarted: "2024-03-20",
    dateFinished: "2024-03-29",
    bookNumber: 45,
    quote: "Between life and death there is a library, and within that library, the shelves go on forever.",
  },
  {
    id: "a6c2b7f5-6c8d-4f0a-d14c-5d6e7f809102",
    title: "Project Hail Mary",
    author: "Andy Weir",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg",
    textureUrl: "https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg",
    dateStarted: "2024-04-03",
    dateFinished: "2024-04-19",
    bookNumber: 46,
    quote: "I penny-pinched my way to the stars.",
  },
  {
    id: "b7d3c8a6-7d9e-4a1b-e25d-6e7f80910213",
    title: "Dune",
    author: "Frank Herbert",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780441013593-L.jpg",
    textureUrl: "https://covers.openlibrary.org/b/isbn/9780441013593-L.jpg",
    dateStarted: "2024-04-25",
    dateFinished: "2024-05-22",
    bookNumber: 47,
    quote: "Fear is the mind-killer. Fear is the little-death that brings total obliteration.",
  },
  {
    id: "c8e4d9b7-8e0f-4b2c-f36e-7f8091021324",
    title: "Normal People",
    author: "Sally Rooney",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9781984822178-L.jpg",
    textureUrl: "https://covers.openlibrary.org/b/isbn/9781984822178-L.jpg",
    dateStarted: "2024-05-27",
    dateFinished: "2024-06-04",
    bookNumber: 48,
    quote: "It was in his power to make her happy. It was something he could just give to her, like money or sex.",
  },
];
