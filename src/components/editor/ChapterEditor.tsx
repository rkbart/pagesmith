"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Eraser,
  ImagePlus,
  Link2,
  ListOrdered,
  Redo2,
  Undo2,
  Unlink,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/lib/store/project";
import type { Chapter } from "@/types/project";
import { escapeHtml } from "@/lib/utils/text";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TOOLBAR_BUTTONS = [
  { label: "B", title: "Bold", command: "bold", style: "font-bold" },
  { label: "I", title: "Italic", command: "italic", style: "italic" },
  { label: "U", title: "Underline", command: "underline", style: "underline" },
  { label: "S", title: "Strikethrough", command: "strikeThrough", style: "line-through" },
];

const ALIGN_BUTTONS = [
  { title: "Align left", command: "justifyLeft", Icon: AlignLeft },
  { title: "Align center", command: "justifyCenter", Icon: AlignCenter },
  { title: "Align right", command: "justifyRight", Icon: AlignRight },
  { title: "Justify", command: "justifyFull", Icon: AlignJustify },
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
  const { project, updateChapter, checkpointChapter, undoChapter, redoChapter } =
    useProjectStore();
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(chapter.title);
  const [level, setLevel] = useState(String(chapter.level));
  // External-link composer row. Focusing its input drops the editor
  // selection, so the range is saved on open and restored on apply.
  const [linking, setLinking] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const savedRange = useRef<Range | null>(null);

  // InnerHTML is set once on mount, then re-synced only when the store
  // content diverges (undo/redo, AI apply) — never while typing, where the
  // store already mirrors the DOM. The parent remounts this component with
  // a fresh `key` when the active chapter changes.
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = chapter.content;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = editorRef.current;
    if (el && el.innerHTML !== chapter.content) {
      el.innerHTML = chapter.content;
    }
  }, [chapter.content]);

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
    checkpointChapter(chapter.id);
    editorRef.current?.focus();
    document.execCommand(command, false);
    handleContentChange();
  };

  const applyBlockFormat = (tag: string) => {
    checkpointChapter(chapter.id);
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, tag);
    handleContentChange();
  };

  const startLink = () => {
    const sel = window.getSelection();
    savedRange.current =
      sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
    setLinkUrl("https://");
    setLinking(true);
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    checkpointChapter(chapter.id);
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
    savedRange.current = null;
    if (url) document.execCommand("createLink", false, url);
    setLinking(false);
    setLinkUrl("");
    handleContentChange();
  };

  const insertImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      checkpointChapter(chapter.id);
      editorRef.current?.focus();
      document.execCommand("insertImage", false, reader.result as string);
      handleContentChange();
    };
    reader.readAsDataURL(file);
  };

  /**
   * Internal cross-chapter links use a `data-chapter` id reference instead
   * of a file href: chapter filenames only exist at export time, and the
   * in-app reader resolves ids directly. `buildEpub` rewrites these to real
   * hrefs; imported EPUBs keep working through the spine-href resolver.
   */
  const insertChapterLink = (targetId: string) => {
    const target = project?.chapters.find((c) => c.id === targetId);
    if (!target || !editorRef.current) return;
    checkpointChapter(chapter.id);
    editorRef.current.focus();
    const sel = window.getSelection();
    const text =
      sel && !sel.isCollapsed ? sel.toString() : target.title;
    document.execCommand(
      "insertHTML",
      false,
      `<a href="#" data-chapter="${targetId}">${escapeHtml(text)}</a>`
    );
    handleContentChange();
  };

  /** Insert an index: a linked list of every chapter in reading order. */
  const insertIndex = () => {
    const chapters = [...(project?.chapters ?? [])].sort((a, b) => a.order - b.order);
    if (chapters.length === 0 || !editorRef.current) return;
    checkpointChapter(chapter.id);
    editorRef.current.focus();
    const items = chapters
      .map(
        (c) =>
          `<li><a href="#" data-chapter="${c.id}">${escapeHtml(c.title)}</a></li>`
      )
      .join("");
    document.execCommand("insertHTML", false, `<ul>${items}</ul>`);
    handleContentChange();
  };

  const siblings = [...(project?.chapters ?? [])].sort((a, b) => a.order - b.order);

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

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2 shadow-panel">
        <button
          type="button"
          title="Undo"
          aria-label="Undo"
          onClick={() => undoChapter(chapter.id)}
          className="h-8 w-8 rounded text-sm hover:bg-muted grid place-items-center"
        >
          <Undo2 className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Redo"
          aria-label="Redo"
          onClick={() => redoChapter(chapter.id)}
          className="h-8 w-8 rounded text-sm hover:bg-muted grid place-items-center"
        >
          <Redo2 className="size-4" aria-hidden="true" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {TOOLBAR_BUTTONS.map((btn) => (
          <button
            key={btn.command}
            type="button"
            title={btn.title}
            aria-label={btn.title}
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

        {ALIGN_BUTTONS.map(({ title, command, Icon }) => (
          <button
            key={command}
            type="button"
            title={title}
            onClick={() => execCommand(command)}
            className="h-8 w-8 rounded text-sm hover:bg-muted grid place-items-center"
          >
            <Icon className="size-4" aria-hidden="true" />
          </button>
        ))}

        <div className="w-px h-6 bg-border mx-1" />

        <button
          type="button"
          title="Insert link"
          onClick={() => (linking ? applyLink() : startLink())}
          className={`h-8 w-8 rounded text-sm hover:bg-muted grid place-items-center ${linking ? "bg-muted" : ""}`}
          aria-expanded={linking}
        >
          <Link2 className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Remove link"
          onClick={() => execCommand("unlink")}
          className="h-8 w-8 rounded text-sm hover:bg-muted grid place-items-center"
        >
          <Unlink className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Clear formatting"
          onClick={() => execCommand("removeFormat")}
          className="h-8 w-8 rounded text-sm hover:bg-muted grid place-items-center"
        >
          <Eraser className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Insert image"
          onClick={() => imageInputRef.current?.click()}
          className="h-8 w-8 rounded text-sm hover:bg-muted grid place-items-center"
        >
          <ImagePlus className="size-4" aria-hidden="true" />
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) insertImageFile(file);
            e.target.value = "";
          }}
        />

        <div className="w-px h-6 bg-border mx-1" />

        <button
          type="button"
          onClick={() => execCommand("insertHorizontalRule")}
          className="h-8 px-2 rounded text-sm hover:bg-muted"
          title="Horizontal rule"
          aria-label="Horizontal rule"
        >
          —
        </button>
        <button
          type="button"
          onClick={() => execCommand("insertUnorderedList")}
          className="h-8 px-2 rounded text-sm hover:bg-muted"
          title="Bullet list"
          aria-label="Bullet list"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => execCommand("insertOrderedList")}
          className="h-8 px-2 rounded text-sm hover:bg-muted"
          title="Numbered list"
          aria-label="Numbered list"
        >
          1. List
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        <Select
          onValueChange={(v) => {
            if (v) insertChapterLink(v);
          }}
          value=""
        >
          <SelectTrigger className="h-8 text-sm max-w-44" aria-label="Link to chapter">
            <SelectValue placeholder="Link to chapter…" />
          </SelectTrigger>
          <SelectContent>
            {siblings.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={insertIndex}
          className="h-8 px-2 rounded text-sm hover:bg-muted flex items-center gap-1.5"
          title="Insert an index of all chapters at the cursor"
        >
          <ListOrdered className="size-4" aria-hidden="true" />
          Index
        </button>
      </div>

      {linking && (
        <div className="flex items-center gap-2 rounded-xl border bg-card p-2 shadow-panel">
          <Input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyLink();
              if (e.key === "Escape") {
                setLinking(false);
                setLinkUrl("");
              }
            }}
            placeholder="https://…"
            aria-label="Link URL"
            className="h-8"
          />
          <Button
            size="sm"
            className="h-8 shrink-0"
            onClick={applyLink}
            disabled={!linkUrl.trim()}
          >
            Apply
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Cancel link"
            onClick={() => {
              setLinking(false);
              setLinkUrl("");
            }}
          >
            <X />
          </Button>
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleContentChange}
        onBlur={handleContentChange}
        className="prose prose-lg max-w-none min-h-[420px] rounded-xl border bg-paper p-6 shadow-panel focus:outline-none focus:ring-3 focus:ring-ring/30 sm:p-8 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_p]:my-2 [&_p]:leading-relaxed [&_p]:indent-4"
        // Inline max-width: the global `.prose` rule is unlayered CSS and
        // beats the `max-w-none` utility, capping the page at 70ch while the
        // toolbar spans full width. Inline style wins over both.
        style={{ fontFamily: "Georgia, serif", maxWidth: "none" }}
      />
    </div>
  );
}
