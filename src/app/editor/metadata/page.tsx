"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, Feather, Loader2, Upload } from "lucide-react";
import { MetadataForm } from "@/components/editor/MetadataForm";
import { buttonVariants } from "@/components/ui/button";
import { useProjectHydrated } from "@/hooks/useHydrated";
import { useProjectStore } from "@/lib/store/project";

/**
 * Book metadata as its own studio page. It used to live as an inline panel
 * below the chapter editor, where long chapters buried it; as a route it
 * always opens at the top. Edits write straight into the store (autosaved
 * like everything else), so leaving the page never loses work.
 */
export default function EditorMetadataPage() {
  const { project, projects, loadProject } = useProjectStore();
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
        <h1 className="heading-lg mb-3">No book on the bench</h1>
        <p className="body-md-loose mx-auto mb-8 max-w-md text-muted-foreground">
          Metadata needs a book first — bring in a manuscript and PageSmith
          will set it in type.
        </p>
        <Link href="/convert" className={buttonVariants({ variant: "brass", size: "lg" })}>
          <Upload />
          Import a manuscript
        </Link>
      </div>
    );
  }

  const title = project.metadata.title || project.name;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-4">
        <Link
          href="/editor"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to the studio
        </Link>
      </nav>
      <div className="mb-6">
        <p className="eyebrow mb-2">Metadata</p>
        <h1 className="heading-lg truncate" title={title}>
          {title}
        </h1>
        <p className="body-md-loose mt-2 text-muted-foreground">
          Saved automatically as you type — leaving this page loses nothing.
        </p>
      </div>
      <MetadataForm />
    </div>
  );
}
