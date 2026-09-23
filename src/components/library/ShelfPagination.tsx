"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Compact page control for the shelf: first/prev/numbered/next/last.
 * On phones the numbered buttons collapse to a "Page X of Y" label so the
 * control never overflows a 390px viewport.
 */
export function ShelfPagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const numbers = pageNumbers(page, totalPages);

  return (
    <nav
      aria-label="Shelf pages"
      className="mt-8 flex items-center justify-center gap-1"
    >
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="First page"
        disabled={page === 1}
        onClick={() => onChange(1)}
      >
        <ChevronsLeft />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Previous page"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft />
      </Button>

      <span className="code px-1 text-muted-foreground sm:hidden" aria-live="polite">
        {page} / {totalPages}
      </span>
      <div className="hidden items-center gap-1 sm:flex" aria-live="polite">
        {numbers.map((n) =>
          n === "…" ? (
            <span key={`gap-${page}-${totalPages}`} className="code px-1 text-muted-foreground" aria-hidden="true">
              …
            </span>
          ) : (
            <Button
              key={n}
              size="icon-sm"
              variant={n === page ? "secondary" : "ghost"}
              aria-label={`Page ${n}`}
              aria-current={n === page ? "page" : undefined}
              onClick={() => onChange(n)}
            >
              {n}
            </Button>
          )
        )}
      </div>

      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Next page"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Last page"
        disabled={page === totalPages}
        onClick={() => onChange(totalPages)}
      >
        <ChevronsRight />
      </Button>
    </nav>
  );
}

/**
 * Windowed page numbers with edge ellipsis, e.g. [1 … 4 5 6 … 12].
 * Always shows the first and last page plus one neighbour each side of
 * the current page.
 */
export function pageNumbers(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const window = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const pages = [...window]
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);

  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of pages) {
    if (prev && n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}
