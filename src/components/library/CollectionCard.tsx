"use client";

import { FolderOpen } from "lucide-react";
import { CoverArt } from "./CoverArt";
import { formatUpdated } from "@/lib/utils/text";
import type { Collection, Project } from "@/types/project";

/**
 * A folder on the collections overview grid: mosaic of member covers,
 * name, book count, and freshness. Clicking drills into the collection.
 */
export function CollectionCard({
  collection,
  books,
  onOpen,
}: {
  collection: Collection;
  /** Members, newest first — the first four feed the mosaic. */
  books: Project[];
  onOpen: (id: string) => void;
}) {
  const mosaic = books.slice(0, 4);
  const latest = books.reduce<number | null>(
    (max, b) => (max === null || b.updatedAt > max ? b.updatedAt : max),
    null
  );

  return (
    <button
      type="button"
      onClick={() => onOpen(collection.id)}
      aria-label={`Open collection ${collection.name}, ${books.length} books`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card text-left shadow-panel transition-all outline-none hover:-translate-y-0.5 hover:border-brass/40 hover:shadow-lift focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex h-28 items-stretch justify-center gap-1 overflow-hidden bg-muted/40 p-3">
        {mosaic.length === 0 ? (
          <span className="grid flex-1 place-items-center">
            <FolderOpen className="size-8 text-muted-foreground" aria-hidden="true" />
          </span>
        ) : (
          mosaic.map((b) => (
            <span
              key={b.id}
              className="w-14 shrink-0 overflow-hidden rounded border bg-secondary"
              title={b.metadata.title || b.name}
            >
              <CoverArt project={b} variant="list" />
            </span>
          ))
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 p-3 sm:p-4">
        <span className="flex items-center gap-2">
          <FolderOpen className="size-4 shrink-0 text-brass" aria-hidden="true" />
          <span className="font-heading min-w-0 flex-1 truncate text-base" title={collection.name}>
            {collection.name}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          {books.length} book{books.length === 1 ? "" : "s"}
          {latest !== null ? ` · edited ${formatUpdated(latest)}` : ""}
        </span>
      </span>
    </button>
  );
}
