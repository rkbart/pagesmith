# Setup

## Requirements

- Node.js 20+ (Next.js 16)
- npm 10+

## Install & run

```bash
cd /home/rkbart/Projects/pagesmith
npm install
npm run dev        # http://localhost:3000
```

## Scripts

| Script | Command |
|---|---|
| Dev | `npm run dev` |
| Build | `npm run build` |
| Start (prod) | `npm start` |
| Lint | `npm run lint` |
| Typecheck | `npx tsc --noEmit` |

## Verify a clean build

```bash
npx tsc --noEmit && npm run build
```

Both should complete with zero errors.

## Deploy (Vercel free tier)

```bash
# from repo root, after git init/commit
npx vercel
# or connect the repo in the Vercel dashboard
```

No environment variables required. No `vercel.json` needed for defaults.

## First-run flow

1. Open `/` → drop file(s) or click a format chip.
2. File is parsed client-side → chapters imported into the store (multiple files merge into one book).
3. Manage everything on `/library` (cards/list toggle), edit on `/editor`, set metadata/cover, optionally run AI tools.
4. Read on `/read`, export EPUB, or validate on `/check`.
