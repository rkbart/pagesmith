"use client";

import { useProjectStore } from "@/lib/store/project";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

const LEVEL_INDENT: Record<number, string> = { 1: "pl-4", 2: "pl-6", 3: "pl-8", 4: "pl-10", 5: "pl-12", 6: "pl-14" };

export function PreviewDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { project } = useProjectStore();
  const [activeTab, setActiveTab] = useState(0);

  if (!project) return null;

  const chapters = [...project.chapters].sort((a, b) => a.order - b.order);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{project.metadata.title} — Preview</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
          {/* TOC sidebar */}
          <nav className="lg:w-48 shrink-0 overflow-y-auto max-h-[50vh] lg:max-h-none">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
              Contents
            </p>
            <div className="flex flex-col gap-1">
              {chapters.map((ch, i) => (
                <button
                  key={ch.id}
                  onClick={() => setActiveTab(i)}
                  className={`text-left text-sm px-2 py-1 rounded truncate ${
                    activeTab === i ? "bg-brass/10 text-brass font-medium" : "hover:bg-secondary"
                  } ${LEVEL_INDENT[ch.level] ?? "pl-4"}`}
                >
                  {ch.title}
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
            <div className="flex-1 overflow-y-auto rounded-xl border bg-paper p-6 shadow-panel">
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              style={{ fontFamily: "Georgia, serif" }}
              dangerouslySetInnerHTML={{ __html: chapters[activeTab]?.content ?? "" }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
