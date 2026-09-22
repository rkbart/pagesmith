"use client";

import { useProjectStore } from "@/lib/store/project";
import { GripVertical, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function ChapterList() {
  const { project, activeChapterId, setActiveChapter, removeChapter, reorderChapters, addChapter } =
    useProjectStore();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  if (!project) return null;

  const chapters = [...project.chapters].sort((a, b) => a.order - b.order);

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setOverIndex(index);
  }

  function handleDrop(index: number) {
    if (dragIndex !== null && dragIndex !== index) {
      reorderChapters(dragIndex, index);
    }
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <div className="space-y-1">
      {chapters.map((chapter, index) => (
        <div
          key={chapter.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={() => {
            setDragIndex(null);
            setOverIndex(null);
          }}
          onDrop={() => handleDrop(index)}
          onClick={() => setActiveChapter(chapter.id)}
          className={`group flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm transition-colors ${
            activeChapterId === chapter.id
              ? "border-primary bg-primary/5"
              : "border-transparent hover:bg-muted"
          } ${overIndex === index && dragIndex !== null ? "border-primary border-dashed" : ""} ${
            dragIndex === index ? "opacity-50" : ""
          }`}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0 cursor-grab" />
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium">{chapter.title}</p>
            <p className="text-xs text-muted-foreground">
              Level {chapter.level} · {chapter.content.replace(/<[^>]+>/g, "").length} chars
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              removeChapter(chapter.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => addChapter()}>
        <Plus className="h-4 w-4 mr-1" /> Add Chapter
      </Button>
    </div>
  );
}
