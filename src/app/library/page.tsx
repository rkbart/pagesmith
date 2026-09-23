"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Feather,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { ProjectCard } from "@/components/library/ProjectCard";
import { ProjectRow } from "@/components/library/ProjectRow";
import { ShelfPagination } from "@/components/library/ShelfPagination";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjectHydrated } from "@/hooks/useHydrated";
import { useProjectStore } from "@/lib/store/project";
import {
  loadLibraryView,
  saveLibraryView,
  type LibraryView,
} from "@/lib/utils/library-prefs";
import { matchesQuery, paginate } from "@/lib/utils/library-search";
import { clearPosition } from "@/lib/utils/reading-progress";

/** Page sizes per layout — list rows are short, cards are tall. */
const PER_PAGE: Record<LibraryView, number> = { cards: 12, list: 10 };

export default function LibraryPage() {
  const router = useRouter();
  const hydrated = useProjectHydrated();
  const { projects, loadProject, deleteProject, createProject } = useProjectStore();

  // Reading localStorage in an initializer is safe here: everything below the
  // hydration gate renders on the client only, so server HTML can't disagree.
  const [view, setView] = useState<LibraryView>(() => loadLibraryView());
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    saveLibraryView(view);
  }, [view]);

  // Most recently touched book first — the shelf mirrors how people work.
  const shelf = useMemo(
    () => [...projects].sort((a, b) => b.updatedAt - a.updatedAt),
    [projects]
  );
  const totalChapters = useMemo(
    () => projects.reduce((sum, p) => sum + p.chapters.length, 0),
    [projects]
  );

  // Search-then-paginate: a new query or layout restarts on page one (handled
  // in the event handlers below, not an effect — resetting state inside
  // effects causes cascading renders). Deletions or tightened searches can
  // strand the page past the end, so `paginate` clamps and we render the
  // clamped value directly.
  const filtered = useMemo(
    () => shelf.filter((p) => matchesQuery(p, query)),
    [shelf, query]
  );
  const perPage = PER_PAGE[view];
  const { items: visible, safePage, totalPages } = useMemo(
    () => paginate(filtered, page, perPage),
    [filtered, page, perPage]
  );
  const currentPage = page !== safePage ? safePage : page;

  const searching = query.trim().length > 0;

  const handleQuery = (next: string) => {
    setQuery(next);
    setPage(1);
  };

  const handleView = (next: LibraryView) => {
    setView(next);
    setPage(1);
  };

  const openBook = (id: string) => {
    loadProject(id);
    router.push("/editor");
  };

  const readBook = (id: string) => {
    loadProject(id);
    router.push("/read");
  };

  const deleteBook = (id: string) => {
    clearPosition(id);
    deleteProject(id);
  };

  const startBlank = () => {
    createProject("Untitled Book");
    router.push("/editor");
  };

  if (!hydrated) {
    return (
      <div className="container flex items-center justify-center gap-2 py-32 text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-brass" aria-hidden="true" />
        Fetching your shelf…
      </div>
    );
  }

  if (shelf.length === 0) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-brass/10 shadow-panel">
          <Feather className="size-7 text-brass" aria-hidden="true" />
        </div>
        <h1 className="heading-lg mb-3">The shelf is empty</h1>
        <p className="body-md-loose mx-auto mb-8 max-w-md text-muted-foreground">
          Bind your first book — bring in a manuscript and PageSmith will set it
          in type.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/convert" className={buttonVariants({ variant: "brass", size: "lg" })}>
            <Upload />
            Import a manuscript
          </Link>
          <Button variant="outline" size="lg" onClick={startBlank}>
            <Plus />
            Start a blank book
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`container mx-auto px-4 py-12 sm:px-6 lg:px-8 lg:py-16 ${
        view === "list" ? "max-w-4xl" : "max-w-6xl"
      }`}
    >
      <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">The shelf</p>
          <h1 className="heading-lg">Your library</h1>
          <p className="body-md-loose mt-2 text-muted-foreground">
            {shelf.length} book{shelf.length === 1 ? "" : "s"} · {totalChapters}{" "}
            chapter{totalChapters === 1 ? "" : "s"} — all kept on this device.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div
            role="group"
            aria-label="Shelf layout"
            className="flex items-center gap-0.5 rounded-lg border bg-card p-0.5"
          >
            <Button
              size="icon-sm"
              variant={view === "cards" ? "secondary" : "ghost"}
              aria-pressed={view === "cards"}
              aria-label="Card view"
              title="Card view"
              onClick={() => handleView("cards")}
            >
              <LayoutGrid />
            </Button>
            <Button
              size="icon-sm"
              variant={view === "list" ? "secondary" : "ghost"}
              aria-pressed={view === "list"}
              aria-label="List view"
              title="List view"
              onClick={() => handleView("list")}
            >
              <List />
            </Button>
          </div>

          <Button variant="brass" onClick={startBlank}>
            <Plus />
            New book
          </Button>
        </div>
      </div>

      <div className="relative mb-8 max-w-md">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          placeholder="Search titles, authors, chapters…"
          aria-label="Search your library"
          className="bg-card pr-9 pl-9 shadow-panel"
        />
        {searching && (
          <button
            type="button"
            onClick={() => handleQuery("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center shadow-panel">
          <p className="font-heading text-lg">Nothing on this shelf matches</p>
          <p className="body-md-loose mt-2 text-muted-foreground">
            No titles, authors, or chapter text contain “{query.trim()}”.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => handleQuery("")}>
            <X />
            Clear the search
          </Button>
        </div>
      ) : (
        <>
          {searching && (
            <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
              {filtered.length} match{filtered.length === 1 ? "" : "es"} for
              “{query.trim()}”
              {totalPages > 1 ? ` · page ${currentPage} of ${totalPages}` : ""}
            </p>
          )}

          {view === "cards" ? (
            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4"
              aria-live="polite"
            >
              {visible.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={openBook}
                  onRead={readBook}
                  onDelete={deleteBook}
                />
              ))}

              {!searching && currentPage === totalPages && (
                <button
                  type="button"
                  onClick={startBlank}
                  className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-brass/30 bg-paper p-6 text-center text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-brass/60 hover:bg-brass/5"
                >
                  <span className="grid size-12 place-items-center rounded-xl bg-brass/10">
                    <Plus className="size-5 text-brass" aria-hidden="true" />
                  </span>
                  <span className="font-heading text-base text-foreground">
                    Start a new book
                  </span>
                  <span className="text-xs">Blank pages, ready to fill</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2" aria-live="polite">
              {visible.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  onOpen={openBook}
                  onRead={readBook}
                  onDelete={deleteBook}
                />
              ))}

              {!searching && currentPage === totalPages && (
                <button
                  type="button"
                  onClick={startBlank}
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-brass/30 bg-paper p-4 text-sm text-muted-foreground transition-colors hover:border-brass/60 hover:bg-brass/5 hover:text-foreground"
                >
                  <Plus className="size-4 text-brass" aria-hidden="true" />
                  Start a new book
                </button>
              )}
            </div>
          )}

          <ShelfPagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
          />
        </>
      )}

      <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <BookOpen className="size-3.5 shrink-0 text-brass" aria-hidden="true" />
        Read opens the reading room — it remembers the page you stopped on.
      </p>
    </div>
  );
}
