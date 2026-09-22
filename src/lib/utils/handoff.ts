/**
 * Handoff for "drop anywhere" flows: a file dropped on the landing hero or
 * the convert hub is staged in sessionStorage, the user is routed to
 * /convert/[format], and that page consumes the staged file and parses it
 * immediately — no re-drop needed.
 */
import type { SourceFormat } from "@/types/project";

const KEYS = {
  format: "pagesmith-pending-format",
  name: "pagesmith-pending-name",
  data: "pagesmith-pending-data",
} as const;

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

function dataUrlToFile(dataUrl: string, name: string): File {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta?.match(/:(.*?);/)?.[1] ?? "application/octet-stream";
  const binary = atob(base64 ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: mime });
}

/** Stage a file for parsing on /convert/[format]; resolves with the target format. */
export function stageFileForConvert(file: File): Promise<SourceFormat | null> {
  const format = detectFormatFromName(file.name);
  if (!format) return Promise.resolve(null);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      try {
        sessionStorage.setItem(KEYS.data, reader.result as string);
        sessionStorage.setItem(KEYS.name, file.name);
        sessionStorage.setItem(KEYS.format, format);
        resolve(format);
      } catch {
        resolve(null);
      }
    };
    reader.readAsDataURL(file);
  });
}

export interface StagedFile {
  file: File;
  format: SourceFormat;
  projectName: string;
}

/** Read and clear the staged file. If `expectedFormat` is given, a staged
 * file for a *different* format is left intact (for that page) and null is
 * returned. */
export function consumeStagedFile(expectedFormat?: SourceFormat): StagedFile | null {
  try {
    const format = sessionStorage.getItem(KEYS.format) as SourceFormat | null;
    const name = sessionStorage.getItem(KEYS.name);
    const data = sessionStorage.getItem(KEYS.data);
    if (!format || !name || !data) {
      clearStagedFile();
      return null;
    }
    if (expectedFormat && format !== expectedFormat) {
      return null;
    }
    clearStagedFile();
    return {
      file: dataUrlToFile(data, name),
      format,
      projectName: name.replace(/\.[^.]+$/, ""),
    };
  } catch {
    return null;
  }
}

/** Drop the staged file without consuming it (e.g. user changed course). */
export function clearStagedFile(): void {
  try {
    sessionStorage.removeItem(KEYS.format);
    sessionStorage.removeItem(KEYS.name);
    sessionStorage.removeItem(KEYS.data);
  } catch {
    // storage unavailable — nothing to clear
  }
}

export const ACCEPTED_DROP = ".pdf,.docx,.md,.markdown,.html,.htm,.txt,.epub";