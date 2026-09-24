"use client";

import { useState, useCallback } from "react";
import { FileUp, Loader2, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { validateEpub } from "@/lib/epub/validate";
import type { ValidationResult } from "@/types/epub";
import { FileDropZone } from "@/components/converter/FileDropZone";

export default function CheckPage() {
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    setError(null);
    setResult(null);
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

  const errorCount = result?.issues.filter((i) => i.severity === "error").length ?? 0;
  const warningCount = result?.issues.filter((i) => i.severity === "warning").length ?? 0;
  const infoCount = result?.issues.filter((i) => i.severity === "info").length ?? 0;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <p className="eyebrow mb-2">The inspector</p>
        <h1 className="heading-lg">EPUB Checker</h1>
<p className="body-md-loose mt-2 text-muted-foreground">
  Press-check your EPUB before it goes out into the world.
  Drop a file to validate its structure — mimetype, container, metadata, manifest, spine, and chapter integrity — all checked client-side, nothing uploaded.
</p>
      </div>

      {parsing && (
        <Card className="items-center p-10 text-center">
          <Loader2 className="size-10 animate-spin text-brass" aria-hidden="true" />
          <p className="font-heading mt-4 text-lg">Inspecting your EPUB…</p>
        </Card>
      )}

      {error && (
        <Card className="mb-6 border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <p className="font-medium text-destructive">Couldn&apos;t inspect this file</p>
              <p className="body-sm mt-1 text-destructive/80">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {result && !parsing && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-3">
              {result.valid ? (
                <CheckCircle2 className="size-6 shrink-0 text-brass" aria-hidden="true" />
              ) : (
                <AlertCircle className="size-6 shrink-0 text-destructive" aria-hidden="true" />
              )}
              <div>
                <p className="font-heading text-lg">
                  {result.valid ? "Ready to ship" : "Needs another pass"}
                </p>
                <p className="body-sm text-muted-foreground">{fileName}</p>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant={errorCount > 0 ? "destructive" : "outline"}>
                {errorCount} error{errorCount !== 1 ? "s" : ""}
              </Badge>
              <Badge variant={warningCount > 0 ? "secondary" : "outline"}>
                {warningCount} warning{warningCount !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="outline">{infoCount} info</Badge>
            </div>

            {result.issues.length > 0 ? (
              <div className="space-y-2">
                {result.issues.map((issue, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 rounded-lg border p-2.5 text-sm ${
                      issue.severity === "error"
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : issue.severity === "warning"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "border-border bg-secondary/60 text-muted-foreground"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0 text-xs font-semibold uppercase">
                      {issue.severity}
                    </span>
                    <span>
                      {issue.message}
                      {issue.file && (
                        <span className="code block opacity-70">{issue.file}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-brass">
                No issues found — your EPUB is ready to ship.
              </p>
            )}
          </Card>

          <Button variant="outline" onClick={() => setResult(null)}>
            Inspect another file
          </Button>
        </div>
      )}

      {!result && !parsing && (
        <FileDropZone
          accept=".epub"
          onFile={handleFile}
          label="Drop your EPUB file here"
        />
      )}
    </div>
  );
}
