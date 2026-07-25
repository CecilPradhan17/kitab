import type { Metadata } from "next";

// register/page.tsx is a client component ("use client"), and metadata
// can't be exported from one - this sibling server-component layout
// carries the route's metadata instead.
export const metadata: Metadata = {
  title: "Sign up",
  robots: { index: false },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
