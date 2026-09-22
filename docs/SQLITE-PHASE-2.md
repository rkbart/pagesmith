# SQLite Phase 2 — Scaffold (documented, not implemented)

Decision record for upgrading PageSmith's local persistence from IndexedDB
(JSON documents) to SQLite-on-OPFS once product features justify it. The
pattern is proven in `~/Projects/invoice-app` (`sqlocal` + Drizzle +
COOP/COEP headers on Vercel); this doc captures what porting it to
**Next.js** would take. Nothing here is implemented yet.

## When to trigger Phase 2

Build it when any of these become real features:

1. **Cross-project full-text search** — "find this phrase in every chapter
   of every book" (SQLite FTS5 does this well; IDB does not).
2. **One-file library backup/restore** — download the whole library as
   `pagesmith-library.sqlite3` and re-import on another device. Strong fit
   for the privacy pitch: *your library is one file you own*.
3. Relational reporting across projects (character tracking across books,
   series-level stats, etc.).

Until then, IndexedDB (see `src/lib/store/idb-storage.ts`) removes the
localStorage quota ceiling, and swapping storages later is an adapter
change: zustand persist's `createJSONStorage(() => …)` is the single
integration point.

## Why not now

PageSmith's data is a handful of self-contained documents (projects +
chapters). There are no cross-entity queries, so Drizzle's typed
relations and SQL earn nothing today, while the SQLite WASM adds ~1MB+
of worker/WASM boot cost and requires site-wide cross-origin isolation.

## Next.js integration (differs from invoice-app's Vite setup)

invoice-app relies on the `sqlocal/vite` plugin to serve the SQLite WASM
and worker with the right headers. Next.js has no equivalent plugin, so:

1. **Vendor the worker + WASM** into `public/sqlite/` (copy from
   `node_modules/sqlocal/dist` at build time, or commit them).
2. **Cross-origin isolation** in `next.config.ts` (SQLite's OPFS build
   requires it — see `sqlocal` README §Cross-Origin Isolation):

   ```ts
   async headers() {
     return [{
       source: "/(.*)",
       headers: [
         { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
         { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
       ],
     }];
   }
   ```

   ⚠️ `COEP: require-corp` is site-wide: every future external resource
   (analytics, CDN assets, embeds) must be CORP-compliant or it breaks.
3. **Client-only init** — instantiate `SQLocalDrizzle` in a client module;
   await migrations before rendering data-dependent UI (gate the editor on
   a `dbReady` flag, the same pattern as the existing `hasHydrated` gate).
4. **Verify the worker boots under Turbopack dev** before building
   features — this is the riskiest unknown.

## Schema sketch (Drizzle)

```ts
projects:  id (pk text), name, title, author, language, description,
           isbn, publisher, subject, cover_mime, cover_blob (blob),
           created_at, updated_at
chapters:  id (pk text), project_id (fk → projects.id, cascade),
           title, level (int 1–6), "order" (int), content (text)
indexes:   chapters(project_id, "order")
_migrations: id (pk text), applied_at (int)  — same runner as
             invoice-app/src/db/migrate.ts
```

## FTS5 search across all books

```sql
CREATE VIRTUAL TABLE chapters_fts USING fts5(
  title, content, content='chapters', content_rowid=rowid
);
-- keep in sync with AFTER INSERT/UPDATE/DELETE triggers on chapters

SELECT p.name, c.title,
       snippet(chapters_fts, 1, '<mark>', '</mark>', '…', 12)
FROM chapters_fts f
JOIN chapters c ON c.rowid = f.rowid
JOIN projects p ON p.id = c.project_id
WHERE chapters_fts MATCH :query;
```

## Backup / restore

- **Export:** read the OPFS file handle
  (`navigator.storage.getDirectory()`), get a `Blob`, trigger a download
  (crib `invoice-app/src/db/export.ts`).
- **Import:** close the client, write the uploaded bytes into OPFS,
  reopen (crib `invoice-app/src/db/import.ts`).

## Migration from IndexedDB (one-time)

Read the IDB `kv` record (`pagesmith-projects`), map the JSON payload into
rows inside a transaction, then delete the IDB record. Keep the IDB
adapter around for one release as a rollback path.

## Risks / costs

- ~1MB+ WASM + worker boot (cached after first load) — lazy-load the
  sqlite module behind a chunk
- `COEP: require-corp` applies site-wide — audit any new external resource
- Turbopack/Next worker + WASM compatibility must be verified early
