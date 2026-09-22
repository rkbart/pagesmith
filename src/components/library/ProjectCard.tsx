"use client";

import { useState } from "react";
import { BookOpen, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Project } from "@/types/project";

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

function formatUpdated(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < MINUTE) return "moments ago";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function chapterLabel(count: number): string {
  return `${count} chapter${count === 1 ? "" : "s"}`;
}

export function ProjectCard({
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

  return (
    <article className="group flex flex-row overflow-hidden rounded-xl border bg-card shadow-panel transition-all hover:-translate-y-0.5 hover:border-brass/40 hover:shadow-lift sm:flex-col">
      {/* The cover doubles as the primary "open in the studio" affordance. */}
      <button
        type="button"
        onClick={() => onOpen(project.id)}
        aria-label={`Edit ${title}`}
        className="relative block aspect-[3/4] w-24 shrink-0 overflow-hidden bg-secondary text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-full"
      >
        {project.cover ? (
          // Cover art is a user-supplied data URL: next/image adds nothing here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.cover.data}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full flex-col items-center justify-center gap-2 bg-linear-to-b from-paper to-secondary p-2 text-center sm:gap-3 sm:p-5">
            <span className="rule-brass hidden sm:block" />
            <span className="font-heading line-clamp-3 text-xs leading-snug text-foreground sm:line-clamp-4 sm:text-lg">
              {title}
            </span>
            {author && (
              <span className="eyebrow hidden max-w-full truncate sm:block">
                {author}
              </span>
            )}
          </span>
        )}
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

        <div className="mt-auto flex items-center gap-2">
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

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{title}”?</DialogTitle>
            <DialogDescription>
              {chapterLabel(project.chapters.length)}
              {project.cover ? " and its cover" : ""} will be removed from this
              device. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(project.id);
                setConfirming(false);
              }}
            >
              <Trash2 />
              Delete book
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
