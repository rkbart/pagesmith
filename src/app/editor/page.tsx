"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useProjectStore } from "@/lib/store/project";
import { ChapterList } from "@/components/editor/ChapterList";
import { ChapterEditor } from "@/components/editor/ChapterEditor";
import { MetadataForm } from "@/components/editor/MetadataForm";
import { CoverUpload } from "@/components/editor/CoverUpload";
import { ExportBar } from "@/components/editor/ExportBar";
import { AIPanel } from "@/components/ai/AIPanel";
import { Button, buttonVariants } from "@/components/ui/button";
import { Plus, BookOpen, Feather } from "lucide-react";

export default function EditorPage() {
  const {
    project,
    projects,
    activeChapterId,
    createProject,
    loadProject,
    addChapter,
    setActiveChapter,
  } = useProjectStore();
  const [showMeta, setShowMeta] = useState(false);
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    if (!project && projects.length > 0) {
      loadProject(projects[projects.length - 1].id);
    }
  }, [project, projects, loadProject]);

  if (!project) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-brass/10 shadow-panel">
          <Feather className="size-7 text-brass" aria-hidden="true" />
        </div>
        <h1 className="heading-lg mb-3">The bench is clear</h1>
        <p className="body-md-loose text-muted-foreground mb-8">
          Open a book or bring in a manuscript to start binding.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => createProject("Untitled Book")} variant="brass" size="lg">
            <Plus className="mr-2 h-4 w-4" /> New book
          </Button>
          <Link href="/convert" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Import a file
          </Link>
        </div>
        {projects.length > 0 && (
          <div className="mt-10">
            <p className="eyebrow mb-3">Reopen a recent book</p>
            <div className="space-y-1.5 text-left">
              {projects.map((p) => (
                <Button
                  key={p.id}
                  variant="ghost"
                  onClick={() => loadProject(p.id)}
                  className="w-full justify-start"
                >
                  <BookOpen className="mr-2 h-4 w-4 text-brass" aria-hidden="true" />
                  <span className="truncate">{p.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {p.chapters.length} ch.
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}
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
