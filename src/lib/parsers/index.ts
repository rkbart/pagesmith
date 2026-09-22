import type { SourceFormat, ParseResult } from "@/types/project";
import { parsePDF } from "./pdf";
import { parseDOCX } from "./docx";
import { parseMarkdown } from "./markdown";
import { parseHTML } from "./html";
import { parseTXT } from "./txt";
import { parseEPUB } from "./epub";

export async function parseFile(file: File, format: SourceFormat): Promise<ParseResult> {
  switch (format) {
    case "pdf":
      return parsePDF(file);
    case "docx":
      return parseDOCX(file);
    case "markdown":
      return parseMarkdown(file);
    case "html":
      return parseHTML(file);
    case "txt":
      return parseTXT(file);
    case "epub":
      return parseEPUB(file);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

export function detectFormat(filename: string): SourceFormat | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, SourceFormat> = {
    pdf: "pdf",
    docx: "docx",
    md: "markdown",
    markdown: "markdown",
    html: "html",
    htm: "html",
    txt: "txt",
    epub: "epub",
  };
  return ext ? (map[ext] ?? null) : null;
}
