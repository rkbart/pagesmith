# Architecture

PageSmith is a browser-first Next.js App Router application. All parsing, editing, AI calls, and EPUB generation run client-side; there is no backend, database, or auth.

## High-level flow

```
File drop / picker
  → useParser (src/hooks/useParser.ts)
    → parseFile (src/lib/parsers/index.ts)  [pdf|docx|markdown|html|txt|epub]
      → ParseResult { chapters, metadata, cover?, warnings }
  → Zustand store importChapters (src/lib/store/project.ts)
    → persisted to IndexedDB ("pagesmith-db" / store "kv")

Library (src/app/library/page.tsx)
  → shelf of every project, newest first
  → `LayoutGrid`/`List` view toggle (persisted via src/lib/utils/library-prefs.ts)
  → search (titles, authors, chapter text) + pagination (12/page cards,
     10/page list) via src/lib/utils/library-search.ts + ShelfPagination
  → `ProjectCard` / `ProjectRow`, both with `CoverArt` (real cover or
     monogram placeholder — the title prints exactly once, as the heading)
  → loadProject(id) → Editor or Reading Room;  deleteProject(id) via shared
     `DeleteProjectDialog`
  → clears the book's reading bookmark (src/lib/utils/reading-progress.ts)

Editor (src/app/editor/page.tsx)
  → ChapterList / ChapterEditor / MetadataForm / CoverUpload / AIPanel
  → useExport → buildEpub (src/lib/epub/generate.ts) → JSZip → Blob download

Reading Room (src/app/read/page.tsx → src/components/reader/ReaderRoom.tsx)
  → chapter HTML + active TOC, prev/next, progress
  → bookmarks { chapterId, scrollRatio } per project in localStorage

Checker (src/app/check/page.tsx)
  → validateEpub (src/lib/epub/validate.ts) → ValidationResult

Settings (src/app/settings/page.tsx)
  → localStorage "pagesmith-ai-settings" → loadAIConfig (src/lib/ai/index.ts)
```

## Layers

| Layer | Location | Responsibility |
|---|---|---|
| Routes | `src/app/**` | Page shells, routing, layout |
| Components | `src/components/**` | UI (landing, library, editor, converter, reader, ai, shared, ui) |
| Hooks | `src/hooks/**` | `useParser`, `useExport` orchestration |
| Domain lib | `src/lib/**` | parsers, epub generate/validate, ai, store, utils |
| Types | `src/types/**` | `project.ts`, `epub.ts`, `ai.ts`, `mammoth.d.ts` |

## State

- Single Zustand store (`useProjectStore`) with `persist` middleware → IndexedDB
  (`pagesmith-db` via `src/lib/store/idb-storage.ts`; first run adopts legacy
  `localStorage["pagesmith-projects"]`). The editor gates on
  `persist.hasHydrated()` because IDB hydrates asynchronously.
- `partialize` persists `projects`, `project`, `activeChapterId` only.
- AI settings stored separately under `pagesmith-ai-settings` (localStorage —
  tiny, read synchronously). Theme likewise. Reading bookmarks and reader
  typography live in localStorage too (`pagesmith-reading-progress`,
  `pagesmith-reader-prefs`), as does the library's cards/list layout choice
  (`pagesmith-library-view`).
- Async hydration is gated in the UI via `useProjectHydrated()`
  (`src/hooks/useHydrated.ts`) — `/editor`, `/library`, `/read` render a
  loading state until `persist.hasHydrated()` is true.

## Routing

- `/` landing (Hero, ProcessPipeline, FormatStrip, FeatureBento, AIBand, FinalCta)
- `/convert` import desk (single or multi-file → merged book)
- `/convert/[format]` dynamic parse page (pdf, docx, markdown, html, txt, epub)
- `/library` shelf of every book (cards/list toggle, search, pagination, open, read, delete)
- `/editor` multi-chapter editor
- `/read` reading room for the active (or most recent) book
- `/check` EPUB validator
- `/settings` AI provider config

## Key constraints

- shadcn/ui uses **Base UI** (`@base-ui/react`), not Radix. `Button` has no `asChild` — use `buttonVariants()` on `Link`/`a`, or Base UI `render` prop.
- `Select.onValueChange` receives `string | null` — null-check handlers.
- Heavy libs (`pdfjs-dist`, `mammoth`, `marked`, `jszip`) are dynamically imported to keep initial bundles small.
