import type { ParseResult, Chapter, BookMetadata } from "@/types/project";
import { generateId } from "@/lib/utils/text";

interface RawPage {
  pageNum: number;
  text: string;
}

export async function parsePDF(file: File): Promise<ParseResult> {
  const pdfjs = await import("pdfjs-dist");
  const warnings: string[] = [];

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const pages: RawPage[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push({ pageNum: i, text });
  }

  const metadata = await extractPdfMetadata(pdf, warnings);
  const chapters = detectChapters(pages, warnings);

  return {
    chapters,
    metadata,
    warnings,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractPdfMetadata(pdf: any, warnings: string[]): Promise<Partial<BookMetadata>> {
  const meta: Partial<BookMetadata> = {};
  try {
    const info = await pdf.getMetadata();
    const dc = info.info as Record<string, string>;
    if (dc.Title) meta.title = dc.Title;
    if (dc.Author) meta.author = dc.Author;
    if (dc.Subject) meta.description = dc.Subject;
    if (!meta.title) warnings.push("Could not extract title from PDF metadata");
  } catch {
    warnings.push("Could not read PDF metadata");
  }
  return meta;
}

function detectChapters(pages: RawPage[], warnings: string[]): Chapter[] {
  const chapterPatterns = [
    /^\s*(chapter|ch\.|part|section)\s+[\divxlc]+/i,
    /^\s*(chapter|ch\.|part)\s+\d+/i,
    /^\s*(prologue|epilogue|introduction|preface|foreword|afterword|appendix|acknowledgments?)\b/i,
    /^\s*\d+\.\s+[A-Z]/,
    /^\s*[IVX]+\.\s+/,
  ];

  const chapterStarts: { pageNum: number; title: string }[] = [];

  for (const page of pages) {
    const lines = page.text.split(/(?<=\.)\s+/);
    for (const line of lines.slice(0, 3)) {
      const trimmed = line.trim();
      if (trimmed.length > 3 && trimmed.length < 100) {
        for (const pattern of chapterPatterns) {
          if (pattern.test(trimmed)) {
            chapterStarts.push({ pageNum: page.pageNum, title: trimmed });
            break;
          }
        }
      }
    }
  }

  if (chapterStarts.length === 0) {
    warnings.push("No chapters detected — treating as single chapter. You can split manually.");
    const fullText = pages
      .filter((p) => p.text)
      .map((p) => `<p>${escapeAndBreak(p.text)}</p>`)
      .join("\n");
    return [
      {
        id: generateId(),
        title: "Content",
        content: fullText,
        order: 0,
        level: 1,
      },
    ];
  }

  const chapters: Chapter[] = [];
  for (let i = 0; i < chapterStarts.length; i++) {
    const start = chapterStarts[i];
    const end = i + 1 < chapterStarts.length ? chapterStarts[i + 1].pageNum : pages[pages.length - 1].pageNum + 1;

    const chapterPages = pages.filter((p) => p.pageNum >= start.pageNum && p.pageNum < end);
    const content = chapterPages
      .map((p) => `<p>${escapeAndBreak(p.text)}</p>`)
      .join("\n");

    chapters.push({
      id: generateId(),
      title: start.title,
      content,
      order: i,
      level: 1,
    });
  }

  // Include any text before the first chapter
  const firstChapterPage = chapterStarts[0].pageNum;
  const introPages = pages.filter((p) => p.pageNum < firstChapterPage && p.text);
  if (introPages.length > 0) {
    const introContent = introPages.map((p) => `<p>${escapeAndBreak(p.text)}</p>`).join("\n");
    chapters.unshift({
      id: generateId(),
      title: "Introduction",
      content: introContent,
      order: 0,
      level: 1,
    });
    chapters.forEach((ch, i) => (ch.order = i));
  }

  if (chapterStarts.length < 2) {
    warnings.push(`Only detected ${chapterStarts.length} chapter. Review splits in the editor.`);
  }

  return chapters;
}

function escapeAndBreak(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\s{3,}/g, "</p>\n<p>");
}
