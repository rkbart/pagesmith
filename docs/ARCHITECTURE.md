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

- Single Zustand store (`useProjectStore`) with **manual debounced persistence**
  → IndexedDB (`pagesmith-db` via `src/lib/store/idb-storage.ts`; first run
  adopts legacy `localStorage["pagesmith-projects"]`). Saves are debounced
  (1s trailing edge) and flushed on page hide: the previous `persist`
  middleware serialized the whole shelf on every keystroke and chapter turn,
  blocking the main thread for hundreds of ms (see `docs/TECH-DECISIONS.md`).
  Saves are skipped until hydration completes, so the shelf can never be
  overwritten with empty state.
- Only `projects` + `activeChapterId` are persisted. The open `project` draft
  is deliberately excluded (it may be unshelved, and persisting it would
  resurrect ghost books on reload).
- AI settings stored separately under `pagesmith-ai-settings` (localStorage —
  tiny, read synchronously). Theme likewise. Reading bookmarks and reader
  typography live in localStorage too (`pagesmith-reading-progress`,
  `pagesmith-reader-prefs`), as does the library's cards/list layout choice
  (`pagesmith-library-view`).
- Async hydration is gated in the UI via `useProjectHydrated()`
  (`src/hooks/useHydrated.ts`, reads the store's `hydrated` flag) — `/editor`
  and `/library` render a loading state until the shelf is restored.

## Routing

- `/` landing (Hero, ProcessPipeline, FormatStrip, FeatureBento, AIBand, FinalCta)
- `/convert` import desk (single or multi-file → merged book)
- `/convert/[format]` dynamic parse page (pdf, docx, markdown, html, txt, epub)
- `/library` shelf of every book (cards/list toggle, search, pagination, open, read, delete); `/library?collection=<id>` drills into one collection (unknown ids fall back to the overview)
- `/editor` multi-chapter editor
- `/read` reading room for the active (or most recent) book
- `/check` EPUB validator
- `/settings` AI provider config

## Key constraints

- shadcn/ui uses **Base UI** (`@base-ui/react`), not Radix. `Button` has no `asChild` — use `buttonVariants()` on `Link`/`a`, or Base UI `render` prop.
- `Select.onValueChange` receives `string | null` — null-check handlers.
- Heavy libs (`pdfjs-dist`, `mammoth`, `marked`, `jszip`) are dynamically imported to keep initial bundles small.

## Performance

- EPUB import (`src/lib/parsers/epub.ts`): one image cache per import, so
  covers/logos/ornaments reused across spine files are decoded and
  base64-encoded once; every imported `<img>` is stamped `loading="lazy"` +
  `decoding="async"`; chapters split at `h1`/`h2` boundaries.
- The reader renders one chapter at a time and the sticky reading bar uses a
  solid background — no `backdrop-blur`, which forced full-page repaints on
  every scroll frame.
- Opt-in instrumentation (`src/lib/utils/perf.ts`): set
  `localStorage["pagesmith-perf"] = "1"` to log `[pagesmith-perf]` timings —
  import phases, per-chapter HTML/image sizes, IDB read/write + `JSON.parse`
  estimates. Zero overhead when disabled.
- Lazy images and the deduped cache apply to newly imported books only —
  re-import older books to pick them up.
