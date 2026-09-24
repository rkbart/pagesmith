"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useExport } from "@/hooks/useExport";
import { buildEpub } from "@/lib/epub/generate";
import { originalFileIfUnedited, setPendingCheckFile } from "@/lib/epub/proof-cache";
import { useProjectStore } from "@/lib/store/project";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  ClipboardCheck,
  Download,
  Library,
  List,
  Settings2,
  Sparkles,
  Loader2,
} from "lucide-react";

export function ExportBar({
  project,
  aiOpen = false,
  onToggleAI,
  metaOpen = false,
  onToggleMeta,
  chaptersOpen = false,
  onToggleChapters,
  chaptersCount = 0,
}: {
  project: { name: string; metadata: { title: string } };
  aiOpen?: boolean;
  onToggleAI: () => void;
  metaOpen?: boolean;
  onToggleMeta: () => void;
  chaptersOpen?: boolean;
  onToggleChapters?: () => void;
  chaptersCount?: number;
}) {
  const { exportEpub, canExport } = useExport();
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [proofing, setProofing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      await exportEpub();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function handleProof() {
    setProofing(true);
    setError(null);
    try {
      const project = useProjectStore.getState().project;
      if (!project) throw new Error("No book open to proof");
      if (project.chapters.length === 0) throw new Error("No chapters to proof");
      // Unedited since the Proof Desk shelved it? Send the original bytes
      // so the proof reproduces instead of a normalized rebuild. Otherwise
      // build the current state.
      const original = originalFileIfUnedited(project.id, project.updatedAt);
      if (original) {
        setPendingCheckFile(original, project.id);
      } else {
        const { blob, filename } = await buildEpub(project);
        setPendingCheckFile(
          new File([blob], filename, { type: "application/epub+zip" }),
          project.id
        );
      }
      router.push("/check");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send to the Proof Desk");
    } finally {
      setProofing(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-3 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 px-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/library"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Library className="size-4" aria-hidden="true" />
            All books
          </Link>
          <span className="text-muted-foreground/40" aria-hidden="true">
            /
          </span>
          <h1 className="font-heading min-w-0 truncate text-lg">
            {project.metadata.title || project.name}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onToggleChapters && (
            <Button
              variant={chaptersOpen ? "secondary" : "ghost"}
              size="sm"
              onClick={onToggleChapters}
              aria-expanded={chaptersOpen}
              className="lg:hidden"
            >
              <List className="h-4 w-4 mr-1" /> Chapters ({chaptersCount})
            </Button>
          )}
          <Button
            variant={metaOpen ? "secondary" : "ghost"}
            size="sm"
            onClick={onToggleMeta}
            aria-expanded={metaOpen}
            className={metaOpen ? undefined : "bg-background"}
          >
            <Settings2 className="h-4 w-4 mr-1" /> Metadata
          </Button>
          <Button
            variant={aiOpen ? "secondary" : "ghost"}
            size="sm"
            onClick={onToggleAI}
            aria-expanded={aiOpen}
            className={aiOpen ? undefined : "bg-background"}
          >
            <Sparkles className="h-4 w-4 mr-1" /> AI Tools
          </Button>

          <Link
            href="/read"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <BookOpen className="h-4 w-4 mr-1" /> Read
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleProof}
            disabled={!canExport || proofing}
            title="Build this book and proof it at the Proof Desk"
            className="bg-background"
          >
            {proofing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <ClipboardCheck className="h-4 w-4 mr-1" />
            )}
            Proof
          </Button>

          <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

          <Button variant="brass" size="sm" onClick={handleExport} disabled={!canExport || exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            Publish EPUB
          </Button>
        </div>
        {error && <p className="w-full px-2 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
