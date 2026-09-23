"use client";

import { useState } from "react";
import { BookOpen, Pencil, Trash2 } from "lucide-react";
import { CoverArt } from "./CoverArt";
import { CollectionSelect } from "./CollectionSelect";
import { DeleteProjectDialog } from "./DeleteProjectDialog";
import { Button } from "@/components/ui/button";
import { formatUpdated } from "@/lib/utils/text";
import type { Collection, Project } from "@/types/project";

export function ProjectCard({
  project,
  collections,
  onAssign,
  onOpen,
  onRead,
  onDelete,
}: {
  project: Project;
  collections: Collection[];
  onAssign: (collectionId: string | null) => void;
  onOpen: (id: string) => void;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const title = project.metadata.title || project.name;
  const author = project.metadata.author;
  const empty = project.chapters.length === 0;

  return (
    <article className="group flex flex-row overflow-hidden rounded-xl border bg-card shadow-panel transition-all hover:-translate-y-0.5 hover:border-brass/40 hover:shadow-lift sm:flex-col">
      {/* The cover doubles as the primary "open in the studio" affordance. */}
      <button
        type="button"
        onClick={() => onOpen(project.id)}
        aria-label={`Edit ${title}`}
        className="relative block aspect-[3/4] w-24 shrink-0 overflow-hidden bg-secondary text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-full"
      >
        <CoverArt project={project} />
        <span className="absolute right-1.5 bottom-1.5 rounded-full border bg-background/85 px-1.5 py-0.5 text-[0.65rem] text-muted-foreground backdrop-blur sm:right-2.5 sm:bottom-2.5 sm:px-2 sm:text-xs">
          {project.chapters.length} ch.
        </span>
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-heading truncate text-base" title={title}>
              {title}
            </h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {author ? `${author} · ` : ""}edited {formatUpdated(project.updatedAt)}
            </p>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Delete ${title}`}
            className="-mt-1 -mr-1 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirming(true)}
          >
            <Trash2 />
          </Button>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <CollectionSelect
            bookTitle={title}
            collectionId={project.collectionId}
            collections={collections}
            onAssign={onAssign}
            className="h-8 w-full text-xs"
          />
          <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="brass"
            className="h-8 min-w-0 flex-1 px-3"
            onClick={() => onRead(project.id)}
            disabled={empty}
            title={empty ? "Add a chapter before reading" : undefined}
          >
            <BookOpen />
            Read
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 min-w-0 flex-1 px-3"
            onClick={() => onOpen(project.id)}
          >
            <Pencil />
            Edit
          </Button>
          </div>
        </div>
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
