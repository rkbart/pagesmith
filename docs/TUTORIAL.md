# Tutorial

## 1. Convert a file (or several) to EPUB

1. Go to `/convert` or drop files on the homepage.
2. Pick a source format (PDF, DOCX, Markdown, HTML, TXT, EPUB) — or drop a
   mix on the Import desk, which detects each file and routes single files
   to their parse page.
3. Drop/select the file(s). PageSmith parses them and shows detected chapters;
   multiple files are merged into one book in natural filename order.
4. Review warnings, expand chapters to preview.
5. Click **Open in Editor** (single file) or **Open in the studio** (merged queue).

## 1b. Manage your books

On `/library` every book sits on a shelf, newest first:

- Switch between **card** and **list** layouts with the segmented control in
  the header — the choice is remembered on this device.
- **Read** opens the reading room (it resumes the page you stopped on),
  **Edit** opens the studio, the trash icon deletes (with confirmation).
- The **New book / Start a new book** tile creates a blank project.

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

## 4. Read

Click **Read** (editor top bar, or any shelf item) to open the reading room:
chapter sheet with a contents rail (drawer on mobile), prev/next buttons and
arrow keys, a progress bar, and type controls (three sizes, serif/sans) that
persist. Your place is bookmarked per book — reopening resumes the page.

## 5. Export

Click **Export EPUB** → downloads a `.epub` (EPUB 3) file.

## 6. Validate

Go to `/check`, drop the exported EPUB → see errors/warnings/info.

## 7. Start from scratch

`/editor` → **New Book** (no file needed). Add chapters manually and export.
