import JSZip from "jszip";
import { writeFileSync } from "fs";

const MIMETYPE = "application/epub+zip";

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

const CHAPTERS = [
  { level: 1, title: "Introduction", content: "<h1>Introduction</h1><p>Welcome to this book. This is the introductory chapter that sets the stage for everything that follows.</p>" },
  { level: 1, title: "Part One", content: "<h1>Part One</h1><p>This is the first major section of the book.</p>" },
  { level: 2, title: "Chapter 1", content: "<h2>Chapter 1</h2><p>The first chapter of Part One. Here we begin our journey.</p>" },
  { level: 2, title: "Chapter 2", content: "<h2>Chapter 2</h2><p>The second chapter continues the story.</p>" },
  { level: 3, title: "Section 1.1", content: "<h3>Section 1.1</h3><p>A deeper subsection within Chapter 1.</p>" },
  { level: 3, title: "Section 1.2", content: "<h3>Section 1.2</h3><p>Another subsection exploring more details.</p>" },
  { level: 1, title: "Part Two", content: "<h1>Part Two</h1><p>The second major section.</p>" },
  { level: 2, title: "Chapter 3", content: "<h2>Chapter 3</h2><p>Moving into Part Two now.</p>" },
  { level: 2, title: "Chapter 4", content: "<h2>Chapter 4</h2><p>The final chapters of the book.</p>" },
  { level: 1, title: "Conclusion", content: "<h1>Conclusion</h1><p>We wrap up everything we've covered.</p>" },
];

const STYLES = `<style>
  body { font-family: Georgia, serif; max-width: 68ch; margin: 0 auto; padding: 2em; line-height: 1.75; }
  h1 { font-size: 2em; margin-top: 2em; }
  h2 { font-size: 1.5em; margin-top: 1.5em; }
  h3 { font-size: 1.2em; margin-top: 1em; }
  p { margin: 0.5em 0; }
</style>`;

async function generateChapterXhtml(title, content) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" epub:type="chapter">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  ${STYLES}
</head>
<body>
${content}
</body>
</html>`;
}

async function generateDemoEpub() {
  const zip = new JSZip();
  zip.file("mimetype", MIMETYPE);
  zip.file("META-INF/container.xml", CONTAINER_XML);

  const chapterFiles = [];
  for (let i = 0; i < CHAPTERS.length; i++) {
    const ch = CHAPTERS[i];
    const fileId = `chap-${i + 1}`;
    const href = `OEBPS/chapter${i + 1}.xhtml`;
    chapterFiles.push({ id: fileId, href, title: ch.title });
    zip.file(href, await generateChapterXhtml(ch.title, ch.content));
  }

  const manifestItems = chapterFiles.map(f =>
    `    <item id="${f.id}" href="${f.href}" media-type="application/xhtml+xml"/>`
  ).join("\n");
  const spineItems = chapterFiles.map(f =>
    `    <itemref idref="${f.id}"/>`
  ).join("\n");

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Chapter Levels Demo</dc:title>
    <dc:creator>Demo</dc:creator>
    <dc:language>en</dc:language>
    <dc:identifier id="bookid">urn:uuid:demo-book</dc:identifier>
  </metadata>
  <manifest>
${manifestItems}
  </manifest>
  <spine>
${spineItems}
  </spine>
</package>`;
  zip.file("OEBPS/content.opf", contentOpf);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: MIMETYPE,
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const buffer = Buffer.from(await blob.arrayBuffer());
  writeFileSync("demo-book.epub", buffer);
  console.log("Generated demo-book.epub with 10 chapters at levels 1-3");
  console.log("Level breakdown:");
  CHAPTERS.forEach(ch => console.log(`  Level ${ch.level}: ${ch.title}`));
}

generateDemoEpub().catch(console.error);
