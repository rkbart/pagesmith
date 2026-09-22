# Architecture

PageSmith is a browser-first Next.js App Router application. All parsing, editing, AI calls, and EPUB generation run client-side; there is no backend, database, or auth.

## High-level flow

```
File drop / picker
  → useParser (src/hooks/useParser.ts)
    → parseFile (src/lib/parsers/index.ts)  [pdf|docx|markdown|html|txt|epub]
      → ParseResult { chapters, metadata, cover?, warnings }
  → Zustand store importChapters (src/lib/store/project.ts)
    → persisted to localStorage ("pagesmith-projects")

Editor (src/app/editor/page.tsx)
  → ChapterList / ChapterEditor / MetadataForm / CoverUpload / AIPanel
  → PreviewDialog (read-only render)
  → useExport → buildEpub (src/lib/epub/generate.ts) → JSZip → Blob download

Checker (src/app/check/page.tsx)
  → validateEpub (src/lib/epub/validate.ts) → ValidationResult

Settings (src/app/settings/page.tsx)
  → localStorage "pagesmith-ai-settings" → loadAIConfig (src/lib/ai/index.ts)
```

## Layers

| Layer | Location | Responsibility |
|---|---|---|
| Routes | `src/app/**` | Page shells, routing, layout |
| Components | `src/components/**` | UI (landing, editor, converter, ai, shared, ui) |
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
  tiny, read synchronously). Theme likewise.

## Routing

- `/` landing (Hero, ProcessPipeline, FormatStrip, FeatureBento, AIBand, FinalCta)
- `/convert` format hub
- `/convert/[format]` dynamic parse page (pdf, docx, markdown, html, txt, epub)
- `/editor` multi-chapter editor
- `/check` EPUB validator
- `/settings` AI provider config

## Key constraints

- shadcn/ui uses **Base UI** (`@base-ui/react`), not Radix. `Button` has no `asChild` — use `buttonVariants()` on `Link`/`a`, or Base UI `render` prop.
- `Select.onValueChange` receives `string | null` — null-check handlers.
- Heavy libs (`pdfjs-dist`, `mammoth`, `marked`, `jszip`) are dynamically imported to keep initial bundles small.
