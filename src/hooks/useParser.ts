"use client";

import { useState, useCallback } from "react";
import type { SourceFormat, ParseResult } from "@/types/project";
import { parseFile, detectFormat } from "@/lib/parsers";
import { useProjectStore } from "@/lib/store/project";

export function useParser() {
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const { importChapters } = useProjectStore();

  const parse = useCallback(
    async (file: File, format?: SourceFormat) => {
      setParsing(true);
      setError(null);
      setResult(null);

      try {
        const fmt = format ?? detectFormat(file.name);
        if (!fmt) {
          throw new Error(`Unsupported file format: ${file.name}`);
        }

        const parseResult = await parseFile(file, fmt);
        setResult(parseResult);

        // Read the store at call time, not render time — callers may have
        // created the project moments before this runs (stale-closure safe).
        const state = useProjectStore.getState();
        if (state.project) {
          state.importChapters(parseResult.chapters, parseResult.metadata, parseResult.cover);
        } else {
          importChapters(parseResult.chapters, parseResult.metadata, parseResult.cover);
        }

        return parseResult;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to parse file";
        setError(msg);
        throw err;
      } finally {
        setParsing(false);
      }
    },
    [importChapters]
  );

  return { parsing, error, result, parse };
}
