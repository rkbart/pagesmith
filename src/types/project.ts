export interface Chapter {
  id: string;
  title: string;
  content: string; // HTML content
  order: number;
  level: number; // heading level 1-6, used for TOC nesting
}

export interface BookMetadata {
  title: string;
  author: string;
  language: string;
  description: string;
  isbn?: string;
  publisher?: string;
  date?: string;
  subject?: string;
}

export interface BookCover {
  data: string; // base64 data URL
  mimeType: string;
}

export interface Project {
  id: string;
  name: string;
  metadata: BookMetadata;
  chapters: Chapter[];
  cover?: BookCover;
  toc: TOCEntry[];
  /** Shelf organization — null/undefined means "unsorted". */
  collectionId?: string | null;
  createdAt: number;
  updatedAt: number;
}

/** A named folder on the library shelf. Books keep existing when one is deleted. */
export interface Collection {
  id: string;
  name: string;
  createdAt: number;
}

export interface TOCEntry {
  chapterId: string;
  label: string;
  level: number;
  children?: TOCEntry[];
}

export type SourceFormat = "pdf" | "docx" | "markdown" | "html" | "txt" | "epub";

export interface ParseResult {
  chapters: Chapter[];
  metadata: Partial<BookMetadata>;
  cover?: BookCover;
  warnings: string[];
}
