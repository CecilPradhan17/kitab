import type { Profile } from "./types";

export const mockProfile: Profile = {
  id: "mock-user-001",
  username: "cecilpradhan",
  displayName: "Cecil Pradhan",
  bio: "Reading my way through the world. 57 books and counting.",
  avatarUrl: "", // leave empty to test the fallback initial state
  booksReadCount: 57,
  favoriteGenre: "Literary Fiction",
};
