export interface Chapter {
  id: string;
  title: string;
  content: string; // HTML content
  order: number;
  level: number; // heading level 1-6, used for TOC nesting
  /** OPF spine href this chapter was parsed from (e.g. "Text/ch02.xhtml").
      Recorded at import so the reader can resolve intra-book links
      (`other-file.xhtml#frag`) to chapters instead of navigating (404). */
  source?: string;
}

export interface BookMetadata {
  title: string;
  subtitle?: string;
  author: string;
  language: string;
  /** Reading direction: spine page-progression-direction ("ltr" default). */
  direction?: "ltr" | "rtl";
  description: string;
  isbn?: string;
  publisher?: string;
  date?: string;
  subject?: string;
  /** Extra discovery keywords — emitted as additional dc:subject entries. */
  keywords?: string;
  /** Subject category code (e.g. BISAC) — emitted with an authority refine. */
  category?: string;
  /** Target audience / age rating — emitted as dc:audience. */
  audience?: string;
  /** Edition / volume ("2nd edition", "Vol. II") — dcterms:hasVersion. */
  edition?: string;
  /** Copyright / license notice — dc:rights. */
  rights?: string;
  /** Ebook producer — dc:contributor with marc role "bkp". */
  producer?: string;
  /** Fixed contributor roles — dc:contributor + marc role refines. */
  translator?: string;
  editor?: string;
  illustrator?: string;
  coverDesigner?: string;
  /** Series name — belongs-to-collection (series). */
  seriesName?: string;
  /** Series position — group-position (only meaningful with seriesName). */
  seriesPosition?: string;
  /** Export filename override (no extension). App-level only, never emitted. */
  exportFileName?: string;
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
