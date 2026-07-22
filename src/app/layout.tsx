import type { Metadata } from "next";
import { Playfair_Display, Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import SideNav from "@/features/nav/SideNav";

// Serif display face for titles and the cinematic "reveal" moments.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

// Sans for UI chrome and metadata labels (small-caps, wide tracking).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Reserved for the Kitab wordmark/logo only ("K I T A B", white, wide
// tracking) - not a general-purpose serif, don't reach for it elsewhere.
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Library",
  description: "A personal library of books read.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SideNav />
        {children}
      </body>
    </html>
  );
}
