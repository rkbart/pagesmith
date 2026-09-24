import type { Project, Chapter } from "@/types/project";
import { slugify, generateId } from "@/lib/utils/text";

const MIMETYPE = "application/epub+zip";

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

function buildContentOpf(project: Project, chapterFiles: { id: string; href: string }[], hasCover: boolean, imageFiles: ImageFile[]): string {
  const { metadata } = project;
  const identifier = metadata.isbn || `urn:uuid:${project.id}`;
  const date = metadata.date || new Date().toISOString().split("T")[0];

  const manifestItems = chapterFiles
    .map((f) => `    <item id="${f.id}" href="${f.href}" media-type="application/xhtml+xml"/>`)
    .join("\n");

  const spineItems = chapterFiles
    .map((f) => `    <itemref idref="${f.id}"/>`)
    .join("\n");

  // Contributors with marc:relators role refines (translator, editor,
  // illustrator, cover designer, producer). Ids are unique per document.
  let contributorSeq = 0;
  const contributor = (name: string | undefined, role: string): string => {
    if (!name?.trim()) return "";
    contributorSeq += 1;
    const id = `contrib${contributorSeq}`;
    return `    <dc:contributor id="${id}">${escapeXml(name.trim())}</dc:contributor>\n    <meta refines="#${id}" property="role" scheme="marc:relators">${role}</meta>`;
  };
  const contributors = [
    contributor(metadata.translator, "trl"),
    contributor(metadata.editor, "edt"),
    contributor(metadata.illustrator, "ill"),
    contributor(metadata.coverDesigner, "cov"),
    contributor(metadata.producer, "bkp"),
  ]
    .filter(Boolean)
    .join("\n");

  // Extra discovery keywords: comma-separated input → dc:subject entries.
  const keywords = (metadata.keywords ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .map((k) => `    <dc:subject>${escapeXml(k)}</dc:subject>`)
    .join("\n");

  // Titles: a subtitle upgrades both to typed titles (EPUB 3 title-type).
  const titles = metadata.subtitle?.trim()
    ? `    <dc:title id="title-main">${escapeXml(metadata.title)}</dc:title>\n    <meta refines="#title-main" property="title-type">main</meta>\n    <dc:title id="title-sub">${escapeXml(metadata.subtitle.trim())}</dc:title>\n    <meta refines="#title-sub" property="title-type">subtitle</meta>`
    : `    <dc:title>${escapeXml(metadata.title)}</dc:title>`;

  // Series membership (EPUB 3 collections).
  const series = metadata.seriesName?.trim()
    ? `    <meta property="belongs-to-collection" id="series">${escapeXml(metadata.seriesName.trim())}</meta>\n    <meta refines="#series" property="collection-type">series</meta>${
        metadata.seriesPosition?.trim()
          ? `\n    <meta refines="#series" property="group-position">${escapeXml(metadata.seriesPosition.trim())}</meta>`
          : ""
      }`
    : "";

  const direction =
    metadata.direction === "rtl" ? ` page-progression-direction="rtl"` : "";

  const coverItem = hasCover
    ? `\n    <item id="cover-image" href="images/cover.${getCoverExt(project)}" media-type="image/${getCoverExt(project)}" properties="cover-image"/>`
    : "";

  const navItem = `    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`;

  // Content illustrations extracted from chapter HTML (data-URL <img> tags
  // materialized as real files by extractInlineImages, below).
  const imageItems = imageFiles
    .map((f) => `    <item id="${f.id}" href="${f.href}" media-type="${f.mime}"/>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" xml:lang="${metadata.language || "en"}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${escapeXml(identifier)}</dc:identifier>
${titles}
    <dc:creator>${escapeXml(metadata.author)}</dc:creator>
${contributors ? `${contributors}\n` : ""}    <dc:language>${metadata.language || "en"}</dc:language>
    ${metadata.description ? `<dc:description>${escapeXml(metadata.description)}</dc:description>` : ""}
    ${metadata.isbn ? `<dc:identifier id="ISBN">${escapeXml(metadata.isbn)}</dc:identifier>` : ""}
    ${metadata.publisher ? `<dc:publisher>${escapeXml(metadata.publisher)}</dc:publisher>` : ""}
    <dc:date>${date}</dc:date>
    ${metadata.edition?.trim() ? `<meta property="dcterms:hasVersion">${escapeXml(metadata.edition.trim())}</meta>` : ""}
    ${metadata.rights?.trim() ? `<dc:rights>${escapeXml(metadata.rights.trim())}</dc:rights>` : ""}
    ${metadata.audience?.trim() ? `<dc:audience>${escapeXml(metadata.audience.trim())}</dc:audience>` : ""}
    ${metadata.subject ? `<dc:subject>${escapeXml(metadata.subject)}</dc:subject>` : ""}
${keywords ? `${keywords}\n` : ""}    ${metadata.category?.trim() ? `<dc:subject id="subject-cat">${escapeXml(metadata.category.trim())}</dc:subject>` : ""}
    ${metadata.category?.trim() ? `<meta refines="#subject-cat" property="authority">BISAC</meta>` : ""}
${series ? `${series}\n` : ""}    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
  </metadata>
  <manifest>
${navItem}
${manifestItems}${coverItem}
    <item id="css" href="styles.css" media-type="text/css"/>
${imageItems ? `${imageItems}\n` : ""}  </manifest>
  <spine${direction}>
${spineItems}
  </spine>
</package>`;
}

function buildNav(project: Project, chapterFiles: { id: string; href: string; title: string; level: number }[]): string {
  const navItems = chapterFiles
    .map((f) => {
      const indent = "  ".repeat(f.level);
      return `${indent}<li><a href="${f.href}">${escapeXml(f.title)}</a></li>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${project.metadata.language || "en"}">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(project.metadata.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
${navItems}
    </ol>
  </nav>
</body>
</html>`;
}

function buildStyles(): string {
  return `body {
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.6;
  margin: 1em;
  color: #333;
}
h1, h2, h3, h4, h5, h6 {
  line-height: 1.3;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}
h1 { font-size: 1.8em; text-align: center; }
h2 { font-size: 1.5em; }
h3 { font-size: 1.2em; }
p {
  text-indent: 1.5em;
  margin: 0.5em 0;
  text-align: justify;
}
p.dialogue, p.no-indent {
  text-indent: 0;
}
img {
  max-width: 100%;
  height: auto;
}
blockquote {
  margin: 1em 2em;
  font-style: italic;
}
.center { text-align: center; }
.page-break { page-break-after: always; }
hr {
  border: none;
  text-align: center;
  margin: 2em auto;
  width: 50%;
}
hr::after {
  content: "* * *";
  letter-spacing: 1em;
}`;
}

function buildChapterXhtml(project: Project, chapter: Chapter): string {
  const content = chapter.content;

  // Wrap in proper XHTML
  let bodyContent = content;

  // If content doesn't start with a heading, add one
  if (!/^\s*<h[1-6]/i.test(bodyContent)) {
    const level = Math.min(chapter.level + 1, 6);
    bodyContent = `<h${level}>${escapeXml(chapter.title)}</h${level}>\n${bodyContent}`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${project.metadata.language || "en"}">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

export function getCoverExt(project: Project): string {
  if (!project.cover) return "jpg";
  if (project.cover.mimeType.includes("png")) return "png";
  if (project.cover.mimeType.includes("webp")) return "webp";
  return "jpg";
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizeFilename(text: string): string {
  return slugify(text) || "untitled";
}

export interface BuildResult {
  blob: Blob;
  filename: string;
}

interface ImageFile {
  id: string;
  href: string;
  mime: string;
  base64: string;
}

const IMAGE_MIME_EXT: Record<string, { ext: string; mime: string }> = {
  "image/jpeg": { ext: "jpg", mime: "image/jpeg" },
  "image/png": { ext: "png", mime: "image/png" },
  "image/gif": { ext: "gif", mime: "image/gif" },
  "image/webp": { ext: "webp", mime: "image/webp" },
  "image/svg+xml": { ext: "svg", mime: "image/svg+xml" },
};

/**
 * Pull data-URL <img> tags out of chapter HTML into real EPUB image files.
 * Identical images (e.g. a publisher logo repeated on every page) are stored
 * once and referenced repeatedly. Chapter files live in OEBPS/text/, so
 * rewritten sources point at ../images/.
 */
function extractInlineImages(html: string, prefix: string, cache: Map<string, ImageFile>): { html: string; files: ImageFile[] } {
  if (!html.includes("data:image")) return { html, files: [] };
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const files: ImageFile[] = [];
  doc.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") ?? "";
    const m = src.match(/^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!m) return;
    const info = IMAGE_MIME_EXT[m[1].toLowerCase()];
    if (!info || !m[2]) return;
    let file = cache.get(m[2]);
    if (!file) {
      const id = `${prefix}-${cache.size}`;
      file = { id, href: `images/${id}.${info.ext}`, mime: info.mime, base64: m[2] };
      cache.set(m[2], file);
    }
    if (!files.some((f) => f.id === file.id)) files.push(file);
    img.setAttribute("src", `../${file.href}`);
    if (!img.getAttribute("alt")) img.setAttribute("alt", "Illustration");
  });
  return { html: doc.body.innerHTML, files };
}

export async function buildEpub(project: Project): Promise<BuildResult> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  // Mimetype must be first and uncompressed
  zip.file("mimetype", MIMETYPE, { compression: "STORE" });

  // META-INF/container.xml
  zip.file("META-INF/container.xml", CONTAINER_XML);

  // Build chapter files
  const chapterFiles = project.chapters.map((ch, i) => ({
    id: `chap${i + 1}`,
    href: `text/${sanitizeFilename(ch.title)}_${i + 1}.xhtml`,
    title: ch.title,
    level: ch.level,
  }));

  // Internal chapter links (`data-chapter="<id>"` from the editor) resolve
  // to real file hrefs here — filenames only exist at export time. All
  // chapter files share the text/ directory, so basenames suffice.
  const hrefByChapterId = new Map<string, string>();
  project.chapters.forEach((ch, i) =>
    hrefByChapterId.set(
      ch.id,
      chapterFiles[i].href.split("/").pop() ?? chapterFiles[i].href
    )
  );
  const resolveChapterLinks = (html: string): string => {
    if (!html.includes("data-chapter")) return html;
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
    let changed = false;
    doc.querySelectorAll("a[data-chapter]").forEach((a) => {
      const href = hrefByChapterId.get(a.getAttribute("data-chapter") ?? "");
      if (href) {
        a.setAttribute("href", href);
        changed = true;
      }
    });
    return changed ? doc.body.innerHTML : html;
  };
  const resolvedChapters = project.chapters.map((ch) => ({
    ...ch,
    content: resolveChapterLinks(ch.content),
  }));

  // Materialize inline data-URL images (PDF import illustrations, EPUB
  // round-trip images) as OEBPS/images/* files with manifest entries.
  const imageCache = new Map<string, ImageFile>();
  const chaptersWithFiles = resolvedChapters.map((ch, i) => {
    const { html, files } = extractInlineImages(ch.content, `img${i + 1}`, imageCache);
    return { ...ch, content: html, imageFiles: files };
  });
  const imageFiles = [...imageCache.values()];

  // OEBPS files
  zip.file("OEBPS/content.opf", buildContentOpf(project, chapterFiles, !!project.cover, imageFiles));
  zip.file("OEBPS/nav.xhtml", buildNav(project, chapterFiles));
  zip.file("OEBPS/styles.css", buildStyles());

  // Chapter files
  for (let i = 0; i < chaptersWithFiles.length; i++) {
    const xhtml = buildChapterXhtml(project, chaptersWithFiles[i]);
    zip.file(`OEBPS/${chapterFiles[i].href}`, xhtml);
  }

  // Content images (shared store — each file written once)
  for (const file of imageFiles) {
    zip.file(`OEBPS/${file.href}`, file.base64, { base64: true });
  }

  // Cover image
  if (project.cover) {
    const base64 = project.cover.data.split(",")[1];
    const ext = getCoverExt(project);
    zip.file(`OEBPS/images/cover.${ext}`, base64, { base64: true });
  }

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: MIMETYPE,
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const filename = `${sanitizeFilename(project.metadata.exportFileName?.trim() || project.metadata.title || project.name)}.epub`;

  return { blob, filename };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
