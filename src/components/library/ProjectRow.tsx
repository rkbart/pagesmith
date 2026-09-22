"use client";

import { useState } from "react";
import { BookOpen, Pencil, Trash2 } from "lucide-react";
import { CoverArt } from "./CoverArt";
import { DeleteProjectDialog } from "./DeleteProjectDialog";
import { Button } from "@/components/ui/button";
import { chapterLabel, formatUpdated } from "@/lib/utils/text";
import type { Project } from "@/types/project";

/** Dense shelf row — same actions as the card, tuned for scanning long lists. */
export function ProjectRow({
  project,
  onOpen,
  onRead,
  onDelete,
}: {
  project: Project;
  onOpen: (id: string) => void;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const title = project.metadata.title || project.name;
  const author = project.metadata.author;
  const empty = project.chapters.length === 0;
  const meta = [
    author || null,
    chapterLabel(project.chapters.length),
    `edited ${formatUpdated(project.updatedAt)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="group flex items-center gap-3 rounded-xl border bg-card p-2.5 shadow-panel transition-colors hover:border-brass/40 hover:bg-paper sm:gap-4 sm:p-3">
      <button
        type="button"
        onClick={() => onOpen(project.id)}
        aria-label={`Edit ${title}`}
        className="block aspect-[3/4] w-10 shrink-0 overflow-hidden rounded-md border bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-12"
      >
        <CoverArt project={project} variant="list" />
      </button>

      <div className="min-w-0 flex-1">
        <h3 className="font-heading truncate text-sm sm:text-base" title={title}>
          {title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          size="sm"
          variant="brass"
          className="h-8 px-2.5"
          onClick={() => onRead(project.id)}
          disabled={empty}
          aria-label={`Read ${title}`}
          title={empty ? "Add a chapter before reading" : undefined}
        >
          <BookOpen />
          <span className="hidden sm:inline">Read</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2.5"
          onClick={() => onOpen(project.id)}
          aria-label={`Edit ${title}`}
        >
          <Pencil />
          <span className="hidden sm:inline">Edit</span>
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Delete ${title}`}
          className="text-muted-foreground hover:text-destructive"
          onClick={() => setConfirming(true)}
        >
          <Trash2 />
        </Button>
      </div>

      <DeleteProjectDialog
        project={project}
        open={confirming}
        onOpenChange={setConfirming}
        onConfirm={onDelete}
      />
    </article>
  );
}
