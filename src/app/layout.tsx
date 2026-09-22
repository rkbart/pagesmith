import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
