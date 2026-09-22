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
    <div className="flex flex-wrap items-center gap-2">
      <div className="mr-auto">
        <h1 className="text-xl font-bold">{project.metadata.title || project.name}</h1>
      </div>

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
        Convert File
      </Link>

      <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

      <Button size="sm" onClick={handleExport} disabled={!canExport || exporting}>
        {exporting ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-1" />
        )}
        Export EPUB
      </Button>

      {error && <p className="text-sm text-red-500 w-full">{error}</p>}

      <PreviewDialog open={showPreview} onOpenChange={setShowPreview} />
    </div>
  );
}
