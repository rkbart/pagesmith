"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Copy,
  Check,
  Download,
  FileText,
  Package,
  Fingerprint,
  ListTree,
  Route,
  BookOpen,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { validateEpub } from "@/lib/epub/validate";
import type { ValidationResult } from "@/types/epub";
import {
  clearCachedProof,
  clearProofForProject,
  getCachedProof,
  saveProofForProject,
  setCachedProof,
  takePendingCheckFile,
} from "@/lib/epub/proof-cache";
import { parseFile } from "@/lib/parsers";
import { useProjectStore } from "@/lib/store/project";
import { FileDropZone } from "@/components/converter/FileDropZone";

// Legacy sessionStorage keys from an earlier persistence attempt. A proof
// restored after a refresh is unverifiable (the on-disk file may be gone),
// so proofs now live in memory only. Clear any leftovers once per mount.
const LEGACY_PROOF_KEYS = [
  "pagesmith-proof-result",
  "pagesmith-proof-filename",
  "pagesmith-proof-time",
];

function clearLegacyProof() {
  try {
    for (const key of LEGACY_PROOF_KEYS) sessionStorage.removeItem(key);
  } catch {
    /* unavailable */
  }
}

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

type Filter = "all" | "error" | "warning" | "info";

const severityRank = { error: 0, warning: 1, info: 2 } as const;

export default function CheckPage() {
  const router = useRouter();
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [copied, setCopied] = useState(false);
  const [proofTimestamp, setProofTimestamp] = useState<number | null>(null);
  const [importedProjectId, setImportedProjectId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  // True only when the visible proof was restored from the in-memory cache
  // (back-navigation). A freshly dropped file is never "stale".
  const [proofRestored, setProofRestored] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore the in-memory proof on mount (survives back-navigation within
  // the session; a full refresh starts with an empty module, so the proof
  // is naturally cleared). Also sweep legacy sessionStorage leftovers.
  useEffect(() => {
    clearLegacyProof();
    const saved = getCachedProof();
    if (saved) {
      setResult(saved.result);
      setFileName(saved.fileName);
      setProofTimestamp(saved.timestamp);
      setImportedProjectId(saved.projectId);
      setProofRestored(true);
    }
  }, []);

  const handleFile = useCallback(async (file: File, opts?: { sourceProjectId?: string | null }) => {
    setParsing(true);
    setError(null);
    setImportError(null);
    setResult(null);
    setFilter("all");
    setFileName(file.name);
    setProofTimestamp(null);
    setImportedProjectId(null);
    setProofRestored(false);
    clearCachedProof();

    try {
      const validation = await validateEpub(file);
      setResult(validation);

      // Shelve a copy in the library so "Open Studio" opens this exact
      // book — unless this came from the Studio's Proof button, whose
      // book is already shelved and autosaved (re-shelving would just
      // stack up duplicates). A broken archive can still proof but may
      // have nothing readable to shelve — the proof stays regardless.
      let projectId: string | null = null;
      const store = useProjectStore.getState();
      if (
        opts?.sourceProjectId &&
        store.projects.some((p) => p.id === opts.sourceProjectId)
      ) {
        projectId = opts.sourceProjectId;
      } else {
        try {
          const parsed = await parseFile(file, "epub");
          if (parsed.chapters.length > 0) {
            const metadata = Object.fromEntries(
              Object.entries(parsed.metadata).filter(
                ([, value]) => value !== "" && value != null
              )
            );
            const fallback = file.name.replace(/\.epub$/i, "").trim();
            const name = (parsed.metadata.title || fallback || "Imported Book").trim();
            store.createProject(name);
            store.importChapters(parsed.chapters, metadata, parsed.cover);
            projectId = useProjectStore.getState().project?.id ?? null;
          } else {
            setImportError(
              "That EPUB has no readable chapters to shelve — the proof above still stands, but nothing was saved to the library."
            );
          }
        } catch (err) {
          setImportError(
            `Could not shelve this EPUB in the library (${
              err instanceof Error ? err.message : "unknown error"
            }). The proof above still stands.`
          );
        }
      }

      const timestamp = Date.now();
      setProofTimestamp(timestamp);
      setImportedProjectId(projectId);
      setCachedProof({ result: validation, fileName: file.name, projectId, timestamp, originalFile: file });
      // Persist per book so the Studio banner survives a refresh. The
      // Proof Desk itself never reads this back — a refresh starts empty.
      if (projectId) saveProofForProject(projectId, validation, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to validate EPUB");
    } finally {
      setParsing(false);
    }
  }, []);

  // Handoff from the Studio's "send to Proof Desk": EPUB bytes plus the
  // shelved project they belong to, proofed like a fresh drop.
  useEffect(() => {
    const pending = takePendingCheckFile();
    if (pending) void handleFile(pending.file, { sourceProjectId: pending.sourceProjectId });
  }, [handleFile]);

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
        .flatMap((i) => {
          const head = `[${i.severity}] ${i.message}${i.file ? ` (${i.file})` : ""}`;
          return i.fix ? [head, `  Fix: ${i.fix}`] : [head];
        }),
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

  const goToEditor = useCallback(() => {
    if (!result) return;
    // Open the exact copy shelved from this drop. If it was deleted from
    // the library meanwhile, warn and clear instead of opening some other
    // book.
    if (importedProjectId) {
      const store = useProjectStore.getState();
      const stillThere = store.projects.some((p) => p.id === importedProjectId);
      if (!stillThere) {
        setResult(null);
        setFileName("");
        setError(
          "The shelved copy of this book is gone from the library, so the proof was cleared. Drop the file again to re-proof it."
        );
        setFilter("all");
        setProofTimestamp(null);
        setImportedProjectId(null);
        setImportError(null);
        setProofRestored(false);
        clearCachedProof();
        clearProofForProject(importedProjectId);
        return;
      }
      store.loadProject(importedProjectId);
    }
    // Encode issues summary so the editor can point to them
    const summary = JSON.stringify({
      errors: counts.error,
      warnings: counts.warning,
      info: counts.info,
    });
    router.push(`/editor?proof=${encodeURIComponent(summary)}`);
  }, [result, counts, importedProjectId, router]);

  const clearProofAndReset = useCallback(() => {
    if (importedProjectId) clearProofForProject(importedProjectId);
    setResult(null);
    setFileName("");
    setError(null);
    setImportError(null);
    setFilter("all");
    setProofTimestamp(null);
    setImportedProjectId(null);
    setProofRestored(false);
    clearCachedProof();
  }, [importedProjectId]);

  const timeAgo = useMemo(() => {
    if (!proofTimestamp) return null;
    const seconds = Math.floor((Date.now() - proofTimestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }, [proofTimestamp]);

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
        <input
          ref={fileInputRef}
          type="file"
          accept=".epub,application/epub+zip"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) void handleFile(picked);
            e.target.value = "";
          }}
        />
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
            {proofRestored && timeAgo && (
              <Card className="mb-4 border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-heading text-sm text-amber-800 dark:text-amber-300">
                      This proof is from {timeAgo}
                    </p>
                    <p className="body-sm text-amber-700 dark:text-amber-400">
                      The file may have been deleted or changed. Results may
                      be stale.
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Re-check file
                    </Button>
                    <Button variant="destructive" size="sm" onClick={clearProofAndReset}>
                      Clear proof
                    </Button>
                  </div>
                </div>
              </Card>
            )}
            {importError && (
              <Card className="mb-4 border-amber-500/30 bg-amber-500/5 p-4">
                <p className="body-sm text-amber-700 dark:text-amber-400">{importError}</p>
              </Card>
            )}
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
                        {issue.fix && (
                          <span className="mt-1 block text-xs opacity-90">
                            <span className="font-semibold">How to fix: </span>
                            {issue.fix}
                          </span>
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
              {proofRestored && timeAgo && (
                <span className="text-xs text-muted-foreground">
                  Proof from {timeAgo}
                </span>
              )}
              {importedProjectId && (
                <span className="text-xs text-muted-foreground">
                  Shelved in your library — Studio opens this copy.
                </span>
              )}
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                Proof another file
              </Button>
              <button
                className={buttonVariants({ variant: "brass", size: "sm" })}
                onClick={goToEditor}
              >
                Open Studio to fix issues
              </button>
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STATIONS.map((s, idx) => (
            <Card key={s.name} className="p-5">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brass/10">
                  <s.icon className="size-5 text-brass" aria-hidden="true" />
                </div>
                <h3 className="heading-sm">
                  <span className="mr-1.5 text-muted-foreground">{idx + 1}.</span>
                  {s.name}
                </h3>
              </div>
              <p className="body-sm mt-3 text-muted-foreground">{s.body}</p>
            </Card>
          ))}
        </div>
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
            <Link href="/library" className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
              Go to the library
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
