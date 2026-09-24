/**
 * Handoff for "drop anywhere" flows: a file dropped on the landing hero or
 * the convert hub is staged in memory, the user is routed to
 * /convert/[format], and that page consumes the staged file and parses it
 * immediately — no re-drop needed.
 *
 * In-memory (not sessionStorage): files are passed by reference, so there
 * is no ~5MB storage quota to blow on real-world manuscripts (a 25MB PDF
 * serializes to a ~34MB data URL and would fail staging entirely).
 * Trade-off: the staged file is lost on a full page reload — the format
 * page then falls back to its own dropzone, which already handles that.
 */
import type { SourceFormat } from "@/types/project";

const EXT_TO_FORMAT: Record<string, SourceFormat> = {
  pdf: "pdf",
  docx: "docx",
  md: "markdown",
  markdown: "markdown",
  html: "html",
  htm: "html",
  txt: "txt",
  epub: "epub",
};

export function detectFormatFromName(name: string): SourceFormat | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_FORMAT[ext] ?? null;
}

/** Stage a file for parsing on /convert/[format]; resolves with the target format. */
export function stageFileForConvert(file: File): Promise<SourceFormat | null> {
  const format = detectFormatFromName(file.name);
  if (!format) return Promise.resolve(null);
  staged = { file, format, projectName: file.name.replace(/\.[^.]+$/, "") };
  return Promise.resolve(format);
}

export interface StagedFile {
  file: File;
  format: SourceFormat;
  projectName: string;
}

// Module-level slot: same-tab router.push() navigation keeps this alive,
// and the File is passed by reference — no serialization, no quota.
let staged: StagedFile | null = null;

/** Read and clear the staged file. If `expectedFormat` is given, a staged
 * file for a *different* format is left intact (for that page) and null is
 * returned. */
export function consumeStagedFile(expectedFormat?: SourceFormat): StagedFile | null {
  if (!staged) return null;
  if (expectedFormat && staged.format !== expectedFormat) {
    return null;
  }
  const out = staged;
  staged = null;
  return out;
}

/** Drop the staged file without consuming it (e.g. user changed course). */
export function clearStagedFile(): void {
  staged = null;
}

export const ACCEPTED_DROP = ".pdf,.docx,.md,.markdown,.html,.htm,.txt,.epub";