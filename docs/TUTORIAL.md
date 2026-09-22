# Tutorial

## 1. Convert a file to EPUB

1. Go to `/convert` or drop a file on the homepage.
2. Pick a source format (PDF, DOCX, Markdown, HTML, TXT, EPUB).
3. Drop/select the file. PageSmith parses it and shows detected chapters.
4. Review warnings, expand chapters to preview.
5. Click **Open in Editor**.

## 2. Edit your book

On `/editor`:

- **Chapters sidebar** — click to select, drag to reorder, trash to delete, `+` to add.
- **Title / level** — chapter title input and heading-level select.
- **Toolbar** — bold/italic/underline/strike, block format (p/h1–h4/quote), HR, bullet/numbered lists.
- **Cover** — upload JPG/PNG/WebP in the sidebar.
- **Metadata** — toggle from the top bar (title, author, language, ISBN, publisher, subject, description).

## 3. AI tools

1. Toggle **AI Tools** in the top bar.
2. Choose a tool:
   - **Readability** — Flesch-Kincaid, reading ease, word/sentence stats (works offline).
   - **Translate** — needs API key in Settings.
   - **Edit** — grammar/style/concise/formal/casual (needs API key).
3. Review the result → **Apply to Chapter** or copy.

Configure keys at `/settings` (OpenAI or Anthropic BYOK).

## 4. Preview

Click **Preview** to read the book with a TOC sidebar before export.

## 5. Export

Click **Export EPUB** → downloads a `.epub` (EPUB 3) file.

## 6. Validate

Go to `/check`, drop the exported EPUB → see errors/warnings/info.

## 7. Start from scratch

`/editor` → **New Book** (no file needed). Add chapters manually and export.
