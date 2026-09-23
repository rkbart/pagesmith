import type { ParseResult, BookMetadata, BookCover } from "@/types/project";
import { generateId } from "@/lib/utils/text";
import {
  formatBytes,
  perfEnabled,
  perfLog,
  perfMeasure,
} from "@/lib/utils/perf";
import type JSZip from "jszip";

/**
 * EPUB import: unzip, follow the OPF spine, and inline every referenced
 * resource (images, stylesheets) as a data URL so chapters render standalone
 * in the reader/editor — no external files, no broken links.
 *
 * Each spine item is split at top-level headings into sub-chapters when it
 * contains more than one (many EPUBs pack a whole book into a few XHTML
 * files).
 */

const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".avif"];

function mimeForImage(href: string, declared?: string): string {
  if (declared?.startsWith("image/")) return declared;
  const lower = href.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".bmp")) return "image/bmp";
  if (lower.endsWith(".avif")) return "image/avif";
  return "image/jpeg";
}

/** `base + relative` with `.`/`..`/fragment/query/leading-slash handling. */
export function resolveEpubPath(base: string, relative: string): string {
  const rel = relative.split("#")[0].split("?")[0];
  if (!rel) return "";
  if (rel.startsWith("/")) return rel.substring(1);
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rel)) return rel; // absolute URL
  const parts = (base + rel).split("/");
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "..") {
      resolved.pop();
    } else if (part !== "." && part !== "") {
      resolved.push(part);
    }
  }
  return resolved.join("/");
}

/** Directory prefix of a zip path, including the trailing slash (or ""). */
function dirOf(path: string): string {
  return path.includes("/") ? path.substring(0, path.lastIndexOf("/") + 1) : "";
}


export async function parseEPUB(file: File): Promise<ParseResult> {
  const t0 = performance.now();
  const warnings: string[] = [];
  const JSZip = (await import("jszip")).default;

  // One cache per import: covers, logos, and ornaments are routinely reused
  // across spine files — without this each reuse is re-decoded, re-encoded
  // to base64, and stored again. Promises (not values) are cached so
  // concurrent requests for the same path share one zip read.
  const imgCache = new Map<string, Promise<string | null>>();
  let imgHits = 0;

  const arrayBuffer = await file.arrayBuffer();
  const tUnzip = performance.now();
  const zip = await JSZip.loadAsync(arrayBuffer);
  perfMeasure("epub unzip", tUnzip);

  const opfPath = await findOpfPath(zip);
  if (!opfPath) {
    throw new Error("Could not find OPF file in EPUB");
  }

  const opfContent = await zip.file(opfPath)?.async("string");
  if (!opfContent) {
    throw new Error("Could not read OPF file");
  }

  const parser = new DOMParser();
  const opfDoc = parser.parseFromString(opfContent, "application/xml");
  const opfDir = dirOf(opfPath);

  const metadata = extractEpubMetadata(opfDoc);
  const manifest = extractManifest(opfDoc);
  const spine = extractSpine(opfDoc, manifest);
  const tCover = performance.now();
  const cover = await extractCover(zip, manifest, opfPath, imgCache);
  perfMeasure("epub cover extract", tCover);

  const chapters: { id: string; title: string; content: string; order: number; level: number; source: string }[] = [];
  let order = 0;
  let maxChapterBytes = 0;
  const push = (title: string, content: string, source: string) => {
    if (!content.trim()) return;
    chapters.push({ id: generateId(), title, content, order: order++, level: 1, source });
  };

  for (const item of spine) {
    const lower = item.href.toLowerCase();
    const isXhtml =
      lower.endsWith(".xhtml") || lower.endsWith(".html") || lower.endsWith(".htm");
    if (!isXhtml) continue;

    const fullPath = resolveEpubPath(opfDir, item.href);
    const fileContent = await zip.file(fullPath)?.async("string");
    if (!fileContent) {
      warnings.push(`Could not read chapter file: ${item.href}`);
      continue;
    }

    const tChapter = performance.now();
    const chapDoc = parser.parseFromString(fileContent, "application/xhtml+xml");
    const baseDir = dirOf(fullPath);

    // Inline images/styles into self-contained HTML, then split at headings.
    const { imgCount, imgBytes } = await inlineResources(
      chapDoc,
      zip,
      baseDir,
      warnings,
      imgCache,
      () => {
        imgHits += 1;
      }
    );
    const fallbackTitle = extractChapterTitle(chapDoc);
    const parts = splitAtHeadings(chapDoc, fallbackTitle);
    if (parts.length === 0) {
      warnings.push(`No readable content in: ${item.href}`);
      continue;
    }
    let chapterBytes = 0;
    for (const part of parts) {
      chapterBytes += part.html.length;
      push(part.title, part.html, item.href);
    }
    maxChapterBytes = Math.max(maxChapterBytes, chapterBytes);
    if (perfEnabled()) {
      perfLog("epub chapter", {
        file: item.href,
        parts: parts.length,
        html: formatBytes(chapterBytes),
        imgs: imgCount,
        imgBytes: formatBytes(imgBytes),
        ms: Math.round((performance.now() - tChapter) * 10) / 10,
      });
    }
  }

  if (chapters.length === 0) {
    warnings.push("No chapters found in EPUB");
  }

  if (perfEnabled()) {
    let uniqueImgBytes = 0;
    for (const p of imgCache.values()) {
      const url = await p;
      if (url) uniqueImgBytes += url.length;
    }
    perfLog("epub import summary", {
      file: file.name,
      chapters: chapters.length,
      maxChapter: formatBytes(maxChapterBytes),
      uniqueImgs: imgCache.size,
      uniqueImgBytes: formatBytes(uniqueImgBytes),
      cacheHits: imgHits,
      ms: Math.round((performance.now() - t0) * 10) / 10,
    });
  }

  return { chapters, metadata, cover, warnings };
}

async function findOpfPath(zip: JSZip): Promise<string | null> {
  const containerFile = zip.file("META-INF/container.xml");
  if (containerFile) {
    const containerXml = await containerFile.async("string");
    const parser = new DOMParser();
    const doc = parser.parseFromString(containerXml, "application/xml");
    const rootfile = doc.querySelector("rootfile");
    if (rootfile) {
      return rootfile.getAttribute("full-path") ?? null;
    }
  }

  const opfFiles = Object.keys(zip.files).filter(
    (f) => f.endsWith(".opf") && !f.startsWith("__MACOSX")
  );
  return opfFiles[0] ?? null;
}

function extractEpubMetadata(opfDoc: Document): Partial<BookMetadata> {
  const getText = (tag: string): string => {
    const el = opfDoc.querySelector(`${tag}, dc\\:${tag}`);
    return el?.textContent?.trim() ?? "";
  };

  // Index <meta refines="#id" property="..."> values for typed lookups
  // (subtitle titles, contributor roles, series membership, authority).
  const refines = new Map<string, string>();
  opfDoc.querySelectorAll("meta[refines][property]").forEach((m) => {
    const key = `${m.getAttribute("refines")}|${m.getAttribute("property")}`;
    if (!refines.has(key)) refines.set(key, m.textContent?.trim() ?? "");
  });
  const refined = (id: string, property: string): string | undefined => {
    const v = refines.get(`#${id}|${property}`);
    return v || undefined;
  };
  const metaText = (property: string): string | undefined => {
    const el = opfDoc.querySelector(`meta[property="${property}"]`);
    const v = el?.textContent?.trim();
    return v || undefined;
  };

  // Titles: a typed subtitle upgrades the pair (main keeps the title slot).
  let title = getText("title");
  let subtitle: string | undefined;
  opfDoc.querySelectorAll("dc\\:title, title").forEach((el) => {
    const id = el.getAttribute("id");
    if (!id) return;
    const text = el.textContent?.trim();
    if (!text) return;
    const kind = refined(id, "title-type");
    if (kind === "subtitle" && !subtitle) subtitle = text;
    else if (kind === "main") title = text;
  });

  // Contributors keyed by marc:relators role (trl/edt/ill/cov/bkp).
  const roleToField = {
    trl: "translator",
    edt: "editor",
    ill: "illustrator",
    cov: "coverDesigner",
    bkp: "producer",
  } as const;
  type RoleField = (typeof roleToField)[keyof typeof roleToField];
  const contributors: Partial<Record<RoleField, string>> = {};
  opfDoc.querySelectorAll("dc\\:contributor, contributor").forEach((el) => {
    const id = el.getAttribute("id");
    const field = id ? roleToField[refined(id, "role") as keyof typeof roleToField] : undefined;
    const name = el.textContent?.trim();
    if (field && name && !contributors[field]) contributors[field] = name;
  });

  // Series membership (EPUB 3 collections).
  let seriesName: string | undefined;
  let seriesPosition: string | undefined;
  opfDoc.querySelectorAll('meta[property="belongs-to-collection"]').forEach((m) => {
    if (seriesName) return;
    const id = m.getAttribute("id");
    const kind = id ? refined(id, "collection-type") : undefined;
    if (kind && kind !== "series") return;
    const name = m.textContent?.trim();
    if (!name) return;
    seriesName = name;
    seriesPosition = id ? refined(id, "group-position") : undefined;
  });

  // Subjects: authority-refined entry is the category, first plain entry is
  // the subject, the rest collapse to comma-separated keywords.
  let subject = "";
  let category: string | undefined;
  const keywordList: string[] = [];
  opfDoc.querySelectorAll("dc\\:subject, subject").forEach((el) => {
    const text = el.textContent?.trim();
    if (!text) return;
    const id = el.getAttribute("id");
    if (id && refined(id, "authority")) {
      if (!category) category = text;
      return;
    }
    if (!subject) subject = text;
    else keywordList.push(text);
  });

  const spineEl = opfDoc.querySelector("spine");

  return {
    title,
    author: getText("creator"),
    language: getText("language") || "en",
    description: getText("description"),
    isbn: getText("identifier"),
    publisher: getText("publisher"),
    subject,
    date: getText("date") || undefined,
    subtitle,
    direction:
      spineEl?.getAttribute("page-progression-direction") === "rtl" ? "rtl" : undefined,
    edition: metaText("dcterms:hasVersion"),
    rights: getText("rights") || undefined,
    audience: getText("audience") || undefined,
    keywords: keywordList.length > 0 ? keywordList.join(", ") : undefined,
    category,
    seriesName,
    seriesPosition,
    ...contributors,
  };
}

function extractManifest(
  opfDoc: Document
): { id: string; href: string; mediaType: string }[] {
  const items = opfDoc.querySelectorAll("manifest > item");
  return Array.from(items).map((item) => ({
    id: item.getAttribute("id") ?? "",
    href: item.getAttribute("href") ?? "",
    mediaType: item.getAttribute("media-type") ?? "",
  }));
}

function extractSpine(
  opfDoc: Document,
  manifest: { id: string; href: string; mediaType: string }[]
): { id: string; href: string }[] {
  const items = opfDoc.querySelectorAll("spine > itemref");
  const result: { id: string; href: string }[] = [];

  for (const item of items) {
    const idref = item.getAttribute("idref") ?? "";
    const manifestItem = manifest.find((m) => m.id === idref);
    if (manifestItem) {
      result.push({ id: manifestItem.id, href: manifestItem.href });
    }
  }

  return result;
}

async function extractCover(
  zip: JSZip,
  manifest: { id: string; href: string; mediaType: string }[],
  opfPath: string,
  imgCache: Map<string, Promise<string | null>>
): Promise<BookCover | undefined> {
  const opfDir = dirOf(opfPath);

  const isImage = (href: string) => {
    const lower = href.toLowerCase().split("#")[0].split("?")[0];
    return IMAGE_EXTS.some((ext) => lower.endsWith(ext));
  };

  const coverItem =
    manifest.find(
      (m) =>
        m.mediaType.startsWith("image/") &&
        (m.id.toLowerCase().includes("cover") || m.href.toLowerCase().includes("cover"))
    ) ?? manifest.find((m) => m.mediaType.startsWith("image/") && isImage(m.href));

  if (!coverItem) return undefined;

  const fullPath = resolveEpubPath(opfDir, coverItem.href);
  const dataUrl = await cachedImage(zip, fullPath, imgCache);
  if (!dataUrl) return undefined;

  const mime = dataUrl.match(/^data:(.*?);/)?.[1] ?? coverItem.mediaType;
  return { data: dataUrl, mimeType: mime };
}

function extractChapterTitle(doc: Document): string {
  const h1 = doc.querySelector("h1, h2, h3, title");
  return h1?.textContent?.trim() ?? "Untitled";
}

/**
 * Rewrite a chapter document so it stands alone: every `<img src>` and
 * inline-SVG `<image href>` becomes a data URL from the zip, and stylesheet
 * links become inline `<style>`. Remote URLs, scripts, forms, and media are
 * dropped — the reader renders untrusted book HTML, so only static content
 * survives.
 */
async function inlineResources(
  doc: Document,
  zip: JSZip,
  baseDir: string,
  warnings: string[],
  imgCache: Map<string, Promise<string | null>>,
  onCacheHit: () => void
): Promise<{ imgCount: number; imgBytes: number }> {
  doc
    .querySelectorAll("script, form, audio, video, object, embed, iframe")
    .forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
    }
  });

  for (const link of Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))) {
    const href = link.getAttribute("href");
    if (!href || /^(https?:|data:|blob:)/i.test(href)) {
      link.remove();
      continue;
    }
    const css = await readText(zip, resolveEpubPath(baseDir, href));
    if (css == null) {
      link.remove();
      continue;
    }
    const style = doc.createElement("style");
    style.textContent = css;
    link.replaceWith(style);
  }

  const targets: { el: Element; attr: string; href: string }[] = [];
  doc.querySelectorAll("img[src]").forEach((el) => {
    const src = el.getAttribute("src") ?? "";
    if (!src || /^(data:|blob:)/i.test(src)) return;
    if (/^https?:/i.test(src)) {
      el.removeAttribute("src");
      return;
    }
    targets.push({ el, attr: "src", href: src });
  });
  doc.querySelectorAll("image[href], image[xlink\\:href]").forEach((el) => {
    const href = el.getAttribute("href") ?? el.getAttribute("xlink:href") ?? "";
    if (!href || /^(https?:|data:|blob:)/i.test(href)) return;
    targets.push({ el, attr: el.hasAttribute("href") ? "href" : "xlink:href", href });
  });

  let missing = 0;
  let imgCount = 0;
  let imgBytes = 0;
  await Promise.all(
    targets.map(async ({ el, attr, href }) => {
      const path = resolveEpubPath(baseDir, href);
      const had = imgCache.has(path);
      const dataUrl = await cachedImage(zip, path, imgCache);
      if (had) onCacheHit();
      if (dataUrl) {
        el.setAttribute(attr, dataUrl);
        imgCount += 1;
        imgBytes += dataUrl.length;
        if (el.tagName.toLowerCase() === "img") {
          // Reader perf: images below the fold decode on demand instead of
          // all up front, so image-heavy chapters open and scroll smoothly.
          el.setAttribute("loading", "lazy");
          el.setAttribute("decoding", "async");
          const existing = el.getAttribute("style") ?? "";
          el.setAttribute(
            "style",
            `${existing}${existing && !existing.trimEnd().endsWith(";") ? ";" : ""}max-width:100%;height:auto;`
          );
        }
      } else {
        missing += 1;
        const alt = el.getAttribute("alt");
        if (alt) {
          const span = doc.createElement("span");
          span.textContent = `[image: ${alt}]`;
          el.replaceWith(span);
        } else {
          el.remove();
        }
      }
    })
  );
  if (missing > 0) {
    warnings.push(
      `${missing} image${missing === 1 ? "" : "s"} referenced files missing from the EPUB and were removed`
    );
  }

  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") ?? "";
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href) && !href.startsWith("#")) {
      const span = doc.createElement("span");
      span.innerHTML = a.innerHTML;
      a.replaceWith(span);
    }
  });

  return { imgCount, imgBytes };
}

/**
 * Deduplicating image reader: the first request for a zip path decodes and
 * base64-encodes it, every repeat reuse shares the in-flight (or finished)
 * promise. Covers and ornaments referenced from many spine files are the
 * common case — without this they are re-encoded and stored N times.
 */
function cachedImage(
  zip: JSZip,
  path: string,
  cache: Map<string, Promise<string | null>>
): Promise<string | null> {
  let pending = cache.get(path);
  if (!pending) {
    pending = readImageAsDataUrl(zip, path);
    cache.set(path, pending);
  }
  return pending;
}

async function readText(zip: JSZip, path: string): Promise<string | null> {
  if (!path) return null;
  try {
    return (await zip.file(path)?.async("string")) ?? null;
  } catch {
    return null;
  }
}

async function readImageAsDataUrl(zip: JSZip, path: string): Promise<string | null> {
  if (!path) return null;
  try {
    const entry = zip.file(path);
    if (!entry) return null;
    const blob = await entry.async("blob");
    const mime = blob.type.startsWith("image/") ? blob.type : mimeForImage(path);
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const base64 =
      typeof btoa !== "undefined"
        ? btoa(binary)
        : Buffer.from(binary, "binary").toString("base64");
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

/**
 * Split a chapter document at h1/h2 boundaries. EPUBs range from "one file
 * per chapter" to "the whole book in three files" — without splitting, an
 * imported book renders as a few giant chapters and the TOC is useless.
 * The preamble before the first heading stays attached to the first part.
 */
function splitAtHeadings(doc: Document, fallbackTitle: string): { title: string; html: string }[] {
  const body = doc.querySelector("body") ?? doc.documentElement;
  const kids = Array.from(body.children);

  const isSplitHeading = (el: Element): boolean => {
    const tag = el.tagName.toLowerCase();
    return (tag === "h1" || tag === "h2") && !!el.textContent?.trim();
  };

  if (!kids.some((el, i) => i > 0 && isSplitHeading(el))) {
    const title = body.querySelector("h1, h2, h3")?.textContent?.trim() || fallbackTitle;
    const html = body.innerHTML;
    return html.trim() ? [{ title, html }] : [];
  }

  const parts: { title: string; html: string }[] = [];
  let current: Element[] = [];
  let currentTitle = fallbackTitle;
  const flush = () => {
    const html = current.map((el) => el.outerHTML).join("\n");
    if (html.trim()) parts.push({ title: currentTitle, html });
    current = [];
  };

  for (const el of kids) {
    if (isSplitHeading(el) && current.length > 0) {
      flush();
      currentTitle = el.textContent?.trim() ?? fallbackTitle;
    } else if (isSplitHeading(el)) {
      currentTitle = el.textContent?.trim() ?? fallbackTitle;
    }
    current.push(el);
  }
  flush();
  return parts;
}

