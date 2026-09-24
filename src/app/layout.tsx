import type { Metadata } from "next";
import { Inter, Playfair_Display, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { DictionaryTooltip } from "@/components/ai/DictionaryTooltip";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PageSmith — Create & Edit EPUBs with AI",
  description:
    "Free, browser-first EPUB creator and editor. Convert PDF, DOCX, Markdown, HTML, and TXT to EPUB. Edit, translate, and polish your books with AI — all locally in your browser.",
  keywords: [
    "epub",
    "ebook",
    "converter",
    "pdf to epub",
    "markdown to epub",
    "epub editor",
    "ai translation",
    "self-publishing",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("pagesmith-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark");}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Header />
        <DictionaryTooltip />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
