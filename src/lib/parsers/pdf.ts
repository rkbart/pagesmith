import type { ParseResult, Chapter, BookMetadata, BookCover } from "@/types/project";
import { generateId } from "@/lib/utils/text";

interface RawPage {
  pageNum: number;
  text: string;
  /** Visual lines (via pdf.js end-of-line marks) — chapter headings are
   *  matched against line starts, which survives wrapped titles. */
  lines: string[];
  /** Extracted illustrations as data URLs, in paint order. */
  images: ExtractedImage[];
}

interface ExtractedImage {
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
}

/** pdf.js operator codes for painting images (see pdfjs-dist OPS table). */
const PAINT_IMAGE_OPS = new Set([85, 86, 87, 88]);

/** Images smaller than this (either dimension) are usually bullets, rules
 *  or glyph fragments — not illustrations worth keeping. */
const MIN_IMAGE_DIM = 60;

/** Cap output resolution so a 300-page illustrated volume can't produce a
 *  gigabyte of PNG data URLs in memory. */
const MAX_IMAGE_DIM = 1600;

/** pixel formats in pdf.js image data (ImageKind table). */
const KIND_GRAY_1BPP = 1;
const KIND_RGB_24BPP = 2;
const KIND_RGBA_32BPP = 3;

export async function parsePDF(file: File): Promise<ParseResult> {
  const pdfjs = await import("pdfjs-dist");
  const warnings: string[] = [];

  // pdf.js renders in a Web Worker. The worker bundle is served locally
  // from /public (see public/pdf.worker.min.mjs, copied from the installed
  // pdfjs-dist version) so parsing works offline and stays version-pinned.
  // Without this, getDocument() throws:
  //   No "GlobalWorkerOptions.workerSrc" specified.
  if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const pages: RawPage[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.map((item) => ("str" in item ? item.str : ""));
    const text = items
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const lines = splitVisualLines(content.items);
    const images = await extractPageImages(pdfjs, page, i, warnings);
    pages.push({ pageNum: i, text, lines, images });
    // Release worker-side bitmaps and intents per page — without this a
    // multi-hundred-page volume accumulates every image in memory.
    page.cleanup();
  }

  const metadata = await extractPdfMetadata(pdf, warnings);
  const cover = extractCover(pages, warnings);
  const chapters = detectChapters(pages, warnings);

  return {
    chapters,
    metadata,
    cover,
    warnings,
  };
}

/**
 * Pull embedded illustrations off a page via the pdf.js operator list.
 * Never throws: a page whose images can't be decoded keeps its text and
 * records a warning — one bad image must not fail a 200-page import.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractPageImages(pdfjs: any, page: any, pageNum: number, warnings: string[]): Promise<ExtractedImage[]> {
  const images: ExtractedImage[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ops = await page.getOperatorList() as { fnArray: number[]; argsArray: any[] };
    const seen = new Set<string>();
    for (let i = 0; i < ops.fnArray.length; i++) {
      if (!PAINT_IMAGE_OPS.has(ops.fnArray[i])) continue;
      const ref = ops.argsArray[i]?.[0];
      // paint ops reference the image by object id; anything else (already
      // inlined data, repeat maps) is handled through the same lookup.
      if (typeof ref !== "string" || seen.has(ref)) continue;
      seen.add(ref);
      try {
        const dataUrl = await resolveImageDataUrl(pdfjs, page, ref);
        if (dataUrl) images.push(dataUrl);
      } catch {
        // Skip undecodable images silently — they are usually masks or
        // exotic colorspaces, not content illustrations.
      }
    }
  } catch {
    warnings.push(`Could not read images on page ${pageNum} — text was still imported.`);
  }
  return images;
}

/**
 * Wait for the worker to deliver an image object (it can lag the operator
 * list by a few messages), then encode it as a JPEG/PNG data URL.
 * Returns null for images not worth keeping (tiny ornaments, etc.).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveImageDataUrl(pdfjs: any, page: any, ref: string): Promise<ExtractedImage | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let img: any = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      img = page.objs.get(ref);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  if (!img || typeof img.width !== "number" || typeof img.height !== "number") return null;
  if (img.width < MIN_IMAGE_DIM || img.height < MIN_IMAGE_DIM) return null;

  const bitmap = await imageToBitmap(pdfjs, img);
  if (!bitmap) return null;

  const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, w, h);
  if (bitmap instanceof ImageBitmap) bitmap.close();

  // Large art compresses far better as JPEG; small graphics stay PNG to
  // avoid ringing on line art.
  const useJpeg = w * h > 300_000;
  return {
    dataUrl: canvas.toDataURL(useJpeg ? "image/jpeg" : "image/png", 0.85),
    mimeType: useJpeg ? "image/jpeg" : "image/png",
    width: w,
    height: h,
  };
}

/**
 * Normalize whatever pixel form pdf.js delivered (transferred ImageBitmap
 * in modern browsers, raw kind/data buffers otherwise) into a drawable
 * bitmap. Returns null when the format is unsupported.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function imageToBitmap(pdfjs: any, img: any): Promise<ImageBitmap | HTMLCanvasElement | null> {
  try {
    if (img.bitmap) {
      if (typeof createImageBitmap === "function" && !(img.bitmap instanceof ImageBitmap)) {
        return await createImageBitmap(img.bitmap);
      }
      return img.bitmap;
    }
    if (!img.data || typeof img.width !== "number") return null;
    const { width, height, kind, data } = img;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const out = ctx.createImageData(width, height);
    if (kind === KIND_RGBA_32BPP) {
      out.data.set(data.subarray(0, out.data.length));
    } else if (kind === KIND_RGB_24BPP) {
      for (let i = 0, j = 0; i + 2 < data.length && j + 3 < out.data.length; i += 3, j += 4) {
        out.data[j] = data[i];
        out.data[j + 1] = data[i + 1];
        out.data[j + 2] = data[i + 2];
        out.data[j + 3] = 255;
      }
    } else if (kind === KIND_GRAY_1BPP) {
      // 1 bit per pixel, rows padded to whole bytes.
      const rowBytes = Math.ceil(width / 8);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const byte = data[y * rowBytes + (x >> 3)];
          const bit = (byte >> (7 - (x & 7))) & 1;
          // PDF image samples: 0 = black … but 1BPP gray images in practice
          // render white-on-transparent masks; treat set bits as black.
          const v = bit ? 0 : 255;
          const j = (y * width + x) * 4;
          out.data[j] = v;
          out.data[j + 1] = v;
          out.data[j + 2] = v;
          out.data[j + 3] = 255;
        }
      }
    } else {
      void pdfjs;
      return null;
    }
    ctx.putImageData(out, 0, 0);
    return canvas;
  } catch {
    return null;
  }
}

/**
 * The first large image in the book is almost always the cover art
 * (volumes open with cover + color inserts before any text). Promote it
 * to the EPUB cover so the auto-built book gets a real cover image.
 */
function extractCover(pages: RawPage[], warnings: string[]): BookCover | undefined {
  for (const page of pages) {
    const idx = page.images.findIndex((img) => img.width >= 600 && img.height >= 600);
    if (idx >= 0) {
      const [cover] = page.images.splice(idx, 1);
      return { data: cover.dataUrl, mimeType: cover.mimeType };
    }
  }
  warnings.push("No cover image found in the PDF — the EPUB will be built without one.");
  return undefined;
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
    const candidates = page.lines.slice(0, 5);
    // A Table of Contents page matches chapter patterns on nearly every
    // line — never treat it as a source of chapter starts.
    const matchCount = page.lines.filter((line) => isChapterLine(line, chapterPatterns)).length;
    if (matchCount >= 3) continue;
    for (const line of candidates) {
      const title = chapterTitle(line, page, chapterPatterns);
      if (title) {
        chapterStarts.push({ pageNum: page.pageNum, title });
        break;
      }
    }
  }

  if (chapterStarts.length === 0) {
    warnings.push("No chapters detected — treating as single chapter. You can split manually.");
    const fullText = pages
      .filter((p) => p.text || p.images.length > 0)
      .map((p) => pageContent(p))
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
      .map((p) => pageContent(p))
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
  const introPages = pages.filter((p) => p.pageNum < firstChapterPage && (p.text || p.images.length > 0));
  if (introPages.length > 0) {
    const introContent = introPages.map((p) => pageContent(p)).join("\n");
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

/** Rebuild visual lines from text items using pdf.js end-of-line marks. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function splitVisualLines(items: any[]): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const item of items) {
    const s: string = "str" in item ? item.str : "";
    // NB: the end-of-line mark can ride on an empty item, so it must be
    // honored even when there is no text to append.
    if (s) {
      // pdf.js splits CJK text per glyph without spaces — only separate with
      // a space when both sides look like spaced script.
      const needsSpace = cur.length > 0 && !/\s$/.test(cur) && !/^\p{P}/u.test(s) && !/[\u3040-\u30ff\u4e00-\u9faf]$/.test(cur);
      cur += (needsSpace ? " " : "") + s;
    }
    if ("hasEOL" in item && (item as { hasEOL?: boolean }).hasEOL) {
      if (cur.trim()) lines.push(cur.trim());
      cur = "";
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

function isChapterLine(line: string, patterns: RegExp[]): boolean {
  const trimmed = line.trim();
  return trimmed.length > 3 && trimmed.length < 120 && patterns.some((p) => p.test(trimmed));
}

/**
 * A matched line becomes the chapter title. Numbered headings whose title
 * wraps onto the next visual line ("Chapter 2: Mining Helped Me Meet a" /
 * "New Friend!") are joined back together; bare keywords ("Prologue") are
 * left alone so body text is never glued to the title.
 */
function chapterTitle(line: string, page: RawPage, patterns: RegExp[]): string | null {
  const trimmed = line.trim();
  if (!isChapterLine(trimmed, patterns)) return null;
  const numbered = /^\s*(chapter|ch\.|part|section)\s+[\divxlc\d]+/i.test(trimmed);
  if (!numbered) return trimmed;
  const idx = page.lines.indexOf(line);
  const next = idx >= 0 ? (page.lines[idx + 1] ?? "").trim() : "";
  if (next && next.length < 80 && !isChapterLine(next, patterns) && `${trimmed} ${next}`.length <= 120) {
    return `${trimmed} ${next}`;
  }
  return trimmed;
}
/** One page's HTML: its text paragraphs followed by its illustrations. */
function pageContent(page: RawPage): string {
  const parts: string[] = [];
  if (page.text) parts.push(`<p>${escapeAndBreak(page.text)}</p>`);
  for (const img of page.images) {
    parts.push(
      `<p class="center"><img src="${img.dataUrl}" alt="Illustration (page ${page.pageNum})"/></p>`
    );
  }
  return parts.join("\n");
}

function escapeAndBreak(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\s{3,}/g, "</p>\n<p>");
}
