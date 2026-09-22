# Components

## Shared
- `Header` — sticky nav (Library, Import, Checker, Settings), mobile menu, "Open Studio" CTA, BuyMeACoffee link (uses `buttonVariants()` on `<a>`, no `asChild`).
- `Footer` — tagline, privacy note, support link.
- `ThemeToggle` — reads the theme from `<html class="dark">` via `useSyncExternalStore` (the boot script in the root layout owns the class pre-paint, so a `useState` initializer would disagree with server HTML and force a client rebuild).

## Landing (`src/components/landing/`)
- `Hero` — split layout, manuscript-sheet dropzone (single or multi-file → staged via `handoff.ts` or merged on the import desk), CTA links via `buttonVariants()`.
- `ProcessPipeline` — Import → Refine → Export bindery steps.
- `FormatStrip` — 6 source-format chips → `/convert/[format]`.
- `FeatureBento` — asymmetric editor-feature grid with workbench mock.
- `AIBand` — dark "apprentice" section: free-in-browser / BYOK split.
- `FinalCta` — closing call to action.

## Library (`src/components/library/`)
- `CoverArt` — real cover, or a monogram placeholder (serif initial, brass rules) so the book title prints exactly once per shelf item (as the heading).
- `ProjectCard` — card-shelf item: cover button (opens the studio), heading + author/updated line, Read / Edit / Delete actions.
- `ProjectRow` — dense list-shelf row: thumb, title/meta line, icon-only Read / Edit / Delete on mobile (labeled on `sm+`).
- `DeleteProjectDialog` — shared destructive confirm (chapter count + cover note), used by both card and row.

## Converter (`src/components/converter/`)
- `FileDropZone` — reusable drag-drop + file input (`accept`, `onFile` / `onFiles` for multi, `label`, `disabled`).
- `ChapterReview` — expandable chapter list with text preview + char count.
- `ImportQueue` — multi-file import queue: per-file status (queued → reading → chapters / warnings / failed), `Cancel` while binding, summary once done.

## Editor (`src/components/editor/`)
- `ChapterList` — drag-reorder, delete, add, active highlight.
- `ChapterEditor` — title/level inputs, formatting toolbar, contenteditable prose area.
- `MetadataForm` — controlled book metadata fields.
- `CoverUpload` — image upload/remove, base64 store.
- `ExportBar` — Metadata/AI toggles, Read + All-books links, Export EPUB button + error display.
- `AIPanel` — Readability/Translate/Edit tools, config badge, apply/copy result.

## Reader (`src/components/reader/`)
- `ReaderRoom` — reading bar (progress, type controls, Library link) + chapter sheet + prev/next nav; owns chapter selection (seeded from the stored bookmark) and mirrors it back to the store so the editor opens where reading stopped.
- `ReaderToc` — contents list with level indentation + active-chapter highlight; rendered as a sticky rail on desktop and inside a dialog drawer on mobile.

## AI (`src/components/ai/`)

(responsibility moved out of the editor folder — `AIPanel` is still documented under Editor above)

## AI (`src/components/ai/`)
- `AIPanel` — Readability/Translate/Edit tools, config badge, apply/copy result (rendered inside the editor).

## Utils (`src/lib/utils/`)
- `handoff.ts` — stage a dropped file in sessionStorage so `/convert/[format]` can auto-parse it.
- `reading-progress.ts` — per-book bookmarks (`chapterId` + scroll ratio) and reader typography prefs, both localStorage.
- `library-prefs.ts` — library cards/list layout choice, localStorage.
- `text.ts` — `generateId`, `slugify`, `truncate`, `stripHtml`, `escapeHtml`, `formatFileSize`, `formatUpdated`, `chapterLabel`, `delay`.

## UI primitives (`src/components/ui/`)
shadcn on Base UI: accordion, badge, button (+`buttonVariants`), card, dialog, input, label, progress, select, separator, slider, switch, tabs, textarea.

## Conventions
- `"use client"` on all interactive components.
- Select handlers: `onValueChange={(v) => v && ...}` (nullable).
- No `asChild` on Button — use `buttonVariants({variant, size, className})` on `Link`/`a`.
