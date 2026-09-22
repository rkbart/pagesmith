"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Feather, Loader2, Plus, Upload } from "lucide-react";
import { ProjectCard } from "@/components/library/ProjectCard";
import { Button, buttonVariants } from "@/components/ui/button";
import { useProjectHydrated } from "@/hooks/useHydrated";
import { useProjectStore } from "@/lib/store/project";
import { clearPosition } from "@/lib/utils/reading-progress";

export default function LibraryPage() {
  const router = useRouter();
  const hydrated = useProjectHydrated();
  const { projects, loadProject, deleteProject, createProject } = useProjectStore();

  // Most recently touched book first — the shelf mirrors how people work.
  const shelf = useMemo(
    () => [...projects].sort((a, b) => b.updatedAt - a.updatedAt),
    [projects]
  );
  const totalChapters = useMemo(
    () => projects.reduce((sum, p) => sum + p.chapters.length, 0),
    [projects]
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
    <div className="container mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">The shelf</p>
          <h1 className="heading-lg">Your library</h1>
          <p className="body-md-loose mt-2 text-muted-foreground">
            {shelf.length} book{shelf.length === 1 ? "" : "s"} · {totalChapters}{" "}
            chapter{totalChapters === 1 ? "" : "s"} — all kept on this device.
          </p>
        </div>
        <Button variant="brass" onClick={startBlank} className="shrink-0">
          <Plus />
          New book
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {shelf.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onOpen={openBook}
            onRead={readBook}
            onDelete={deleteBook}
          />
        ))}

        <button
          type="button"
          onClick={startBlank}
          className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-brass/30 bg-paper p-6 text-center text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-brass/60 hover:bg-brass/5"
        >
          <span className="grid size-12 place-items-center rounded-xl bg-brass/10">
            <Plus className="size-5 text-brass" aria-hidden="true" />
          </span>
          <span className="font-heading text-base text-foreground">Start a new book</span>
          <span className="text-xs">Blank pages, ready to fill</span>
        </button>
      </div>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <BookOpen className="size-3.5 shrink-0 text-brass" aria-hidden="true" />
        Read opens the reading room — it remembers the page you stopped on.
      </p>
    </div>
  );
}
