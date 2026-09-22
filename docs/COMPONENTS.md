# Components

## Shared
- `Header` — sticky nav (Convert, Editor, Checker, Settings), mobile menu, BuyMeACoffee link (uses `buttonVariants()` on `<a>`, no `asChild`).
- `Footer` — tagline, privacy note, support link.

## Landing (`src/components/landing/`)
- `Hero` — drag-drop file intake, format routing via sessionStorage + FileReader, CTA links via `buttonVariants()`.
- `FormatCards` — 6 format cards → `/convert/[format]`.
- `FeatureShowcase` — 6 feature blurbs.
- `AISection` — 6 AI feature cards with Free/BYOK badges.

## Converter (`src/components/converter/`)
- `FileDropZone` — reusable drag-drop + file input (`accept`, `onFile`, `label`, `disabled`).
- `ChapterReview` — expandable chapter list with text preview + char count.

## Editor (`src/components/editor/`)
- `ChapterList` — drag-reorder, delete, add, active highlight.
- `ChapterEditor` — title/level inputs, formatting toolbar, contenteditable prose area.
- `MetadataForm` — controlled book metadata fields.
- `CoverUpload` — image upload/remove, base64 store.
- `ExportBar` — Metadata/AI/Preview toggles, Convert File link, Export EPUB button + error display.
- `PreviewDialog` — TOC sidebar + rendered chapter content.

## AI (`src/components/ai/`)
- `AIPanel` — Readability/Translate/Edit tools, config badge, apply/copy result.

## UI primitives (`src/components/ui/`)
shadcn on Base UI: accordion, badge, button (+`buttonVariants`), card, dialog, input, label, progress, select, separator, slider, switch, tabs, textarea.

## Conventions
- `"use client"` on all interactive components.
- Select handlers: `onValueChange={(v) => v && ...}` (nullable).
- No `asChild` on Button — use `buttonVariants({variant, size, className})` on `Link`/`a`.
