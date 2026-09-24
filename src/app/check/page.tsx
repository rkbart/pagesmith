"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Copy,
  Check,
  Download,
  ChevronDown,
  FileText,
  Package,
  Fingerprint,
  ListTree,
  Route,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { validateEpub } from "@/lib/epub/validate";
import type { ValidationResult } from "@/types/epub";
import { FileDropZone } from "@/components/converter/FileDropZone";

const STATIONS = [
  {
    icon: FileText,
    name: "Mimetype",
    body: "The first file in the archive must be a plain, uncompressed mimetype file that says application/epub+zip. Reading apps use it to recognise the book at all.",
  },
  {
    icon: Package,
    name: "Container",
    body: "META-INF/container.xml points to the package document. If it is missing or points to a file that does not exist, nothing else can be found.",
  },
  {
    icon: Fingerprint,
    name: "Metadata",
    body: "Title, language and a unique identifier. Stores and libraries use these to list and de-duplicate your book.",
  },
  {
    icon: ListTree,
    name: "Manifest",
    body: "Every file the book uses is declared here with a media type. Files that are declared but absent, or present but undeclared, are flagged.",
  },
  {
    icon: Route,
    name: "Spine",
    body: "The spine sets reading order. Each entry must refer to a manifest item, and the book needs at least one readable chapter.",
  },
  {
    icon: BookOpen,
    name: "Chapters",
    body: "Each chapter file is opened and parsed to confirm it is well-formed XHTML that a reader can render.",
  },
];

const MARKS = [
  {
    label: "Error",
    tone: "border-destructive/30 bg-destructive/10 text-destructive",
    body: "The book breaks the EPUB rules. Some apps will refuse to open it, and stores will reject it. Fix these first.",
  },
  {
    label: "Warning",
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    body: "The book opens, but something is likely to look wrong or behave oddly on some devices. Worth fixing before you publish.",
  },
  {
    label: "Info",
    tone: "border-border bg-secondary/60 text-muted-foreground",
    body: "A note about how the book is built. It does not need action, but it can explain why a reader behaves the way it does.",
  },
];

const FAQ = [
  {
    q: "Is my book uploaded anywhere?",
    a: "No. The file is opened and read inside your browser tab. Nothing is sent to a server, and closing the tab clears it.",
  },
  {
    q: "The Proof Desk says \"Ready to ship\". Is that enough?",
    a: "It means the structure is sound: the package, manifest, spine and chapters all agree with each other. Before you submit to a retailer, also run the W3C's official EPUBCheck, which tests far more rules than this page does. Think of this as a fast first proof, not the final sign-off.",
  },
  {
    q: "What are the most common errors?",
    a: "A manifest entry whose file is missing from the archive, a spine entry that points to nothing, a missing language or identifier in the metadata, and a mimetype file that was compressed when the book was zipped. Each message names the file involved so you can go straight to it.",
  },
  {
    q: "How do I fix what it finds?",
    a: "Open the book in the Editor, correct the chapter or metadata named in the message, and export again. Then drop the new file here to confirm the issue is gone. If the book was made in another tool, fix it there and re-export.",
  },
  {
    q: "What can't a structural check tell me?",
    a: "Whether your chapters are in the right order, whether images have useful descriptions, whether the text is readable at large sizes, or whether the cover looks good. Those need a person. Open the book in the Reading Room and page through it before you call it done.",
  },
];

type Filter = "all" | "error" | "warning" | "info";

const severityRank = { error: 0, warning: 1, info: 2 } as const;

export default function CheckPage() {
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [copied, setCopied] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    setError(null);
    setResult(null);
    setFilter("all");
    setFileName(file.name);

    try {
      const validation = await validateEpub(file);
      setResult(validation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to validate EPUB");
    } finally {
      setParsing(false);
    }
  }, []);

  const counts = useMemo(() => {
    const issues = result?.issues ?? [];
    return {
      error: issues.filter((i) => i.severity === "error").length,
      warning: issues.filter((i) => i.severity === "warning").length,
      info: issues.filter((i) => i.severity === "info").length,
    };
  }, [result]);

  const visibleIssues = useMemo(() => {
    const issues = [...(result?.issues ?? [])].sort(
      (a, b) => severityRank[a.severity] - severityRank[b.severity],
    );
    return filter === "all" ? issues : issues.filter((i) => i.severity === filter);
  }, [result, filter]);

  const buildReport = useCallback(() => {
    if (!result) return "";
    const lines = [
      `PageSmith proof report`,
      `File: ${fileName}`,
      `Verdict: ${result.valid ? "Ready to ship" : "Needs another pass"}`,
      `Errors: ${counts.error}  Warnings: ${counts.warning}  Info: ${counts.info}`,
      "",
      ...[...result.issues]
        .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
        .map(
          (i) =>
            `[${i.severity}] ${i.message}${i.file ? ` (${i.file})` : ""}`,
        ),
    ];
    return lines.join("\n");
  }, [result, fileName, counts]);

  const copyReport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildReport());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard can be blocked; the download button still works */
    }
  }, [buildReport]);

  const downloadReport = useCallback(() => {
    const blob = new Blob([buildReport()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName.replace(/\.epub$/i, "") || "book"}-proof-report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [buildReport, fileName]);

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: result?.issues.length ?? 0 },
    { key: "error", label: "Errors", count: counts.error },
    { key: "warning", label: "Warnings", count: counts.warning },
    { key: "info", label: "Info", count: counts.info },
  ];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 text-center">
        <h1 className="heading-lg">The Proof Desk</h1>
        <p className="body-md-loose mx-auto mt-3 max-w-2xl text-muted-foreground">
          Every book gets a proof before it is printed. Drop your EPUB here and
          we will read it station by station, then hand you a marked-up sheet
          of what to fix. Your file stays in this browser tab.
        </p>
      </header>

      <section aria-live="polite" className="mb-16">
        {parsing && (
          <Card className="items-center p-10 text-center">
            <Loader2 className="size-10 animate-spin text-brass" aria-hidden="true" />
            <p className="font-heading mt-4 text-lg">Pulling a proof…</p>
          </Card>
        )}

        {error && (
          <Card className="mb-6 border-destructive/30 bg-destructive/5 p-6">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
              <div>
                <p className="font-medium text-destructive">
                  This file couldn&apos;t be read as an EPUB
                </p>
                <p className="body-sm mt-1 text-destructive/80">{error}</p>
                <p className="body-sm mt-2 text-muted-foreground">
                  Check that it is a .epub file and not a renamed PDF or Word
                  document, then try again.
                </p>
              </div>
            </div>
          </Card>
        )}

        {result && !parsing && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {result.valid ? (
                    <CheckCircle2 className="size-6 shrink-0 text-brass" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="size-6 shrink-0 text-destructive" aria-hidden="true" />
                  )}
                  <div>
                    <p className="font-heading text-lg">
                      {result.valid ? "Ready to ship" : "Needs another pass"}
                    </p>
                    <p className="body-sm break-all text-muted-foreground">{fileName}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyReport}>
                    {copied ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      <Copy className="size-4" aria-hidden="true" />
                    )}
                    {copied ? "Copied" : "Copy report"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadReport}>
                    <Download className="size-4" aria-hidden="true" />
                    Save report
                  </Button>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter findings">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    role="tab"
                    aria-selected={filter === f.key}
                    onClick={() => setFilter(f.key)}
                    className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Badge
                      variant={
                        filter === f.key
                          ? f.key === "error"
                            ? "destructive"
                            : "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                    >
                      {f.label} · {f.count}
                    </Badge>
                  </button>
                ))}
              </div>

              {visibleIssues.length > 0 ? (
                <ul className="space-y-2">
                  {visibleIssues.map((issue, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-2 rounded-lg border p-2.5 text-sm ${
                        issue.severity === "error"
                          ? "border-destructive/30 bg-destructive/10 text-destructive"
                          : issue.severity === "warning"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "border-border bg-secondary/60 text-muted-foreground"
                      }`}
                    >
                      <span className="mt-0.5 w-16 shrink-0 text-xs font-semibold capitalize">
                        {issue.severity}
                      </span>
                      <span>
                        {issue.message}
                        {issue.file && (
                          <span className="code block opacity-70">{issue.file}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-brass">
                  {result.issues.length === 0
                    ? "A clean proof. Nothing to mark up — your EPUB is ready to ship."
                    : "Nothing in this category."}
                </p>
              )}
            </Card>

              <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => setResult(null)}>
                Proof another file
              </Button>
              <Link href="/editor" className="inline-flex items-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 px-4 py-2">
                Open the Editor to fix issues
              </Link>
            </div>
          </div>
        )}

        {!result && !parsing && (
          <FileDropZone
            accept=".epub"
            onFile={handleFile}
            label="Drop your EPUB file here"
          />
        )}
      </section>

      <section className="mb-16">
        <h2 className="heading-md mb-2">Six stations, in order</h2>
        <p className="body-md-loose mb-8 max-w-2xl text-muted-foreground">
          The Proof Desk reads your book the way a reading app would: it opens
          the archive, finds the package, and follows the spine chapter by
          chapter. If an early station fails, the later ones can&apos;t be
          trusted, so fix problems from the top down.
        </p>

        <ol className="relative space-y-6 border-l border-border pl-8">
          {STATIONS.map((s, idx) => (
            <li key={s.name} className="relative">
              <span
                className="absolute -left-[2.85rem] flex size-9 items-center justify-center rounded-full border border-border bg-background text-brass"
                aria-hidden="true"
              >
                <s.icon className="size-4" />
              </span>
              <h3 className="font-heading text-lg">
                <span className="mr-2 text-muted-foreground">{idx + 1}.</span>
                {s.name}
              </h3>
              <p className="body-sm mt-1 max-w-xl text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-16">
        <h2 className="heading-md mb-2">Reading your proof marks</h2>
        <p className="body-md-loose mb-6 max-w-2xl text-muted-foreground">
          Findings are sorted so the ones that matter most come first.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {MARKS.map((m) => (
            <div key={m.label} className={`rounded-lg border p-4 ${m.tone}`}>
              <p className="font-heading text-base">{m.label}</p>
              <p className="body-sm mt-1 opacity-90">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <Card className="p-6 sm:p-8">
          <h2 className="heading-md mb-2">A proof is not a final sign-off</h2>
          <p className="body-md-loose max-w-2xl text-muted-foreground">
            The Proof Desk checks that your book is built correctly. It can tell
            you a chapter is missing; it can&apos;t tell you the chapters are in
            the right order. It can&apos;t judge whether your cover is sharp,
            your images are described, or your text is comfortable to read.
            Those still need your eyes, and the official EPUBCheck is the
            reference to run before you send a book to a retailer.
          </p>
          <div className="mt-5">
            <Link href="/reader" className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
              Read it in the Reading Room
            </Link>
          </div>
        </Card>
      </section>

      <section className="mb-4">
        <h2 className="heading-md mb-4">Questions</h2>
        <div className="divide-y divide-border rounded-xl border border-border">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {item.q}
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="body-sm mt-3 max-w-2xl text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
