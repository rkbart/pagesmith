"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/lib/store/project";
import { useProjectHydrated } from "@/hooks/useHydrated";
import { ChapterList } from "@/components/editor/ChapterList";
import { ChapterEditor } from "@/components/editor/ChapterEditor";
import { CoverUpload } from "@/components/editor/CoverUpload";
import { ExportBar } from "@/components/editor/ExportBar";
import { BackToTop } from "@/components/shared/BackToTop";
import { AIPanel } from "@/components/ai/AIPanel";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Plus,
  Library,
  Feather,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";

export default function EditorPage() {
  const {
    project,
    projects,
    activeChapterId,
    loadProject,
    addChapter,
  } = useProjectStore();
  // Chapters live in a slide hide/reveal panel on the left (drawer on
  // mobile, collapsing sidebar on desktop).
  const [sideOpen, setSideOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches
  );

  // On mobile, picking a chapter closes the drawer. A store subscription
  // (not a render effect) so the set-state-in-effect rule stays satisfied.
  useEffect(() => {
    const unsub = useProjectStore.subscribe((state, prev) => {
      if (
        state.activeChapterId !== prev.activeChapterId &&
        typeof window !== "undefined" &&
        !window.matchMedia("(min-width: 1024px)").matches
      ) {
        setSideOpen(false);
      }
    });
    return unsub;
  }, []);

  // AI Tools live in a right slide-over so the chapter stays visible
  // while they run — no backdrop on desktop, dimmed backdrop on mobile.
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    if (!aiOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAiOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aiOpen]);

  // State lives in IndexedDB, which hydrates asynchronously after mount — gate
  // the UI on it so the empty state never flashes and the auto-load below
  // always runs against restored data.
  const hydrated = useProjectHydrated();

  useEffect(() => {
    if (!project && projects.length > 0) {
      const mostRecent = [...projects].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      loadProject(mostRecent.id);
    }
  }, [project, projects, loadProject]);

  if (!hydrated) {
    return (
      <div className="container flex items-center justify-center gap-2 py-32 text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-brass" aria-hidden="true" />
        Opening the bindery…
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-brass/10 shadow-panel">
          <Feather className="size-7 text-brass" aria-hidden="true" />
        </div>
        <h1 className="heading-lg mb-3">The bench is clear</h1>
        <p className="body-md-loose text-muted-foreground mb-8">
          Bring in a manuscript or an EPUB to start binding.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/convert" className={buttonVariants({ variant: "brass", size: "lg" })}>
            <Plus className="mr-2 h-4 w-4" /> Import a manuscript
          </Link>
          <Link href="/library" className={buttonVariants({ variant: "outline", size: "lg" })}>
            <Library className="mr-2 h-4 w-4" aria-hidden="true" /> Browse your library
          </Link>
        </div>
      </div>
    );
  }

  const activeChapter = project.chapters.find((c) => c.id === activeChapterId);

  return (
    <div className="container px-4 sm:px-6 lg:px-8 py-6">
      <ExportBar
        project={project}
        aiOpen={aiOpen}
        onToggleAI={() => setAiOpen((v) => !v)}
        chaptersOpen={sideOpen}
        onToggleChapters={() => setSideOpen((v) => !v)}
        chaptersCount={project.chapters.length}
      />

      <div className="mt-6 flex items-start gap-6">
        {/* Desktop sidebar: always visible. Chapters hide only behind the
            mobile drawer below. */}
        <aside className="hidden w-70 shrink-0 lg:block">
          <div className="space-y-3">
            <div className="flex items-center gap-1 rounded-xl border bg-card px-2 py-1.5 shadow-panel">
              <span className="eyebrow min-w-0 flex-1 truncate px-1">
                Chapters ({project.chapters.length})
              </span>
              <Button size="sm" onClick={() => addChapter()} aria-label="Add chapter">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ChapterList />
          </div>
        </aside>

        {/* Mobile drawer. */}
        <div
          className={`fixed inset-0 z-50 lg:hidden ${sideOpen ? "" : "pointer-events-none"}`}
          aria-hidden={!sideOpen}
        >
          <div
            onClick={() => setSideOpen(false)}
            className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${sideOpen ? "opacity-100" : "opacity-0"}`}
          />
          <aside
            className={`absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-background shadow-panel transition-transform duration-200 ${sideOpen ? "translate-x-0" : "-translate-x-full"}`}
            role="dialog"
            aria-label="Chapters"
          >
            <div className="flex items-center gap-1 border-b px-3 py-2.5">
              <span className="eyebrow min-w-0 flex-1 truncate px-1">
                Chapters ({project.chapters.length})
              </span>
              <Button size="sm" onClick={() => addChapter()} aria-label="Add chapter">
                <Plus className="h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={() => setSideOpen(false)}
                aria-label="Close chapters"
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <ChapterList />
            </div>
          </aside>
        </div>

        <div className="min-w-0 flex-1 lg:pr-2">
          <CoverUpload />
          <div className="mt-4">
          {activeChapter ? (
            <ChapterEditor key={activeChapter.id} chapter={activeChapter} />
          ) : (
            <div className="rounded-2xl border border-dashed border-brass/30 bg-paper p-12 text-center text-muted-foreground">
              <p className="mb-4 font-heading text-lg">No chapter on the bench</p>
              <Button variant="outline" onClick={() => addChapter()}>
                <Plus className="mr-2 h-4 w-4" /> Add first chapter
              </Button>
            </div>
          )}
          </div>
        </div>

        {/* Desktop AI dock: squeezes the editor left with a smooth width
            transition instead of overlaying it. Mobile keeps the overlay
            below. */}
        <aside
          className={`hidden shrink-0 overflow-hidden transition-all duration-200 lg:block ${
            aiOpen ? "w-[400px] opacity-100" : "w-0 opacity-0"
          }`}
          aria-hidden={!aiOpen}
        >
          <div className="w-[400px] overflow-hidden rounded-xl border bg-card shadow-panel">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <Sparkles className="size-4 shrink-0 text-brass" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                AI Tools
                {activeChapter && (
                  <span className="text-muted-foreground"> · {activeChapter.title}</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setAiOpen(false)}
                aria-label="Close AI Tools"
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-4">
              <AIPanel />
            </div>
          </div>
        </aside>
      </div>
      {/* AI Tools overlay (mobile only). */}
      <div
        className={`fixed inset-0 z-50 ${aiOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!aiOpen}
      >
        <div
          onClick={() => setAiOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 lg:hidden ${aiOpen ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l bg-background shadow-panel transition-transform duration-200 ${aiOpen ? "translate-x-0" : "translate-x-full"}`}
          role="dialog"
          aria-label="AI Tools"
        >
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Sparkles className="size-4 shrink-0 text-brass" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              AI Tools
              {activeChapter && (
                <span className="text-muted-foreground"> · {activeChapter.title}</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setAiOpen(false)}
              aria-label="Close AI Tools"
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <AIPanel />
          </div>
        </aside>
      </div>
      <BackToTop />
    </div>
  );
}
