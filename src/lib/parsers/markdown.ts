import type { ParseResult, Chapter, BookMetadata } from "@/types/project";
import { generateId } from "@/lib/utils/text";

export async function parseMarkdown(file: File): Promise<ParseResult> {
  const marked = await import("marked");
  const warnings: string[] = [];

  const text = await file.text();
  const { frontmatter, body } = extractFrontmatter(text);
  const metadata = buildMetadata(frontmatter, file.name);

  const chapters = splitMarkdownIntoChapters(body, marked);

  if (chapters.length < 2) {
    warnings.push("No chapter headings found — treating as single chapter");
  }

  return { chapters, metadata, warnings };
}

function extractFrontmatter(text: string): { frontmatter: Record<string, string>; body: string } {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: text };

  const fmBlock = match[1];
  const body = match[2];

  const frontmatter: Record<string, string> = {};
  for (const line of fmBlock.split("\n")) {
    const kv = line.match(/^(\w[\w\s-]*):\s*(.+)$/);
    if (kv) {
      frontmatter[kv[1].trim().toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, "");
    }
  }

  return { frontmatter, body };
}

function buildMetadata(fm: Record<string, string>, filename: string): Partial<BookMetadata> {
  return {
    title: fm.title ?? fm.book_title ?? filename.replace(/\.[^.]+$/, ""),
    author: fm.author ?? fm.creator ?? "",
    description: fm.description ?? fm.summary ?? "",
    language: fm.language ?? fm.lang ?? "en",
    isbn: fm.isbn,
    publisher: fm.publisher,
    subject: fm.subject ?? fm.tags,
  };
}

function splitMarkdownIntoChapters(
  text: string,
  marked: typeof import("marked")
): Chapter[] {
  const lines = text.split("\n");
  const chapters: Chapter[] = [];
  let currentTitle = "Introduction";
  let currentLines: string[] = [];
  let order = 0;
  let level = 1;

  const headingRegex = /^(#{1,3})\s+(.+)$/;

  function flushChapter() {
    if (currentLines.length === 0 && chapters.length > 0) return;
    const content = marked.parse(currentLines.join("\n"));
    if (typeof content === "string" && content.trim()) {
      chapters.push({
        id: generateId(),
        title: currentTitle,
        content,
        order: order++,
        level,
      });
    }
  }

  for (const line of lines) {
    const match = line.match(headingRegex);
    if (match) {
      const hLevel = match[1].length;
      const hText = match[2].trim();

      if (chapters.length > 0 || currentLines.length > 0) {
        flushChapter();
        currentLines = [];
      }

      currentTitle = hText;
      level = Math.min(hLevel, 3);
      currentLines.push(line);
    } else {
      currentLines.push(line);
    }
  }

  flushChapter();

  // If only one chapter and it has a non-content title, rename it
  if (chapters.length === 1 && chapters[0].title === "Introduction") {
    const hasContent = chapters[0].content.replace(/<[^>]+>/g, "").trim().length > 0;
    if (!hasContent) {
      chapters[0].title = "Content";
    }
  }

  return chapters;
}
