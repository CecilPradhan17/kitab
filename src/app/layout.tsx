import type { Metadata, Viewport } from "next";
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

// No NEXT_PUBLIC_SITE_URL yet (app isn't deployed) - falls back to localhost
// so metadataBase always resolves. Set NEXT_PUBLIC_SITE_URL to the real
// domain once deployed, so absolute OG/Twitter image URLs point at prod.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const description =
  "Track the books you've read as a beautifully rendered personal library - 3D book models, and shareable Instagram-style story cards for every book you finish.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Kitab",
    template: "%s · Kitab",
  },
  description,
  openGraph: {
    type: "website",
    siteName: "Kitab",
    title: "Kitab",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Kitab",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
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
