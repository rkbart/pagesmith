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
| EPUB | `src/lib/parsers/epub.ts` | Unzips, reads OPF/spine, inlines images + CSS as data URLs, splits spine files at h1/h2 into chapters, extracts cover |

## Library (`/library`)

- Card or list shelf of every book, newest first — toggle with the
  `LayoutGrid` / `List` segmented control; the choice persists in
  `localStorage["pagesmith-library-view"]` (`src/lib/utils/library-prefs.ts`)
- Search across titles, authors, collection names, and chapter text
  (`matchesQuery` in `src/lib/utils/library-search.ts`): case-insensitive,
  HTML tags stripped before matching so chapter bodies hit; empty state with
  a clear button
- Pagination via `ShelfPagination` (12/page in cards, 10/page in list):
  first/prev/numbered/next/last with windowed numbers (`1 … 5 6 7 … 12`);
  phones get a compact "Page X of Y" label; new queries restart on page one
- Real cover art, or a monogram placeholder (`CoverArt`): a serif initial on
  a paper-to-secondary gradient with brass rules — the book title is printed
  exactly once per card/row (as the heading), so cover-less books no longer
  look like they render the title twice
- Open in the editor, open in the reading room, or delete via the shared
  `DeleteProjectDialog` (chapter count + cover note, destructive confirm)
- "Import EPUB" button (header + empty state) parses an `.epub` straight onto
  the shelf and opens it in the reading room; other formats go through the
  import desk at `/convert`
- Collections: overview grid of folder cards (cover mosaic, counts,
  freshness) with drill-in views at `/library?collection=<id>` (breadcrumb,
  inline rename, two-step delete — books are kept and become unsorted);
  per-book assignment picker on cards and rows; the unsorted shelf keeps its
  pagination; search stays global with folder badges on hits; persisted with
  the shelf
- Duplicate guardrails: importing a title that's already shelved shelves
  `Title (1)`, `Title (2)`, … instead (case-insensitive, existing suffixes
  collapse); same rule for collection names (`uniqueName` in
  `src/lib/utils/naming.ts`)
- No blank books: there is no "New book" action — the shelf only holds books
  that came from an import, and the empty state routes to the import desk or
  the EPUB picker

## Editor

- Chapter CRUD with drag-and-drop reorder
- Rich-text contenteditable toolbar: undo/redo, inline + block formats, alignment, lists, rule, external links (inline URL composer), unlink, clear formatting, image insert, chapter links, and one-tap index generation
- Chapter links (`data-chapter` ids) resolve in-app to chapters and are rewritten to file hrefs on export
- Heading level (1–6) for TOC nesting
- Metadata form: core fields always visible (title, subtitle, author, language, reading direction, export file-name override, description; live word-count/reading-time chip) plus collapsed Contributors (translator/editor/illustrator/cover designer with marc roles), Publishing (publisher, publication date, ISBN, edition, rights, producer), Discovery (subject, keywords, BISAC category, audience), and Series (name + position) sections — all emitted as standard EPUB 3 OPF and read back on import
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
- Word dictionary lookup via DictionaryAPI.dev with AI fallback for multi-word phrases
- BYOK provider registry via Settings (Ollama local by default; OpenRouter, Token Harbor, OpenCode Zen, Hugging Face, NVIDIA, Groq, Gemini, DeepSeek, OpenAI, Anthropic, custom endpoint)
- Browser-mode placeholder for free/local use

## Other

- Free, no account, no server upload of files
- BuyMeACoffee link: https://www.buymeacoffee.com/rkbart
- Responsive, dark-mode ready (shadcn/Tailwind v4)
