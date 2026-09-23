"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  BookUp,
  ChevronDown,
  ChevronRight,
  Feather,
  Folder,
  FolderOpen,
  FolderPlus,
  LayoutGrid,
  List,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { ProjectCard } from "@/components/library/ProjectCard";
import { ProjectRow } from "@/components/library/ProjectRow";
import { ShelfPagination } from "@/components/library/ShelfPagination";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjectHydrated } from "@/hooks/useHydrated";
import { detectFormat, parseFile } from "@/lib/parsers";
import { useProjectStore } from "@/lib/store/project";
import {
  loadCollapsedFolders,
  loadLibraryView,
  saveCollapsedFolders,
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
  const {
    projects,
    collections,
    loadProject,
    deleteProject,
    createProject,
    createCollection,
    renameCollection,
    deleteCollection,
    assignProject,
  } = useProjectStore();

  // Reading localStorage in an initializer is safe here: everything below the
  // hydration gate renders on the client only, so server HTML can't disagree.
  const [view, setView] = useState<LibraryView>(() => loadLibraryView());
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  // Ids of collapsed folders — everything else renders expanded.
  const [collapsedIds, setCollapsedIds] = useState<string[]>(() => loadCollapsedFolders());
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  // Two-step delete confirm for collections (no dialog needed).
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    saveCollapsedFolders(collapsedIds);
  }, [collapsedIds]);

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
  const collectionNameById = useMemo(
    () => new Map(collections.map((c) => [c.id, c.name])),
    [collections]
  );
  // Searching spans the whole shelf (folders included); browsing shows
  // folders with their members plus the paginated unsorted shelf.
  const filtered = useMemo(
    () =>
      shelf.filter((p) =>
        matchesQuery(p, query, collectionNameById.get(p.collectionId ?? "") ?? "")
      ),
    [shelf, query, collectionNameById]
  );
  const unsorted = useMemo(
    () =>
      shelf.filter(
        (p) => !p.collectionId || !collectionNameById.has(p.collectionId)
      ),
    [shelf, collectionNameById]
  );
  const perPage = PER_PAGE[view];
  // Search results paginate across the whole shelf; while browsing, folders
  // list all their members and only the unsorted shelf paginates.
  const {
    items: searchVisible,
    safePage: searchSafePage,
    totalPages: searchTotalPages,
  } = useMemo(
    () => paginate(filtered, page, perPage),
    [filtered, page, perPage]
  );
  const {
    items: unsortedVisible,
    safePage: unsortedSafePage,
    totalPages: unsortedTotalPages,
  } = useMemo(
    () => paginate(unsorted, page, perPage),
    [unsorted, page, perPage]
  );
  const searching = query.trim().length > 0;
  const safePage = searching ? searchSafePage : unsortedSafePage;
  const currentPage = page !== safePage ? safePage : page;

  const handleQuery = (next: string) => {
    setQuery(next);
    setPage(1);
  };

  const handleView = (next: LibraryView) => {
    setView(next);
    setPage(1);
  };

  const toggleFolder = (id: string) => {
    setCollapsedIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleCreateCollection = () => {
    const name = newCollectionName.trim();
    if (!name) return;
    const id = createCollection(name);
    setNewCollectionName("");
    setShowNewCollection(false);
    // A new folder opens expanded so the books filed into it are visible.
    setCollapsedIds((prev) => prev.filter((c) => c !== id));
  };

  const handleDeleteCollection = (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      // Disarm the two-step confirm if the user walks away.
      setTimeout(() => {
        setConfirmDeleteId((armed) => (armed === id ? null : armed));
      }, 3000);
      return;
    }
    setConfirmDeleteId(null);
    setEditingId((editing) => (editing === id ? null : editing));
    deleteCollection(id);
    setCollapsedIds((prev) => prev.filter((c) => c !== id));
  };

  // Inline folder rename (pencil in the folder header).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const renameCancelled = useRef(false);

  const startRename = (id: string, current: string) => {
    renameCancelled.current = false;
    setConfirmDeleteId(null);
    setEditingId(id);
    setEditName(current);
  };

  const commitRename = () => {
    if (editingId) renameCollection(editingId, editName);
    setEditingId(null);
  };

  const cancelRename = () => {
    renameCancelled.current = true;
    setEditingId(null);
  };

  // Per-collection book counts for the folder headers.
  const collectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let unsorted = 0;
    for (const p of shelf) {
      if (p.collectionId && collectionNameById.has(p.collectionId)) {
        counts.set(p.collectionId, (counts.get(p.collectionId) ?? 0) + 1);
      } else {
        unsorted += 1;
      }
    }
    return { counts, unsorted };
  }, [shelf, collectionNameById]);

  // One renderer for every book list on this page — search results, folder
  // members, and the unsorted shelf all share cards/rows + assignment.
  const bookList = (books: typeof shelf) =>
    view === "cards" ? (
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4"
        aria-live="polite"
      >
        {books.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            collections={collections}
            onAssign={(collectionId) => assignProject(project.id, collectionId)}
            onOpen={openBook}
            onRead={readBook}
            onDelete={deleteBook}
          />
        ))}
      </div>
    ) : (
      <div className="flex flex-col gap-2" aria-live="polite">
        {books.map((project) => (
          <ProjectRow
            key={project.id}
            project={project}
            collections={collections}
            onAssign={(collectionId) => assignProject(project.id, collectionId)}
            onOpen={openBook}
            onRead={readBook}
            onDelete={deleteBook}
          />
        ))}
      </div>
    );

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

  // ---- Import an .epub directly onto the shelf -----------------------------
  const epubInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleEpubFile = async (file: File) => {
    if (importing) return;
    setImporting(true);
    setImportError(null);
    try {
      if (detectFormat(file.name) !== "epub") {
        throw new Error("Only .epub files can be imported here — other formats go through Import.");
      }
      const result = await parseFile(file, "epub");
      if (result.chapters.length === 0) {
        throw new Error("That EPUB has no readable chapters.");
      }

      // Drop empty strings so the parser's blanks don't clobber the name we
      // just derived from the file (importChapters merges metadata on top).
      const metadata = Object.fromEntries(
        Object.entries(result.metadata).filter(([, value]) => value !== "" && value != null)
      );

      const fallback = file.name.replace(/\.epub$/i, "").trim();
      const name = (result.metadata.title || fallback || "Imported Book").trim();

      // createProject makes a draft; importChapters then shelves it — an
      // import is never an empty book, so it always lands on the shelf.
      createProject(name);
      useProjectStore
        .getState()
        .importChapters(result.chapters, metadata, result.cover);
      router.push("/read");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Could not import that EPUB.");
    } finally {
      setImporting(false);
    }
  };

  const epubPicker = (
    <input
      ref={epubInputRef}
      type="file"
      accept=".epub,application/epub+zip"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void handleEpubFile(file);
        e.target.value = "";
      }}
    />
  );

  const importEpubButton = (
    <Button
      variant="outline"
      size="sm"
      className="shrink-0"
      disabled={importing}
      onClick={() => epubInputRef.current?.click()}
      title="Import an EPUB book"
    >
      {importing ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <BookUp aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{importing ? "Importing…" : "Import EPUB"}</span>
    </Button>
  );

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
          <Button
            variant="outline"
            size="lg"
            title="Import an EPUB book"
            onClick={() => epubInputRef.current?.click()}
          >
            <BookUp />
            Import EPUB
          </Button>
        </div>
        {epubPicker}
        {importError && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {importError}
          </p>
        )}
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
          <h1 className="heading-lg">Library</h1>
          <p className="body-md-loose mt-2 text-muted-foreground">
            {shelf.length} book{shelf.length === 1 ? "" : "s"} · {totalChapters}{" "}
            chapter{totalChapters === 1 ? "" : "s"} · Stored locally
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {importEpubButton}
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
        </div>
      </div>

      {epubPicker}
      {importError && (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-destructive" role="alert">
          {importError}
        </p>
      )}

      {/* ---- Collections ------------------------------------------------- */}
      <div className="mb-6 flex flex-wrap items-center gap-2" aria-label="Collections">
        <span className="eyebrow mr-1">Collections</span>
        {showNewCollection ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed p-1 pl-2">
            <Input
              autoFocus
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateCollection();
                if (e.key === "Escape") {
                  setShowNewCollection(false);
                  setNewCollectionName("");
                }
              }}
              placeholder="Collection name"
              aria-label="New collection name"
              className="h-8 w-40"
            />
            <Button
              size="sm"
              className="h-8"
              onClick={handleCreateCollection}
              disabled={!newCollectionName.trim()}
            >
              <Plus /> Add
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Cancel new collection"
              onClick={() => {
                setShowNewCollection(false);
                setNewCollectionName("");
              }}
            >
              <X />
            </Button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setShowNewCollection(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:text-foreground"
          >
            <FolderPlus className="size-3.5" aria-hidden="true" />
            New collection
          </button>
        )}
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
          className="bg-card pr-9 pl-9 shadow-panel [&::-webkit-search-cancel-button]:hidden"
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

      {searching ? (
        filtered.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center shadow-panel">
            <p className="font-heading text-lg">Nothing on this shelf matches</p>
            <p className="body-md-loose mt-2 text-muted-foreground">
              No titles, authors, collections, or chapter text contain “{query.trim()}”.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => handleQuery("")}>
              <X />
              Clear the search
            </Button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
              {filtered.length} match{filtered.length === 1 ? "" : "es"} for
              “{query.trim()}”
              {searchTotalPages > 1 ? ` · page ${currentPage} of ${searchTotalPages}` : ""}
            </p>
            {bookList(searchVisible)}
            <ShelfPagination
              page={currentPage}
              totalPages={searchTotalPages}
              onChange={setPage}
            />
          </>
        )
      ) : (
        <>
          {collections.map((c) => {
            const members = shelf.filter((p) => p.collectionId === c.id);
            const collapsed = collapsedIds.includes(c.id);
            return (
              <section
                key={c.id}
                className="mb-6 overflow-hidden rounded-2xl border bg-card shadow-panel"
                aria-label={`Collection ${c.name}`}
              >
                <div
                  className={`group flex items-center gap-1 px-2 py-1.5 ${
                    collapsed ? "" : "border-b bg-muted/50"
                  }`}
                >
                  {editingId === c.id ? (
                    <span className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5">
                      <FolderOpen className="size-4 shrink-0 text-brass" aria-hidden="true" />
                      <Input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") cancelRename();
                        }}
                        onBlur={() => {
                          if (!renameCancelled.current) commitRename();
                          renameCancelled.current = false;
                        }}
                        aria-label={`Rename collection ${c.name}`}
                        className="h-8"
                      />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleFolder(c.id)}
                      aria-expanded={!collapsed}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
                    >
                      {collapsed ? (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      )}
                      {collapsed ? (
                        <Folder className="size-4 shrink-0 text-brass" aria-hidden="true" />
                      ) : (
                        <FolderOpen className="size-4 shrink-0 text-brass" aria-hidden="true" />
                      )}
                      <span className="font-heading min-w-0 flex-1 truncate text-base">
                        {c.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {members.length} book{members.length === 1 ? "" : "s"}
                      </span>
                    </button>
                  )}
                  {editingId === c.id ? null : (
                    <>
                      <button
                        type="button"
                        onClick={() => startRename(c.id, c.name)}
                        aria-label={`Rename collection ${c.name}`}
                        title="Rename collection"
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-all hover:text-foreground md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCollection(c.id)}
                        aria-label={
                          confirmDeleteId === c.id
                            ? `Confirm delete collection ${c.name} (books are kept)`
                            : `Delete collection ${c.name} (books are kept)`
                        }
                        title="Delete collection — its books are kept"
                        className={`mr-1 shrink-0 rounded-md p-1.5 text-xs transition-all ${
                          confirmDeleteId === c.id
                            ? "bg-destructive font-medium text-destructive-foreground"
                            : "text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                        }`}
                      >
                        {confirmDeleteId === c.id ? (
                          "Sure?"
                        ) : (
                          <Trash2 className="size-4" aria-hidden="true" />
                        )}
                      </button>
                    </>
                  )}
                </div>
                {collapsed ? null : (
                  <div className="bg-muted/30 p-3 sm:p-4">
                    {members.length === 0 ? (
                      <p className="rounded-xl border border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                        Empty folder — file books here with the collection
                        picker on any book.
                      </p>
                    ) : (
                      bookList(members)
                    )}
                  </div>
                )}
              </section>
            );
          })}

          {collections.length > 0 && (
            <p className="eyebrow mb-3">
              Unsorted · {collectionCounts.unsorted} book
              {collectionCounts.unsorted === 1 ? "" : "s"}
            </p>
          )}
          {bookList(unsortedVisible)}
          <ShelfPagination
            page={currentPage}
            totalPages={unsortedTotalPages}
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
