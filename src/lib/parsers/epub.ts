import type { ParseResult, Chapter, BookMetadata, BookCover } from "@/types/project";
import { generateId } from "@/lib/utils/text";
import type JSZip from "jszip";

export async function parseEPUB(file: File): Promise<ParseResult> {
  const warnings: string[] = [];
  const JSZip = (await import("jszip")).default;

  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

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
  const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";

  const metadata = extractEpubMetadata(opfDoc);
  const manifest = extractManifest(opfDoc);
  const spine = extractSpine(opfDoc, manifest);
  const cover = await extractCover(zip, manifest, opfPath);

  const chapters: Chapter[] = [];
  let order = 0;

  for (const item of spine) {
    if (!item.href.endsWith(".xhtml") && !item.href.endsWith(".html")) continue;

    const fullPath = resolvePath(opfDir, item.href);
    const fileContent = await zip.file(fullPath)?.async("string");
    if (!fileContent) {
      warnings.push(`Could not read chapter file: ${item.href}`);
      continue;
    }

    const chapDoc = parser.parseFromString(fileContent, "application/xhtml+xml");
    const title = extractChapterTitle(chapDoc);
    const content = extractChapterContent(chapDoc);

    if (content.trim()) {
      chapters.push({
        id: generateId(),
        title,
        content,
        order: order++,
        level: 1,
      });
    }
  }

  if (chapters.length === 0) {
    warnings.push("No chapters found in EPUB");
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
  const ns = "http://www.idpf.org/2007/opf";
  const dc = "http://purl.org/dc/elements/1.1/";

  const getText = (tag: string): string => {
    const el = opfDoc.querySelector(`${tag}, dc\\:${tag}`);
    return el?.textContent?.trim() ?? "";
  };

  return {
    title: getText("title"),
    author: getText("creator"),
    language: getText("language") || "en",
    description: getText("description"),
    isbn: getText("identifier"),
    publisher: getText("publisher"),
    subject: getText("subject"),
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
  opfPath: string
): Promise<BookCover | undefined> {
  const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";

  const coverItem = manifest.find(
    (m) =>
      m.mediaType.startsWith("image/") &&
      (m.id.toLowerCase().includes("cover") || m.href.toLowerCase().includes("cover"))
  );

  if (!coverItem) return undefined;

  const fullPath = resolvePath(opfDir, coverItem.href);
  const file = zip.file(fullPath);
  if (!file) return undefined;

  const blob = await file.async("blob");
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  return { data: dataUrl, mimeType: coverItem.mediaType };
}

function extractChapterTitle(doc: Document): string {
  const h1 = doc.querySelector("h1, h2, h3, title");
  return h1?.textContent?.trim() ?? "Untitled";
}

function extractChapterContent(doc: Document): string {
  const body = doc.querySelector("body") ?? doc.documentElement;
  return body.innerHTML;
}

function resolvePath(base: string, relative: string): string {
  if (relative.startsWith("/")) return relative.substring(1);
  const parts = (base + relative).split("/");
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
