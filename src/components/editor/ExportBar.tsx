"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store/project";
import { useExport } from "@/hooks/useExport";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Settings2, Sparkles, Eye, Loader2 } from "lucide-react";
import { PreviewDialog } from "./PreviewDialog";

export function ExportBar({
  project,
  onToggleMeta,
  onToggleAI,
}: {
  project: { name: string; metadata: { title: string } };
  onToggleMeta: () => void;
  onToggleAI: () => void;
}) {
  const { exportEpub, canExport } = useExport();
  const [exporting, setExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
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
        <h1 className="font-heading min-w-0 truncate text-lg">
          {project.metadata.title || project.name}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onToggleMeta}>
            <Settings2 className="h-4 w-4 mr-1" /> Metadata
          </Button>
          <Button variant="outline" size="sm" onClick={onToggleAI}>
            <Sparkles className="h-4 w-4 mr-1" /> AI Tools
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4 mr-1" /> Preview
          </Button>

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
      <PreviewDialog open={showPreview} onOpenChange={setShowPreview} />
    </div>
  );
}
