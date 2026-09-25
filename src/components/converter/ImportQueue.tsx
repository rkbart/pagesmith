"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SourceFormat } from "@/types/project";

export type QueueStatus = "queued" | "parsing" | "done" | "error";

export interface QueueItem {
  id: string;
  file: File;
  format: SourceFormat | null;
  status: QueueStatus;
  chapters?: number;
  warnings?: string[];
  error?: string;
}

export function ImportQueue({
  items,
  onOpen,
  onReset,
}: {
  items: QueueItem[];
  onOpen: () => void;
  onReset: () => void;
}) {
  const processing = items.some(
    (item) => item.status === "queued" || item.status === "parsing"
  );
  const boundChapters = items
    .filter((item) => item.status === "done")
    .reduce((sum, item) => sum + (item.chapters ?? 0), 0);
  const failed = items.filter((item) => item.status === "error").length;

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {processing ? (
            <Loader2 className="size-5 animate-spin text-brass" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-5 text-brass" aria-hidden="true" />
          )}
          <h2 className="font-heading text-lg">
            {processing ? "Binding your manuscripts…" : "The press is done"}
          </h2>
        </div>
        <p className="code shrink-0 text-muted-foreground">
          {items.length} file{items.length !== 1 ? "s" : ""} · {boundChapters} ch.
        </p>
      </div>

      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
            {item.status === "queued" && (
              <Clock className="size-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
            )}
            {item.status === "parsing" && (
              <Loader2 className="size-4 shrink-0 animate-spin text-brass" aria-hidden="true" />
            )}
            {item.status === "done" && (
              <CheckCircle2 className="size-4 shrink-0 text-brass" aria-hidden="true" />
            )}
            {item.status === "error" && (
              <XCircle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.file.name}</p>
              {item.status === "error" && item.error && (
                <p className="mt-0.5 text-xs text-destructive">{item.error}</p>
              )}
              {item.warnings && item.warnings.length > 0 && (
                <p className="mt-0.5 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 truncate">{item.warnings[0]}</span>
                  {item.warnings.length > 1 && (
                    <span className="shrink-0">+{item.warnings.length - 1} more</span>
                  )}
                </p>
              )}
            </div>

            {item.format && (
              <span className="code shrink-0 rounded-md bg-muted px-2 py-1 uppercase text-muted-foreground">
                {item.format}
              </span>
            )}
            {item.status !== "parsing" && (
              <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                {item.status === "queued" && "Queued"}
                {item.status === "done" && `${item.chapters ?? 0} ch.`}
                {item.status === "error" && "Failed"}
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center">
        {processing ? (
          <Button variant="outline" onClick={onReset} className="w-full sm:w-auto">
            Cancel
          </Button>
        ) : (
          <>
            <Button
              variant="brass"
              onClick={onOpen}
              disabled={boundChapters === 0}
              className="w-full sm:w-auto"
            >
              Open in the Forge
            </Button>
            <Button variant="outline" onClick={onReset} className="w-full sm:w-auto">
              Start over
            </Button>
            {failed > 0 && (
              <p className="text-sm text-muted-foreground sm:ml-auto">
                {failed} file{failed !== 1 ? "s" : ""} skipped — the rest were bound into your book.
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
