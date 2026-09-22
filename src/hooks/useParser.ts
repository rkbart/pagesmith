"use client";

import { useState, useCallback } from "react";
import type { SourceFormat, ParseResult } from "@/types/project";
import { parseFile, detectFormat } from "@/lib/parsers";
import { useProjectStore } from "@/lib/store/project";

export function useParser() {
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const { importChapters, setMetadata, setCover, project } = useProjectStore();

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

        if (project) {
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
    [importChapters, project]
  );

  return { parsing, error, result, parse };
}
