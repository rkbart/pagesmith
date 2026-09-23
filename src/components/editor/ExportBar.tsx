"use client";

import { useState } from "react";
import { useExport } from "@/hooks/useExport";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Download,
  Library,
  Settings2,
  Sparkles,
  Loader2,
} from "lucide-react";

export function ExportBar({
  project,
  aiOpen = false,
  onToggleAI,
}: {
  project: { name: string; metadata: { title: string } };
  aiOpen?: boolean;
  onToggleAI: () => void;
}) {
  const { exportEpub, canExport } = useExport();
  const [exporting, setExporting] = useState(false);
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
          <Link
            href="/editor/metadata"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Settings2 className="h-4 w-4 mr-1" /> Metadata
          </Link>
          <Button
            variant={aiOpen ? "secondary" : "outline"}
            size="sm"
            onClick={onToggleAI}
            aria-expanded={aiOpen}
          >
            <Sparkles className="h-4 w-4 mr-1" /> AI Tools
          </Button>

          <Link
            href="/read"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <BookOpen className="h-4 w-4 mr-1" /> Read
          </Link>

          <Link href="/convert" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Import file
          </Link>

          <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

          <Button variant="brass" size="sm" onClick={handleExport} disabled={!canExport || exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            Export EPUB
          </Button>
        </div>
        {error && <p className="w-full px-2 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
