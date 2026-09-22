"use client";

import { useCallback, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useProjectStore } from "@/lib/store/project";
import { useParser } from "@/hooks/useParser";
import type { SourceFormat } from "@/types/project";
import { FileDropZone } from "@/components/converter/FileDropZone";
import { ChapterReview } from "@/components/converter/ChapterReview";

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
  const router = useRouter();
  const formatInfo = FORMAT_INFO[format as SourceFormat];
  const { createProject, project, importChapters } = useProjectStore();
  const { parsing, error, result, parse } = useParser();
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState(false);

  useEffect(() => {
    if (parsed && project && result) {
      // Already imported via useParser
    }
  }, [parsed, project, result]);

  const handleFile = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      try {
        if (!project) {
          const name = selectedFile.name.replace(/\.[^.]+$/, "");
          createProject(name);
        }
        const parseResult = await parse(selectedFile, format as SourceFormat);
        setParsed(true);
      } catch {
        // error is set by useParser
      }
    },
    [project, createProject, parse, format]
  );

  if (!formatInfo) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Unknown Format</h1>
        <Link href="/convert" className={buttonVariants({ size: "lg" })}>
          Back to Converter
        </Link>
      </div>
    );
  }

  return (
    <div className="container px-4 sm:px-6 lg:px-8 py-12 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">{formatInfo.title}</h1>
        <p className="text-muted-foreground mt-2">{formatInfo.description}</p>
      </div>

      {parsing && (
        <Card className="p-8 text-center">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
          <p className="font-medium">Parsing your file...</p>
          <p className="text-sm text-muted-foreground mt-1">
            Detecting chapters and extracting content
          </p>
        </Card>
      )}

      {error && (
        <Card className="p-6 border-red-300 bg-red-50 dark:bg-red-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-700 dark:text-red-400">Failed to parse file</p>
              <p className="text-sm text-red-600 dark:text-red-400/80 mt-1">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {parsed && result && !parsing && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <p className="font-medium">
                Parsed {result.chapters.length} chapter{result.chapters.length !== 1 ? "s" : ""}
              </p>
            </div>
            {result.warnings.length > 0 && (
              <div className="space-y-1 mb-4">
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-sm text-amber-600 dark:text-amber-400">
                    ⚠ {w}
                  </p>
                ))}
              </div>
            )}
            <ChapterReview chapters={result.chapters} />
          </Card>

          <div className="flex gap-3">
            <Link href="/editor" className={buttonVariants({ size: "lg" })}>
              Open in Editor <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setFile(null);
                setParsed(false);
              }}
            >
              Parse Another File
            </Button>
          </div>
        </div>
      )}

      {!parsed && !parsing && (
        <FileDropZone
          accept={formatInfo.accept}
          onFile={handleFile}
          label={`Drop your ${format.toUpperCase()} file here`}
        />
      )}
    </div>
  );
}
