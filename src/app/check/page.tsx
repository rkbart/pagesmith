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
    <div className="container px-4 sm:px-6 lg:px-8 py-12 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">EPUB Checker</h1>
        <p className="text-muted-foreground mt-2">
          Validate your EPUB file before publishing
        </p>
      </div>

      {parsing && (
        <Card className="p-8 text-center">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
          <p className="font-medium">Checking EPUB...</p>
        </Card>
      )}

      {error && (
        <Card className="p-6 border-red-300 bg-red-50 dark:bg-red-950/20 mb-6">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-700 dark:text-red-400">Failed to check EPUB</p>
              <p className="text-sm text-red-600 dark:text-red-400/80 mt-1">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {result && !parsing && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              {result.valid ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-500" />
              )}
              <div>
                <p className="font-semibold text-lg">
                  {result.valid ? "EPUB is Valid" : "EPUB Has Issues"}
                </p>
                <p className="text-sm text-muted-foreground">{fileName}</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <Badge variant={errorCount > 0 ? "destructive" : "outline"}>
                {errorCount} error{errorCount !== 1 ? "s" : ""}
              </Badge>
              <Badge variant={warningCount > 0 ? "default" : "outline"}>
                {warningCount} warning{warningCount !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="outline">{infoCount} info</Badge>
            </div>

            {result.issues.length > 0 ? (
              <div className="space-y-2">
                {result.issues.map((issue, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 text-sm p-2 rounded ${
                      issue.severity === "error"
                        ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400"
                        : issue.severity === "warning"
                          ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400"
                          : "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400"
                    }`}
                  >
                    <span className="font-medium uppercase text-xs shrink-0 mt-0.5">
                      {issue.severity}
                    </span>
                    <span>
                      {issue.message}
                      {issue.file && (
                        <span className="block text-xs opacity-70">{issue.file}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-green-600">No issues found! Your EPUB is ready.</p>
            )}
          </Card>

          <Button variant="outline" onClick={() => setResult(null)}>
            Check Another File
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
