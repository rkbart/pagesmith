"use client";

import { useState } from "react";
import type { Chapter } from "@/types/project";
import { ChevronDown, ChevronRight } from "lucide-react";

export function ChapterReview({ chapters }: { chapters: Chapter[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground mb-3">
        Detected chapters (click to preview):
      </p>
      {chapters.map((ch, i) => {
        const textPreview = ch.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const isExpanded = expandedId === ch.id;

        return (
          <div
            key={ch.id}
            className="rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setExpandedId(isExpanded ? null : ch.id)}
          >
            <div className="flex items-center gap-2 px-3 py-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="text-xs text-muted-foreground w-8 shrink-0">{i + 1}.</span>
              <span
                className="font-medium text-sm truncate"
                style={{ paddingLeft: `${(ch.level - 1) * 12}px` }}
              >
                {ch.title}
              </span>
              <span className="ml-auto text-xs text-muted-foreground shrink-0">
                {textPreview.length} chars
              </span>
            </div>
            {isExpanded && (
              <div className="px-3 pb-3 pl-10">
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {textPreview.substring(0, 400)}...
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
