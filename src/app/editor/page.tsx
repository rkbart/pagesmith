"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useProjectStore } from "@/lib/store/project";
import { useProjectHydrated } from "@/hooks/useHydrated";
import { ChapterList } from "@/components/editor/ChapterList";
import { ChapterEditor } from "@/components/editor/ChapterEditor";
import { MetadataForm } from "@/components/editor/MetadataForm";
import { CoverUpload } from "@/components/editor/CoverUpload";
import { ExportBar } from "@/components/editor/ExportBar";
import { AIPanel } from "@/components/ai/AIPanel";
import { Button, buttonVariants } from "@/components/ui/button";
import { Plus, Library, Feather, Loader2 } from "lucide-react";

export default function EditorPage() {
  const {
    project,
    projects,
    activeChapterId,
    loadProject,
    addChapter,
  } = useProjectStore();
  const [showMeta, setShowMeta] = useState(false);
  const [showAI, setShowAI] = useState(false);

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
        onToggleMeta={() => setShowMeta(!showMeta)}
        onToggleAI={() => setShowAI(!showAI)}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="eyebrow">Chapters ({project.chapters.length})</h2>
            <Button size="sm" onClick={() => addChapter()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ChapterList />
          <div className="border-t pt-4">
            <h3 className="eyebrow mb-3">Cover</h3>
            <CoverUpload />
          </div>
        </aside>

        <div className="min-w-0">
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
          {showMeta && (
            <div className="mt-6">
              <MetadataForm />
            </div>
          )}
          {showAI && (
            <div className="mt-6">
              <AIPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
