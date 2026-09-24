# Components

## Shared
- `Header` — sticky nav (Library, Import, Proof Desk, Studio, Settings), mobile menu, theme toggle, BuyMeACoffee link.
- `Footer` — tagline, privacy note, official Buy Me a Coffee button (`BmcButton`, static vendor markup — the vendor script needs `document.write`), Email row (`CONTACT_EMAIL`, blank until set), GitHub profile link.
- `ThemeToggle` — reads the theme from `<html class="dark">` via `useSyncExternalStore` (the boot script in the root layout owns the class pre-paint, so a `useState` initializer would disagree with server HTML and force a client rebuild); renders the Classic toggle from `@theme-toggles/react`.

## Landing (`src/components/landing/`)
- `Hero` — split layout, manuscript-sheet dropzone (single or multi-file → staged via `handoff.ts` or merged on the import desk), CTA links via `buttonVariants()`.
- `ProcessPipeline` — Import → Refine → Export bindery steps.
- `FormatStrip` — 6 source-format chips → `/convert/[format]`.
- `FeatureBento` — workbench grid: chapters mock, metadata, preview, library shelf (search/views/collections), validation chips.
- `AIBand` — dark "apprentice" section: free-in-browser / BYOK split.
- `FinalCta` — closing call to action.

## Library (`src/components/library/`)
- `CoverArt` — real cover, or a monogram placeholder (serif initial, brass rules) so the book title prints exactly once per shelf item (as the heading).
- `ProjectCard` — card-shelf item: cover button (opens the studio), heading + author/updated line, collection picker, Read / Edit / Delete actions.
- `ProjectRow` — dense list-shelf row: thumb, title/meta line, collection picker (`md+`), icon-only Read / Edit / Delete on mobile (labeled on `sm+`).
- `CollectionCard` — folder on the overview grid: member cover mosaic, name, counts, freshness; click drills into `?collection=<id>`.
- `CollectionSelect` — file-a-book picker (Unsorted + collections); resolves its own trigger label so a stale id never renders, truncates long names with `title` tooltips.
- `ShelfPagination` — first/prev/numbered/next/last pager with windowed numbers + ellipsis; compact "Page X of Y" label on phones. `pageNumbers()` is exported for testing.
- `DeleteProjectDialog` — shared destructive confirm (chapter count + cover note), used by both card and row.

## Converter (`src/components/converter/`)
- `FileDropZone` — reusable drag-drop + file input (`accept`, `onFile` / `onFiles` for multi, `label`, `disabled`).
- `ChapterReview` — expandable chapter list with text preview + char count.
- `ImportQueue` — multi-file import queue: per-file status (queued → chapters / warnings / failed; parsing shows a spinner with no label), `Cancel` while binding, summary once done.

## Editor (`src/components/editor/`)
- `ChapterList` — drag-reorder, delete, add, active highlight.
- `ChapterEditor` — title/level inputs, formatting toolbar, contenteditable prose area.
- `MetadataForm` — core fields + collapsed Contributors/Publishing/Discovery/Series sections; derived word-count chip (computed, not stored).
- `CoverUpload` — image upload/remove, base64 store.
- `ExportBar` — Metadata/AI toggles, Read + All-books links, Export EPUB button + error display.
- `AIPanel` — Readability/Translate/Edit tools, config badge, apply/copy result.

## Reader (`src/components/reader/`)
- `ReaderRoom` — reading bar (progress, type controls) + chapter sheet + prev/next nav; owns chapter selection (seeded from the stored bookmark) and mirrors it back to the store so the editor opens where reading stopped.
- `ReaderToc` — contents list with level indentation + active-chapter highlight; rendered as a sticky rail on desktop and inside a dialog drawer on mobile.

## AI (`src/components/ai/`)

(responsibility moved out of the editor folder — `AIPanel` is still documented under Editor above)

## AI (`src/components/ai/`)
- `AIPanel` — Readability/Translate/Edit tools, config badge, apply/copy result (rendered inside the editor).

## Utils (`src/lib/utils/`)
- `handoff.ts` — stage a dropped file in sessionStorage so `/convert/[format]` can auto-parse it.
- `reading-progress.ts` — per-book bookmarks (`chapterId` + scroll ratio) and reader typography prefs, both localStorage.
- `library-prefs.ts` — library cards/list layout choice, localStorage.
- `library-search.ts` — pure helpers: `matchesQuery` (title/author/collection/chapter-title/chapter-text, HTML stripped), `paginate` (1-based slice + clamped page), `plainText`.
- `naming.ts` — pure helpers: `uniqueName` (`Title (1)`, `(2)`, … dedupe), `stripNumberSuffix`.
- `text.ts` — `generateId`, `slugify`, `truncate`, `stripHtml`, `escapeHtml`, `formatFileSize`, `formatUpdated`, `chapterLabel`, `delay`.

## UI primitives (`src/components/ui/`)
shadcn on Base UI: accordion, badge, button (+`buttonVariants`), card, dialog, input, label, progress, select, separator, slider, switch, tabs, textarea.

## Conventions
- `"use client"` on all interactive components.
- Select handlers: `onValueChange={(v) => v && ...}` (nullable).
- No `asChild` on Button — use `buttonVariants({variant, size, className})` on `Link`/`a`.
