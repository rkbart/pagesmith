# Features

## Conversion (6 formats → EPUB)

Import accepts **one or many** files per drop. Multiple files are parsed
sequentially in natural filename order (`2-mid` before `10-end`) and merged
into a single book: chapters are renumbered across files, metadata is
first-non-empty-wins, and the cover comes from the first file that has one.
Failed files are skipped and reported per row.

| Source | Parser | Detection strategy |
|---|---|---|
| PDF | `src/lib/parsers/pdf.ts` | pdfjs-dist text extraction; regex on "Chapter N", Roman numerals, prologue/epilogue |
| DOCX | `src/lib/parsers/docx.ts` | mammoth → HTML; splits on h1/h2 |
| Markdown | `src/lib/parsers/markdown.ts` | YAML frontmatter for metadata; splits on `#`–`###` |
| HTML | `src/lib/parsers/html.ts` | Strips nav/ads/scripts; splits on h1/h2; extracts meta tags |
| TXT | `src/lib/parsers/txt.ts` | Pattern-based chapter lines; paragraph → HTML; dialogue detection |
| EPUB | `src/lib/parsers/epub.ts` | Unzips, reads OPF/spine, extracts chapters + cover |

## Library (`/library`)

- Card or list shelf of every book, newest first — toggle with the
  `LayoutGrid` / `List` segmented control; the choice persists in
  `localStorage["pagesmith-library-view"]` (`src/lib/utils/library-prefs.ts`)
- Search across titles, authors, and chapter text (`matchesQuery` in
  `src/lib/utils/library-search.ts`): case-insensitive, HTML tags stripped
  before matching so chapter bodies hit; empty state with a clear button
- Pagination via `ShelfPagination` (12/page in cards, 10/page in list):
  first/prev/numbered/next/last with windowed numbers (`1 … 5 6 7 … 12`);
  phones get a compact "Page X of Y" label; new queries restart on page one
- Real cover art, or a monogram placeholder (`CoverArt`): a serif initial on
  a paper-to-secondary gradient with brass rules — the book title is printed
  exactly once per card/row (as the heading), so cover-less books no longer
  look like they render the title twice
- Open in the editor, open in the reading room, or delete via the shared
  `DeleteProjectDialog` (chapter count + cover note, destructive confirm)
- "New book" tile creates a blank project and drops you in the editor
- Empty state routes to the import desk or a blank book

## Editor

- Chapter CRUD with drag-and-drop reorder
- Rich-text contenteditable toolbar (inline + block formats)
- Heading level (1–6) for TOC nesting
- Metadata form (title, author, language, ISBN, publisher, subject, description)
- Cover upload (base64 data URL)
- Auto TOC rebuild on every chapter change
- Multi-project support, persisted to IndexedDB (`pagesmith-db`)

## Reading Room (`/read`)

- Full-page reader for the active (or most recently edited) book
- Chapter HTML with active-table-of-contents rail; off-canvas drawer on mobile
- Prev/next chapter buttons, arrow keys, progress bar, end-of-book marker
- Type controls: three text sizes, serif/sans toggle (persisted)
- Per-book bookmark (`chapterId` + scroll ratio) — reopening resumes the page

## Preview & export

- EPUB 3 generation (JSZip): mimetype, container.xml, content.opf, nav.xhtml, styles.css, chapter XHTML, optional cover
- One-click Blob download

## EPUB Checker

`/check` validates: mimetype, container.xml, OPF parse, required metadata, manifest/spine integrity, nav document, chapter XHTML parse, external links.

## AI (hybrid)

- Readability scoring (offline, Flesch-Kincaid)
- Translation, editing, summaries, chapter detection, consistency analysis (API or stub)
- BYOK OpenAI / Anthropic via Settings
- Browser-mode placeholder for free/local use

## Other

- Free, no account, no server upload of files
- BuyMeACoffee link: https://www.buymeacoffee.com/rkbart
- Responsive, dark-mode ready (shadcn/Tailwind v4)
