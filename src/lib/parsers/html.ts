import type { ParseResult, Chapter, BookMetadata } from "@/types/project";
import { generateId } from "@/lib/utils/text";

export async function parseHTML(file: File): Promise<ParseResult> {
  const warnings: string[] = [];
  const rawHtml = await file.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");

  const metadata = extractMetadata(doc, file.name);

  // Remove unwanted elements
  const unwanted = doc.querySelectorAll(
    "script, style, nav, header, footer, aside, iframe, noscript, form, .ad, .ads, .advertisement, .sidebar, .comment, .comments"
  );
  unwanted.forEach((el) => el.remove());

  const chapters = splitIntoChapters(doc, warnings);

  return { chapters, metadata, warnings };
}

function extractMetadata(doc: Document, filename: string): Partial<BookMetadata> {
  const meta: Partial<BookMetadata> = {};

  const title =
    doc.querySelector("meta[property='og:title']")?.getAttribute("content") ||
    doc.querySelector("title")?.textContent?.trim() ||
    doc.querySelector("h1")?.textContent?.trim() ||
    filename.replace(/\.[^.]+$/, "");
  meta.title = title;

  const author =
    doc.querySelector("meta[name='author']")?.getAttribute("content") ||
    doc.querySelector("meta[property='article:author']")?.getAttribute("content") ||
    "";
  meta.author = author;

  const desc =
    doc.querySelector("meta[name='description']")?.getAttribute("content") ||
    doc.querySelector("meta[property='og:description']")?.getAttribute("content") ||
    "";
  meta.description = desc;

  return meta;
}

function splitIntoChapters(doc: Document, warnings: string[]): Chapter[] {
  const body = doc.body;
  const headings = Array.from(body.querySelectorAll("h1, h2"));

  if (headings.length === 0) {
    warnings.push("No headings detected — single chapter");
    cleanBody(body);
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

  // Content before first heading
  const firstHeading = headings[0];
  const beforeFrag = document.createDocumentFragment();
  let node = body.firstChild;
  while (node && node !== firstHeading) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as Element).tagName.toLowerCase();
      if (!["script", "style", "nav", "header", "footer"].includes(tag)) {
        beforeFrag.appendChild(node.cloneNode(true));
      }
    }
    node = node.nextSibling;
  }
  const beforeDiv = document.createElement("div");
  beforeDiv.appendChild(beforeFrag);
  const beforeHtml = beforeDiv.innerHTML.trim();
  if (beforeHtml && stripTags(beforeHtml).trim().length > 50) {
    chapters.push({
      id: generateId(),
      title: "Introduction",
      content: beforeHtml,
      order: order++,
      level: 1,
    });
  }

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = i + 1 < headings.length ? headings[i + 1] : null;
    const headingHtml = heading.outerHTML;
    const contentHtml = getContentBetween(body, heading, nextHeading);

    chapters.push({
      id: generateId(),
      title: heading.textContent?.trim() ?? `Chapter ${i + 1}`,
      content: headingHtml + "\n" + contentHtml,
      order: order++,
      level: parseInt(heading.tagName[1]) || 1,
    });
  }

  return chapters;
}

function getContentBetween(
  body: HTMLElement,
  startEl: Element,
  endEl: Element | null
): string {
  const frag = document.createDocumentFragment();
  let node = startEl.nextSibling;
  while (node && node !== endEl) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as Element).tagName.toLowerCase();
      if (!["script", "style", "nav", "header", "footer", "aside"].includes(tag)) {
        frag.appendChild(node.cloneNode(true));
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        const p = document.createElement("p");
        p.textContent = text;
        frag.appendChild(p);
      }
    }
    node = node.nextSibling;
  }
  const resultDiv = document.createElement("div");
  resultDiv.appendChild(frag);
  return resultDiv.innerHTML;
}

function cleanBody(body: HTMLElement) {
  const unwanted = body.querySelectorAll(
    "script, style, nav, header, footer, aside, iframe, noscript"
  );
  unwanted.forEach((el) => el.remove());
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}
