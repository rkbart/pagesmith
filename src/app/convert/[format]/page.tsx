"use client";

import { useCallback, useEffect, useState, use } from "react";
import { Loader2, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useProjectStore } from "@/lib/store/project";
import { useParser } from "@/hooks/useParser";
import { buildEpub, downloadBlob } from "@/lib/epub/generate";
import type { SourceFormat } from "@/types/project";
import { FileDropZone } from "@/components/converter/FileDropZone";
import { ChapterReview } from "@/components/converter/ChapterReview";
import { consumeStagedFile } from "@/lib/utils/handoff";

const FORMAT_INFO: Record<SourceFormat, { title: string; accept: string; description: string }> = {
  pdf: { title: "PDF to EPUB", accept: ".pdf", description: "Extract text and detect chapters from PDF files" },
  docx: { title: "DOCX to EPUB", accept: ".docx", description: "Convert Word documents with heading detection" },
  markdown: { title: "Markdown to EPUB", accept: ".md,.markdown", description: "Convert Markdown with frontmatter support" },
  html: { title: "HTML to EPUB", accept: ".html,.htm", description: "Clean and restructure HTML content" },
  txt: { title: "TXT to EPUB", accept: ".txt", description: "Auto-detect chapters from plain text" },
  epub: { title: "Open EPUB", accept: ".epub", description: "Open and edit an existing EPUB file" },
};

export default function ConvertFormatPage({
  params,
}: {
  params: Promise<{ format: string }>;
}) {
  const { format } = use(params);
  const formatInfo = FORMAT_INFO[format as SourceFormat];
  const { createProject } = useProjectStore();
  const { parsing, error, result, parse } = useParser();
  const [parsed, setParsed] = useState(false);
  const [autoExport, setAutoExport] = useState<string | null>(null);

  // Always bind a fresh project per import — an open book is never
  // overwritten by accident.
  const runParse = useCallback(
    async (selectedFile: File, projectName: string) => {
      setAutoExport(null);
      try {
        createProject(projectName);
        await parse(selectedFile, format as SourceFormat);
        setParsed(true);
        // PDF imports finish as a ready EPUB: text, chapters, cover and
        // illustrations are all in the project, so press the book and hand
        // it over — no extra clicks. Export failure never fails the import.
        if (format === "pdf") {
          try {
            const project = useProjectStore.getState().project;
            if (project && project.chapters.length > 0) {
              const { blob, filename } = await buildEpub(project);
              downloadBlob(blob, filename);
              setAutoExport(filename);
            }
          } catch {
            setAutoExport("EPUB export failed — your book is still in the studio, export it from the editor.");
          }
        }
      } catch {
        // error state is surfaced by useParser
      }
    },
    [createProject, parse, format]
  );

  // Consume a file staged by the landing hero or the import desk, so a
  // drop there flows straight into parsing — no re-drop needed. Deferred
  // to a task so parsing state isn't set synchronously during the effect.
  useEffect(() => {
    if (!formatInfo) return;
    const t = setTimeout(() => {
      const staged = consumeStagedFile(format as SourceFormat);
      if (staged) void runParse(staged.file, staged.projectName);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format]);

  const reset = () => {
    setParsed(false);
    setAutoExport(null);
  };

  if (!formatInfo) {
    return (
      <div className="container py-16 text-center">
        <h1 className="heading-lg mb-4">Unknown format</h1>
        <Link href="/convert" className={buttonVariants({ variant: "brass", size: "lg" })}>
          Back to the import desk
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <p className="eyebrow mb-2">On the press</p>
        <h1 className="heading-lg">{formatInfo.title}</h1>
        <p className="body-md-loose mt-2 text-muted-foreground">
          {formatInfo.description}
        </p>
      </div>

      {parsing && (
        <Card className="items-center p-10 text-center">
          <Loader2 className="size-10 animate-spin text-brass" aria-hidden="true" />
          <p className="font-heading mt-4 text-lg">Reading your manuscript…</p>
          <p className="body-sm mt-1 text-muted-foreground">
            Detecting chapters and drafting a table of contents
          </p>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <p className="font-medium text-destructive">This page didn&apos;t take</p>
              <p className="body-sm mt-1 text-destructive/80">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {parsed && result && !parsing && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <CheckCircle2 className="size-5 shrink-0 text-brass" aria-hidden="true" />
              <p className="font-medium">
                Parsed {result.chapters.length} chapter
                {result.chapters.length !== 1 ? "s" : ""}
              </p>
            </div>
            {result.warnings.length > 0 && (
              <div className="mb-4 space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-sm text-amber-700 dark:text-amber-400">
                    {w}
                  </p>
                ))}
              </div>
            )}
            {autoExport && (
              <div className="mb-4 rounded-lg border border-brass/30 bg-brass/10 p-3">
                <p className="text-sm">
                  Your EPUB converted automatically and downloaded as{" "}
                  <span className="font-medium">{autoExport}</span> — it&apos;s
                  also waiting for you in the studio.
                </p>
              </div>
            )}
            <ChapterReview chapters={result.chapters} />
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/editor" className={buttonVariants({ variant: "brass", size: "lg" })}>
              Open in the studio <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Button variant="outline" size="lg" onClick={reset}>
              Bind another file
            </Button>
          </div>
        </div>
      )}

      {!parsed && !parsing && (
        <FileDropZone
          accept={formatInfo.accept}
          onFile={(selected) => void runParse(selected, selected.name.replace(/\.[^.]+$/, ""))}
          label={`Drop your ${format.toUpperCase()} file here`}
        />
      )}
    </div>
  );
}
