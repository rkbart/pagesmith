# Parsers

All parsers return `ParseResult`:

```ts
interface ParseResult {
  chapters: Chapter[];       // id, title, content (HTML), order, level
  metadata: Partial<BookMetadata>;
  cover?: BookCover;         // { data: base64 URL, mimeType }
  warnings: string[];
}
```

Entry point: `parseFile(file, format)` in `src/lib/parsers/index.ts`.
Format detection: `detectFormat(filename)` by extension.

## pdf.ts
- Dynamic import `pdfjs-dist` (worker served locally from `public/pdf.worker.min.mjs`, see `sync:pdf-worker`)
- Extracts per-page text via `getTextContent()`; visual lines via `hasEOL` marks
- Illustrations via operator-list image refs (`page.objs`), JPEG/PNG data URLs, tiny ornaments skipped, first large image → cover
- Metadata from `pdf.getMetadata()` (Title/Author/Subject)
- Chapter regexes: `chapter/ch./part/section + [roman|digits]`, prologue/epilogue/etc., `N. Title`, `ROMAN. `
- Fallback: single "Content" chapter; pre-first-chapter pages → "Introduction"
- Text escaped; 3+ newlines → paragraph breaks

## docx.ts
- Dynamic import `mammoth/mammoth.browser` (typed via `src/types/mammoth.d.ts`)
- styleMap maps Word Title/Heading 1–6 → h1–h6
- Splits output HTML on `h1, h2`
- Content before first heading → "Introduction"
- Filename → title metadata

## markdown.ts
- Dynamic import `marked`
- YAML frontmatter (`--- ... ---`) → title, author, description, language, isbn, publisher, subject
- Splits body on `#{1,3}` headings; level = heading depth (max 3)
- Each chunk rendered with `marked.parse()`

## html.ts
- DOMParser `text/html`
- Strips script/style/nav/header/footer/aside/iframe/forms/ads/comments
- Metadata from og:title, title, meta author/description
- Splits on `h1, h2`; pre-heading content → Introduction (if >50 visible chars)
- DocumentFragment serialization via temp `<div>` (fragments have no innerHTML)

## txt.ts
- Line-based chapter patterns (part/book/volume, chapter N, roman, `N. `, `#` headings)
- Dedupes starts within 5 lines
- Paragraph split on blank lines → `<p>`; dialogue lines get `class="dialogue"`
- Heading line prepended as `<hN>`

## epub.ts
- JSZip load → find OPF via `META-INF/container.xml` rootfile (fallback: `*.opf`)
- Reads dc metadata, manifest, spine order
- Cover: manifest item with `image/*` + "cover" in id/href → base64 data URL
- Each spine xhtml/html file → chapter (title from h1/h2/h3/title, content from body)
- Path resolution handles `../` and absolute hrefs

## Common behavior
- Always returns ≥1 chapter (falls back to "Content")
- Warnings for low chapter counts / missing metadata
- All parsing is client-side; no network calls
