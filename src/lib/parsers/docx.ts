import type { ParseResult, Chapter, BookMetadata } from "@/types/project";
import { generateId } from "@/lib/utils/text";

export async function parseDOCX(file: File): Promise<ParseResult> {
  const mammoth = (await import("mammoth/mammoth.browser")).default;
  const warnings: string[] = [];

  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
      ],
    }
  );

  const html = result.value;
  const messages = result.messages;
  if (messages.length > 0) {
    warnings.push(`${messages.length} DOCX messages during conversion`);
  }

  const metadata = extractMetadataFromFilename(file.name);
  const chapters = splitHtmlIntoChapters(html, warnings);

  return { chapters, metadata, warnings };
}

function extractMetadataFromFilename(filename: string): Partial<BookMetadata> {
  const name = filename.replace(/\.[^.]+$/, "");
  return { title: name };
}

function splitHtmlIntoChapters(html: string, warnings: string[]): Chapter[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const body = doc.body;

  const headings = Array.from(body.querySelectorAll("h1, h2"));

  if (headings.length === 0) {
    warnings.push("No headings found — treating as single chapter");
    return [
      {
        id: generateId(),
        title: "Content",
        content: body.innerHTML,
        order: 0,
        level: 1,
      },
    ];
  }

  const chapters: Chapter[] = [];
  let order = 0;

  // Content before the first heading
  const firstHeading = headings[0];
  const beforeContent = getSiblingContent(body, null, firstHeading);
  if (beforeContent.trim()) {
    chapters.push({
      id: generateId(),
      title: "Introduction",
      content: beforeContent,
      order: order++,
      level: 1,
    });
  }

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = i + 1 < headings.length ? headings[i + 1] : null;

    const headingHtml = heading.outerHTML;
    const contentHtml = getSiblingContent(body, heading, nextHeading);

    chapters.push({
      id: generateId(),
      title: heading.textContent?.trim() ?? `Chapter ${i + 1}`,
      content: headingHtml + "\n" + contentHtml,
      order: order++,
      level: parseInt(heading.tagName[1]) || 1,
    });
  }

  if (chapters.length < 2) {
    warnings.push("Only 1 chapter detected. You can split in the editor.");
  }

  return chapters;
}

function getSiblingContent(
  body: HTMLElement,
  startEl: Element | null,
  endEl: Element | null
): string {
  const parts: string[] = [];
  let current = startEl ? startEl.nextSibling : body.firstChild;

  while (current) {
    if (current === endEl) break;
    if (current.nodeType === Node.ELEMENT_NODE) {
      parts.push((current as Element).outerHTML);
    } else if (current.nodeType === Node.TEXT_NODE) {
      const text = current.textContent?.trim();
      if (text) parts.push(`<p>${text}</p>`);
    }
    current = current.nextSibling;
  }

  return parts.join("\n");
}
