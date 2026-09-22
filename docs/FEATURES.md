# Features

## Conversion (6 formats → EPUB)

| Source | Parser | Detection strategy |
|---|---|---|
| PDF | `src/lib/parsers/pdf.ts` | pdfjs-dist text extraction; regex on "Chapter N", Roman numerals, prologue/epilogue |
| DOCX | `src/lib/parsers/docx.ts` | mammoth → HTML; splits on h1/h2 |
| Markdown | `src/lib/parsers/markdown.ts` | YAML frontmatter for metadata; splits on `#`–`###` |
| HTML | `src/lib/parsers/html.ts` | Strips nav/ads/scripts; splits on h1/h2; extracts meta tags |
| TXT | `src/lib/parsers/txt.ts` | Pattern-based chapter lines; paragraph → HTML; dialogue detection |
| EPUB | `src/lib/parsers/epub.ts` | Unzips, reads OPF/spine, extracts chapters + cover |

## Editor

- Chapter CRUD with drag-and-drop reorder
- Rich-text contenteditable toolbar (inline + block formats)
- Heading level (1–6) for TOC nesting
- Metadata form (title, author, language, ISBN, publisher, subject, description)
- Cover upload (base64 data URL)
- Auto TOC rebuild on every chapter change
- Multi-project support with localStorage persistence

## Preview & export

- In-browser preview dialog with TOC sidebar
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
