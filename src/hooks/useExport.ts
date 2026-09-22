"use client";

import { useCallback } from "react";
import { buildEpub, downloadBlob } from "@/lib/epub/generate";
import { useProjectStore } from "@/lib/store/project";

export function useExport() {
  const { project } = useProjectStore();

  const exportEpub = useCallback(async () => {
    if (!project) {
      throw new Error("No project loaded");
    }
    if (project.chapters.length === 0) {
      throw new Error("No chapters to export");
    }

    const { blob, filename } = await buildEpub(project);
    downloadBlob(blob, filename);
    return { blob, filename };
  }, [project]);

  return { exportEpub, canExport: !!project && project.chapters.length > 0 };
}
