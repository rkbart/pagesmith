# Tech Decisions

## Why Next.js 16 + App Router
Industry standard, free Vercel hosting, RSC where useful, Turbopack fast builds. App chosen over Pages for layouts/metadata API.

## Why no backend / DB / auth
Privacy pitch ("files never leave your device") + zero ops cost. Zustand persist → localStorage is enough for a single-user tool.

## Why Zustand (not Redux/Context)
Tiny API, first-class `persist` middleware, no boilerplate. One store is sufficient.

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
- localStorage ~5MB limit → large books with covers may need IndexedDB (`idb` already a dep)
- Browser-mode AI translation is a stub until Transformers.js is wired
- `document.execCommand` in the editor is deprecated but still the simplest contenteditable path
- 2 npm audit vulnerabilities (1 moderate, 1 high) unresolved
