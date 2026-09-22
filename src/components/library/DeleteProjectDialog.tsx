"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { chapterLabel } from "@/lib/utils/text";
import type { Project } from "@/types/project";

/** Shared delete confirmation, used by both the shelf card and the list row. */
export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
  onConfirm,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => void;
}) {
  const title = project.metadata.title || project.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep it
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm(project.id);
              onOpenChange(false);
            }}
          >
            <Trash2 />
            Delete book
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
