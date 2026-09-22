import type { ParseResult, Chapter, BookMetadata } from "@/types/project";
import { generateId } from "@/lib/utils/text";

export async function parseTXT(file: File): Promise<ParseResult> {
  const warnings: string[] = [];
  const text = await file.text();

  const metadata: Partial<BookMetadata> = {
    title: file.name.replace(/\.[^.]+$/, ""),
  };

  const chapters = detectChapters(text, warnings);

  return { chapters, metadata, warnings };
}

function detectChapters(text: string, warnings: string[]): Chapter[] {
  const lines = text.split("\n");
  const chapterStarts: { lineIndex: number; title: string; level: number }[] = [];

  const patterns: { regex: RegExp; level: number }[] = [
    { regex: new RegExp("^(part|book|volume)\\s+[\\divxlc]+", "i"), level: 1 },
    { regex: new RegExp("^(chapter|ch\\.?|section)\\s+[\\divxlc]+", "i"), level: 1 },
    { regex: new RegExp("^(chapter|ch\\.?|section)\\s+\\d+", "i"), level: 1 },
    { regex: new RegExp("^(prologue|epilogue|introduction|preface|foreword|afterword|appendix|acknowledgments?)\\s*$", "i"), level: 1 },
    { regex: new RegExp("^[IVX]+\\.\\s+\\S"), level: 2 },
    { regex: new RegExp("^\\d+\\.\\s+[A-Z]"), level: 2 },
    { regex: new RegExp("^#{1,3}\\s+\\S"), level: 1 },
  ];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.length > 100) continue;

    for (const { regex, level } of patterns) {
      if (regex.test(trimmed)) {
        const title = trimmed.replace(/^#+\s*/, "");
        chapterStarts.push({ lineIndex: i, title, level });
        break;
      }
    }
  }

  // Deduplicate close starts
  const filtered = chapterStarts.filter((start, i) => {
    if (i === 0) return true;
    return start.lineIndex - chapterStarts[i - 1].lineIndex > 5;
  });

  if (filtered.length === 0) {
    warnings.push("No chapter headings detected — single chapter");
    return [
      {
        id: generateId(),
        title: "Content",
        content: textToHtml(text),
        order: 0,
        level: 1,
      },
    ];
  }

  const chapters: Chapter[] = [];

  // Content before first chapter
  const introLines = lines.slice(0, filtered[0].lineIndex);
  const introText = introLines.join("\n").trim();
  if (introText && introText.replace(/\s/g, "").length > 50) {
    chapters.push({
      id: generateId(),
      title: "Introduction",
      content: textToHtml(introText),
      order: 0,
      level: 1,
    });
  }

  for (let i = 0; i < filtered.length; i++) {
    const start = filtered[i];
    const endLine = i + 1 < filtered.length ? filtered[i + 1].lineIndex : lines.length;
    const chapterLines = lines.slice(start.lineIndex + 1, endLine);
    const content = textToHtml(chapterLines.join("\n"));

    chapters.push({
      id: generateId(),
      title: start.title,
      content: `<h${Math.min(start.level + 1, 6)}>${escapeHtml(start.title)}</h${Math.min(start.level + 1, 6)}>\n${content}`,
      order: chapters.length,
      level: start.level,
    });
  }

  if (chapters.length < 2) {
    warnings.push("Only 1 chapter detected. You can split in the editor.");
  }

  return chapters;
}

function textToHtml(text: string): string {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p);

  return paragraphs
    .map((p) => {
      const escaped = escapeHtml(p).replace(/\n/g, "<br>");
      // Detect dialogue
      if (/^[""«»].*[""«»]$/m.test(p) && p.split("\n").length > 1) {
        return `<p class="dialogue">${escaped}</p>`;
      }
      return `<p>${escaped}</p>`;
    })
    .join("\n");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
