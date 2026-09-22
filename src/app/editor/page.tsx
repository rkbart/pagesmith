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
import { Plus, BookOpen } from "lucide-react";

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
      <div className="container px-4 py-16 text-center max-w-lg mx-auto">
        <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold mb-4">No Project Open</h1>
        <p className="text-muted-foreground mb-8">
          Create a new book project or convert a file to get started.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => createProject("Untitled Book")} size="lg">
            <Plus className="mr-2 h-4 w-4" /> New Book
          </Button>
          <Link href="/convert" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Convert a File
          </Link>
        </div>
        {projects.length > 0 && (
          <div className="mt-8">
            <p className="text-sm text-muted-foreground mb-3">Or open a recent project:</p>
            <div className="flex flex-col gap-2">
              {projects.map((p) => (
                <Button
                  key={p.id}
                  variant="ghost"
                  onClick={() => loadProject(p.id)}
                  className="justify-start"
                >
                  {p.name} ({p.chapters.length} chapters)
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

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 mt-6">
        <aside className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Chapters ({project.chapters.length})</h2>
            <Button size="sm" onClick={() => addChapter()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ChapterList />
          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-3">Cover</h3>
            <CoverUpload />
          </div>
        </aside>

        <div className="min-w-0">
          {activeChapter ? (
            <ChapterEditor chapter={activeChapter} />
          ) : (
            <div className="border rounded-lg p-12 text-center text-muted-foreground">
              <p className="mb-4">No chapter selected</p>
              <Button variant="outline" onClick={() => addChapter()}>
                <Plus className="mr-2 h-4 w-4" /> Add First Chapter
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
