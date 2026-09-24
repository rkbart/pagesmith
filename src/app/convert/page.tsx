"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  FileText,
  FileType2,
  Hash,
  FileCode,
  AlignLeft,
  BookOpen,
  AlertCircle,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { FileDropZone } from "@/components/converter/FileDropZone";
import {
  ImportQueue,
  type QueueItem,
  type QueueStatus,
} from "@/components/converter/ImportQueue";
import { parseFile } from "@/lib/parsers";
import { useProjectStore } from "@/lib/store/project";
import type {
  BookCover,
  BookMetadata,
  Chapter,
  SourceFormat,
} from "@/types/project";
import {
  stageFileForConvert,
  detectFormatFromName,
  ACCEPTED_DROP,
} from "@/lib/utils/handoff";

const formats = [
  { icon: FileText, label: "PDF" },
  { icon: FileType2, label: "DOCX" },
  { icon: Hash, label: "Markdown" },
  { icon: FileCode, label: "HTML" },
  { icon: AlignLeft, label: "TXT" },
  { icon: BookOpen, label: "EPUB" },
];

function newChapterId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Batch cap: files parse sequentially and fully in memory, so an unbounded
 * drop can lock the tab on time and RAM. 10 covers real merge use
 * (multi-part manuscripts) while keeping worst-case import bounded.
 */
const MAX_BATCH_FILES = 10;

/** First non-empty value wins — later files only fill in blanks. */
function mergeMetadata(
  base: Partial<BookMetadata>,
  next: Partial<BookMetadata>
): Partial<BookMetadata> {
  const merged = { ...base };
  (Object.keys(next) as (keyof BookMetadata)[]).forEach((key) => {
    // All BookMetadata values are strings, so a record view is exact.
    const record = merged as Record<string, string | undefined>;
    const value = record[key as string];
    const incoming = next[key] as string | undefined;
    if ((value === undefined || value === "") && incoming !== undefined && incoming !== "") {
      record[key as string] = incoming;
    }
  });
  return merged;
}

export default function ConvertHub() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const cancelRef = useRef(false);
  const { createProject, importChapters } = useProjectStore();

  async function updateItem(id: string, patch: Partial<QueueItem>) {
    setQueue((prev) =>
      prev ? prev.map((item) => (item.id === id ? { ...item, ...patch } : item)) : prev
    );
  }

  async function handleSingle(file: File) {
    setError(null);
    const format = await stageFileForConvert(file);
    if (!format) {
      setError("Unsupported format — try PDF, DOCX, Markdown, HTML, TXT or EPUB.");
      return;
    }
    router.push(`/convert/${format}`);
  }

  /**
   * Multi-file flow: every dropped file is parsed (mixed formats allowed,
   * processed sequentially in natural filename order) and all detected
   * chapters are merged into ONE new project.
   */
  async function handleFiles(files: File[]) {
    setError(null);
    setNotice(null);
    cancelRef.current = false;

    // Enforce the batch cap up front: extras are ignored, not queued.
    const capped = files.slice(0, MAX_BATCH_FILES);
    if (files.length > MAX_BATCH_FILES) {
      setNotice(
        `Batch limited to ${MAX_BATCH_FILES} files — the first ${MAX_BATCH_FILES} in filename order are imported, the rest were skipped.`
      );
    }

    const sorted = [...capped].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    );
    const items: QueueItem[] = sorted.map((file, i) => ({
      id: `${i}-${file.name}`,
      file,
      format: detectFormatFromName(file.name),
      status: "queued" as QueueStatus,
    }));
    setQueue(items);

    const mergedChapters: Chapter[] = [];
    let metadata: Partial<BookMetadata> = {};
    let cover: BookCover | undefined;

    for (const item of items) {
      if (cancelRef.current) return;
      if (!item.format) {
        void updateItem(item.id, { status: "error", error: "Unsupported format" });
        continue;
      }
      await updateItem(item.id, { status: "parsing" });
      try {
        const result = await parseFile(item.file, item.format);
        const addedFrom = mergedChapters.length;
        for (const chapter of result.chapters) {
          // Fresh ids so files can never collide on chapter keys/TOC entries.
          mergedChapters.push({ ...chapter, id: newChapterId() });
        }
        metadata = mergeMetadata(metadata, result.metadata);
        if (!cover) {
          cover = result.cover;
        } else if (result.cover && mergedChapters.length > addedFrom) {
          // Only the first file's cover becomes the book cover — later
          // files' covers are re-attached as inline illustrations so the
          // merge never silently drops artwork.
          const first = mergedChapters[addedFrom];
          first.content =
            `<p class="center"><img src="${result.cover.data}" alt="Illustration"/></p>\n${first.content}`;
        }
        await updateItem(item.id, {
          status: "done",
          chapters: result.chapters.length,
          warnings: result.warnings,
        });
      } catch (err) {
        await updateItem(item.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Failed to parse",
        });
      }
    }

    if (cancelRef.current) return;

    if (mergedChapters.length > 0) {
      createProject(sorted[0].name.replace(/\.[^.]+$/, ""));
      importChapters(
        mergedChapters.map((chapter, i) => ({ ...chapter, order: i })),
        metadata,
        cover
      );
    }
  }

  function resetQueue() {
    cancelRef.current = true;
    setQueue(null);
    setNotice(null);
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mb-10 text-center">
        <p className="eyebrow mb-2">The import desk</p>
        <h1 className="heading-lg">Bring in a manuscript</h1>
        <p className="body-md-loose mx-auto mt-2 max-w-xl text-muted-foreground">
          Drop one file to convert it — or up to {MAX_BATCH_FILES} to bind
          them into a single book, in filename order. Mixed formats are
          welcome; each file is detected on its own.
        </p>
      </div>

      {queue ? (
        <ImportQueue items={queue} onOpen={() => router.push("/library")} onReset={resetQueue} />
      ) : (
        <>
          <FileDropZone
            accept={ACCEPTED_DROP}
            onFile={handleSingle}
            onFiles={handleFiles}
            multiple
            label={`Drop manuscripts here — one, or up to ${MAX_BATCH_FILES} to merge`}
          />

          {error && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          {notice && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Info className="size-4 shrink-0" aria-hidden="true" />
              {notice}
            </p>
          )}

          <div className="mt-10">
            <p className="eyebrow mb-4 text-center">Allowed file formats</p>
            <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
              {formats.map((format) => (
                <Card
                  key={format.label}
                  className="h-full items-center gap-2 p-5 text-center"
                >
                  <div className="mx-auto grid size-11 place-items-center rounded-xl bg-brass/10">
                    <format.icon className="size-5 text-brass" aria-hidden="true" />
                  </div>
                  <h3 className="heading-sm">{format.label}</h3>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
