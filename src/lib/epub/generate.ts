import type { Project, Chapter } from "@/types/project";
import { slugify, generateId } from "@/lib/utils/text";

const MIMETYPE = "application/epub+zip";

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

function buildContentOpf(project: Project, chapterFiles: { id: string; href: string }[], hasCover: boolean): string {
  const { metadata } = project;
  const identifier = metadata.isbn || `urn:uuid:${project.id}`;
  const date = metadata.date || new Date().toISOString().split("T")[0];

  const manifestItems = chapterFiles
    .map((f) => `    <item id="${f.id}" href="${f.href}" media-type="application/xhtml+xml"/>`)
    .join("\n");

  const spineItems = chapterFiles
    .map((f) => `    <itemref idref="${f.id}"/>`)
    .join("\n");

  const coverItem = hasCover
    ? `\n    <item id="cover-image" href="images/cover.${getCoverExt(project)}" media-type="image/${getCoverExt(project)}" properties="cover-image"/>`
    : "";

  const navItem = `    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" xml:lang="${metadata.language || "en"}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${escapeXml(identifier)}</dc:identifier>
    <dc:title>${escapeXml(metadata.title)}</dc:title>
    <dc:creator>${escapeXml(metadata.author)}</dc:creator>
    <dc:language>${metadata.language || "en"}</dc:language>
    ${metadata.description ? `<dc:description>${escapeXml(metadata.description)}</dc:description>` : ""}
    ${metadata.isbn ? `<dc:identifier id="ISBN">${escapeXml(metadata.isbn)}</dc:identifier>` : ""}
    ${metadata.publisher ? `<dc:publisher>${escapeXml(metadata.publisher)}</dc:publisher>` : ""}
    <dc:date>${date}</dc:date>
    ${metadata.subject ? `<dc:subject>${escapeXml(metadata.subject)}</dc:subject>` : ""}
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
  </metadata>
  <manifest>
${navItem}
${manifestItems}${coverItem}
    <item id="css" href="styles.css" media-type="text/css"/>
  </manifest>
  <spine>
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

  // OEBPS files
  zip.file("OEBPS/content.opf", buildContentOpf(project, chapterFiles, !!project.cover));
  zip.file("OEBPS/nav.xhtml", buildNav(project, chapterFiles));
  zip.file("OEBPS/styles.css", buildStyles());

  // Chapter files
  for (let i = 0; i < project.chapters.length; i++) {
    const xhtml = buildChapterXhtml(project, project.chapters[i]);
    zip.file(`OEBPS/${chapterFiles[i].href}`, xhtml);
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

  const filename = `${sanitizeFilename(project.metadata.title || project.name)}.epub`;

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
