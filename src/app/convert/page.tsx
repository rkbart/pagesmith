"use client";

import Link from "next/link";
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
  { icon: FileText, label: "PDF", href: "/convert/pdf" },
  { icon: FileType2, label: "DOCX", href: "/convert/docx" },
  { icon: Hash, label: "Markdown", href: "/convert/markdown" },
  { icon: FileCode, label: "HTML", href: "/convert/html" },
  { icon: AlignLeft, label: "TXT", href: "/convert/txt" },
  { icon: BookOpen, label: "EPUB", href: "/convert/epub" },
];

function newChapterId(): string {
  return Math.random().toString(36).substring(2, 9);
}

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
    cancelRef.current = false;

    const sorted = [...files].sort((a, b) =>
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
        for (const chapter of result.chapters) {
          // Fresh ids so files can never collide on chapter keys/TOC entries.
          mergedChapters.push({ ...chapter, id: newChapterId() });
        }
        metadata = mergeMetadata(metadata, result.metadata);
        cover ??= result.cover;
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
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mb-10 text-center">
        <p className="eyebrow mb-2">The import desk</p>
        <h1 className="heading-lg">Bring in a manuscript</h1>
        <p className="body-md-loose mx-auto mt-2 max-w-xl text-muted-foreground">
          Drop one file to convert it — or drop several to bind them into a
          single book, in filename order. Formats are detected per file.
        </p>
      </div>

      {queue ? (
        <ImportQueue items={queue} onOpen={() => router.push("/editor")} onReset={resetQueue} />
      ) : (
        <>
          <FileDropZone
            accept={ACCEPTED_DROP}
            onFile={handleSingle}
            onFiles={handleFiles}
            multiple
            label="Drop manuscripts here — one, or many to merge"
          />

          {error && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          <div className="mt-10">
            <p className="eyebrow mb-4 text-center">Or pick your source</p>
            <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
              {formats.map((format) => (
                <Link key={format.label} href={format.href}>
                  <Card className="h-full items-center gap-2 p-5 text-center transition-all hover:-translate-y-0.5 hover:border-brass/40 hover:shadow-lift">
                    <div className="mx-auto grid size-11 place-items-center rounded-xl bg-brass/10">
                      <format.icon className="size-5 text-brass" aria-hidden="true" />
                    </div>
                    <h3 className="heading-sm">{format.label}</h3>
                    <p className="code text-muted-foreground">→ EPUB</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
