"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useProjectStore } from "@/lib/store/project";
import type { Chapter } from "@/types/project";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TOOLBAR_BUTTONS = [
  { label: "B", title: "Bold", command: "bold", style: "font-bold" },
  { label: "I", title: "Italic", command: "italic", style: "italic" },
  { label: "U", title: "Underline", command: "underline", style: "underline" },
  { label: "S", title: "Strikethrough", command: "strikeThrough", style: "line-through" },
];

const BLOCK_FORMATS = [
  { value: "p", label: "Paragraph" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "h4", label: "Heading 4" },
  { value: "blockquote", label: "Quote" },
];

export function ChapterEditor({ chapter }: { chapter: Chapter }) {
  const { updateChapter } = useProjectStore();
  const editorRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(chapter.title);
  const [level, setLevel] = useState(String(chapter.level));
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (editorRef.current && !initialized) {
      editorRef.current.innerHTML = chapter.content;
      setInitialized(true);
    }
  }, [chapter.id, chapter.content, initialized]);

  useEffect(() => {
    setInitialized(false);
    setTitle(chapter.title);
    setLevel(String(chapter.level));
  }, [chapter.id]);

  const handleContentChange = useCallback(() => {
    if (editorRef.current) {
      updateChapter(chapter.id, { content: editorRef.current.innerHTML });
    }
  }, [chapter.id, updateChapter]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    updateChapter(chapter.id, { title: value });
  };

  const handleLevelChange = (value: string) => {
    setLevel(value);
    updateChapter(chapter.id, { level: parseInt(value) });
  };

  const execCommand = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    handleContentChange();
  };

  const applyBlockFormat = (tag: string) => {
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, tag);
    handleContentChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Chapter title"
          className="text-lg font-semibold"
        />
        <Select
          value={level}
          onValueChange={(v) => handleLevelChange(v ?? "1")}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6].map((l) => (
              <SelectItem key={l} value={String(l)}>
                Level {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-md border p-2">
        {TOOLBAR_BUTTONS.map((btn) => (
          <button
            key={btn.command}
            type="button"
            title={btn.title}
            onClick={() => execCommand(btn.command)}
            className={`h-8 w-8 rounded text-sm hover:bg-muted ${btn.style}`}
          >
            {btn.label}
          </button>
        ))}

        <div className="w-px h-6 bg-border mx-1" />

        <Select
          onValueChange={(v) => {
            if (v) applyBlockFormat(v);
          }}
          value=""
        >
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="Block format" />
          </SelectTrigger>
          <SelectContent>
            {BLOCK_FORMATS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-px h-6 bg-border mx-1" />

        <button
          type="button"
          onClick={() => execCommand("insertHorizontalRule")}
          className="h-8 px-2 rounded text-sm hover:bg-muted"
          title="Horizontal rule"
        >
          —
        </button>
        <button
          type="button"
          onClick={() => execCommand("insertUnorderedList")}
          className="h-8 px-2 rounded text-sm hover:bg-muted"
          title="Bullet list"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => execCommand("insertOrderedList")}
          className="h-8 px-2 rounded text-sm hover:bg-muted"
          title="Numbered list"
        >
          1. List
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleContentChange}
        onBlur={handleContentChange}
        className="prose prose-lg max-w-none min-h-[400px] rounded-md border p-6 focus:outline-none focus:ring-2 focus:ring-ring [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_p]:my-2 [&_p]:leading-relaxed [&_p]:indent-4"
        style={{ fontFamily: "Georgia, serif" }}
      />
    </div>
  );
}
