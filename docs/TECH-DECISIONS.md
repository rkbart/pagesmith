# Tech Decisions

## Why Next.js 16 + App Router
Industry standard, free Vercel hosting, RSC where useful, Turbopack fast builds. App chosen over Pages for layouts/metadata API.

## Why no backend / DB / auth
Privacy pitch ("files never leave your device") + zero ops cost. Zustand + manual debounced persistence → IndexedDB (idb adapter) is enough for a single-user tool; no server DB, no accounts.

## Why Zustand (not Redux/Context)
Tiny API, no boilerplate. One store is sufficient. (Its `persist` middleware was removed — see below.)

## Why manual debounced persistence (not zustand `persist`)
`persist` serializes + writes on *every* store change. With whole books (base64 images included) in state, each editor keystroke and every reader chapter turn ran a multi-MB `JSON.stringify` on the main thread — hundreds of ms of freeze per interaction. The replacement (`saveNow`/`hydrateFromStorage` in `src/lib/store/project.ts` over the `src/lib/store/idb-storage.ts` adapter) keeps the same `{state, version}` envelope and IDB key, but saves on a 1s trailing debounce with a flush on page hide, and never saves before hydration completes. Interaction bursts collapse into a single write.

## Why shadcn/ui with Base UI (not Radix)
shadcn `base-nova` style uses `@base-ui/react`. **Important:** Base UI `Button` has no `asChild` — compose with `buttonVariants()` on `Link`/`a`, or Base UI `render` prop. This caused the TS2322 errors we fixed.

## Why Tailwind v4
Default in `create-next-app` + shadcn now; CSS-first config, no tailwind.config.js needed.

## Why client-side parsers
- `pdfjs-dist`, `mammoth`, `marked`, `jszip` all work in browser
- Dynamic `import()` keeps landing page light
- No upload = no privacy concerns, no server cost

## Why EPUB 3 (not 2)
Nav document (`properties="nav"`) is the modern standard; epubcheck-friendly; still readable by all major readers.

## Why JSZip
Pure JS, no native deps, browser support, correct mimetype STORE + DEFLATE for rest.

## Why BYOK for LLM features
No API costs for us, no key management, user controls spend/data. Matches "free & private" positioning.

## Monetization
BuyMeACoffee (https://www.buymeacoffee.com/rkbart) — no paywall, no accounts.

## Known tradeoffs
- Persistence: projects moved from localStorage (~5MB ceiling) to IndexedDB via the `idb` adapter (`src/lib/store/idb-storage.ts`), with a one-time migration that adopts legacy localStorage data. Writes are debounced with write-behind coalescing at the adapter level; zustand's `persist` middleware was replaced with manual save/hydrate for the same reason (per-keystroke full-shelf serialization froze the UI). SQLite/OPFS (sqlocal + Drizzle, as in invoice-app) is deliberately deferred — scaffold in `docs/SQLITE-PHASE-2.md`; revisit when cross-project search or library backup/export is wanted.
- Browser-mode AI translation is a stub until Transformers.js is wired
- `document.execCommand` in the editor is deprecated but still the simplest contenteditable path
- 2 npm audit vulnerabilities (1 moderate, 1 high) unresolved
