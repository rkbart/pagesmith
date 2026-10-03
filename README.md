# PageSmith — Forge your books in the browser

Convert, edit, and publish valid EPUB 3 ebooks without leaving your device. 6-format import with smart chapter detection, multi-chapter rich-text editor, library + reading room, structural Proof Desk validator, and hybrid AI (offline readability + BYOK translation/edit/summarize). Next.js 16 / React 19 / Zustand / IndexedDB. No backend, no tracking, no paywall.

`nextjs` `react` `typescript` `epub` `ebooks` `pdf` `privacy` `local-first` `ai` `byok` `jszip` `tailwindcss` `shadcn-ui`

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Verify:

```bash
npx tsc --noEmit && npm run build
```

## What it does

- **Convert** — 6 formats → EPUB with automatic chapter detection
- **Edit** — multi-chapter editor with rich-text toolbar, drag-reorder, metadata, cover
- **AI** — readability (offline), translate/edit/summarize (BYOK OpenAI/Anthropic)
- **Preview** — read your book with TOC before export
- **Export** — valid EPUB 3 (JSZip)
- **Check** — structural EPUB validator

## Docs

| Doc | |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | system design, layers, state, routing |
| [Setup](docs/SETUP.md) | install, scripts, deploy |
| [Tutorial](docs/TUTORIAL.md) | end-to-end walkthrough |
| [Features](docs/FEATURES.md) | full feature list |
| [AI Features](docs/AI-FEATURES.md) | hybrid AI model, config, API layer |
| [Tech Decisions](docs/TECH-DECISIONS.md) | why this stack |
| [Components](docs/COMPONENTS.md) | component inventory & conventions |
| [Parsers](docs/PARSERS.md) | per-format parsing strategy |
| [EPUB Generation](docs/EPUB-GENERATION.md) | build & validation internals |

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui (Base UI) · Zustand · pdfjs-dist · mammoth · marked · JSZip · Vercel-ready

## Support

If PageSmith helps you publish: [Buy Me a Coffee](https://www.buymeacoffee.com/rkbart)

## Privacy

Files never leave your device. API keys (optional) are stored in your browser's localStorage only.

