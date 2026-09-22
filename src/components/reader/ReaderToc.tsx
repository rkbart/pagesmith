"use client";

import { useMemo } from "react";
import type { Chapter } from "@/types/project";

const LEVEL_INDENT: Record<number, string> = {
  1: "pl-2.5",
  2: "pl-4.5",
  3: "pl-6.5",
  4: "pl-8.5",
  5: "pl-10.5",
  6: "pl-12.5",
};

export function ReaderToc({
  chapters,
  activeChapterId,
  onSelect,
  className,
}: {
  chapters: Chapter[];
  activeChapterId: string | null;
  onSelect: (chapterId: string) => void;
  className?: string;
}) {
  const ordered = useMemo(
    () => [...chapters].sort((a, b) => a.order - b.order),
    [chapters]
  );

  return (
    <nav aria-label="Contents" className={className}>
      <p className="eyebrow mb-3">Contents</p>
      <ol className="space-y-0.5">
        {ordered.map((chapter, index) => {
          const active = chapter.id === activeChapterId;
          return (
            <li key={chapter.id}>
              <button
                type="button"
                onClick={() => onSelect(chapter.id)}
                aria-current={active ? "true" : undefined}
                className={`flex w-full items-baseline gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                  active
                    ? "bg-brass/10 font-medium text-brass"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                } ${LEVEL_INDENT[chapter.level] ?? "pl-2.5"}`}
              >
                <span className="code shrink-0 tabular-nums opacity-60">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">{chapter.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
