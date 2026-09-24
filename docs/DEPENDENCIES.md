# Dependencies

What each `package.json` entry is actually used for (verified against the code, not the manifest).

## Runtime

| Package | Used for |
|---|---|
| `next` 16.3.5 · `react`/`react-dom` 19.2.8 | Framework (App Router, Turbopack dev). |
| `zustand` ^5.0.15 | Single project store (`src/lib/store/project.ts`). |
| `idb` ^8.0.3 | IndexedDB adapter under the store (`src/lib/store/idb-storage.ts`). |
| `pdfjs-dist` ^6.3.289 | PDF import (`src/lib/parsers/pdf.ts`, dynamic import; worker served from `public/`, see `sync:pdf-worker`). |
| `mammoth` ^1.12.3 | DOCX import (`src/lib/parsers/docx.ts`, dynamic import). |
| `marked` ^18.0.14 | Markdown import (`src/lib/parsers/markdown.ts`, dynamic import). |
| `jszip` ^3.10.2 | EPUB build (`src/lib/epub/generate.ts`) and EPUB import (`src/lib/parsers/epub.ts`); also `scripts/seed-demo-epub.mjs`. |
| `@base-ui/react` ^1.8.0 | Headless primitives behind shadcn/ui (`src/components/ui/*`). No `asChild` — see TECH-DECISIONS. |
| `class-variance-authority` ^0.7.1 · `cn` ^0.4.0 | Component variants (`buttonVariants`) and class merging in `src/components/ui/*`. |
| `lucide-react` ^1.47.0 | All icons. |
| `tailwindcss` ^4 · `@tailwindcss/postcss` ^4 · `tw-animate-css` ^1.4.0 | Styling (`src/app/globals.css`). |
| `@theme-toggles/react` ^5.0.5 | Classic theme toggle (`src/components/shared/ThemeToggle.tsx`; CSS in root layout). |

## Removed as unused

`epubjs` · `framer-motion` · `@huggingface/transformers` · `react-hook-form` · `@hookform/resolvers` · `zod` · `shadcn` (CLI) had zero imports anywhere and were uninstalled. Re-add if a feature needs them.

## Dev

`typescript`, `eslint` + `eslint-config-next`, `tailwindcss`/`@tailwindcss/postcss`, `@types/node|react|react-dom`.
