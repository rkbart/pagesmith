import type { ValidationIssue, ValidationResult } from "@/types/epub";

export async function validateEpub(file: File): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  const JSZip = (await import("jszip")).default;

  try {
    const arrayBuffer = await file.arrayBuffer();

    // 0. Mimetype storage: the spec requires the mimetype entry to be the
    // first file in the archive and stored uncompressed. JSZip doesn't
    // expose the compression method, so read the first local file header
    // directly (signature 0x04034b50, method at offset 8, name at 30).
    checkMimetypeStorage(arrayBuffer, issues);

    const zip = await JSZip.loadAsync(arrayBuffer);
    const files = Object.keys(zip.files);

    // 1. Check mimetype
    const mimetypeFile = zip.file("mimetype");
    if (!mimetypeFile) {
      issues.push({
        severity: "error",
        message: "Missing mimetype file",
        fix: "Re-export the book from your ebook editor so a mimetype file is included. If you zip by hand, add the mimetype file first, before everything else.",
      });
    } else {
      const mimetype = await mimetypeFile.async("string");
      if (mimetype !== "application/epub+zip") {
        issues.push({
          severity: "error",
          message: `Incorrect mimetype: "${mimetype}" (expected "application/epub+zip")`,
          fix: "Open the mimetype file in a plain text editor and make it contain exactly application/epub+zip — no extra spaces or line breaks — then re-zip the book.",
        });
      }
    }

    // 2. Check container.xml
    const containerFile = zip.file("META-INF/container.xml");
    if (!containerFile) {
      issues.push({
        severity: "error",
        message: "Missing META-INF/container.xml",
        fix: "Re-export the book — META-INF/container.xml is created automatically by ebook tools. If you are building the EPUB by hand, add this file pointing at your .opf package file.",
      });
    } else {
      const containerXml = await containerFile.async("string");
      if (!containerXml.includes("rootfile")) {
        issues.push({
          severity: "error",
          message: "container.xml has no rootfile entry",
          fix: "Edit META-INF/container.xml and add a <rootfile full-path=\"…\"/> entry pointing to your package (.opf) file, so readers can find the book.",
        });
      }
    }

    // 3. Find and check OPF
    const opfPath = files.find((f) => f.endsWith(".opf"));
    if (!opfPath) {
      issues.push({
        severity: "error",
        message: "No OPF file found",
        fix: "Re-export the book. The .opf package file is the book's control sheet — without it no reading app can open the book.",
      });
    } else {
      const opfContent = await zip.file(opfPath)?.async("string");
      if (opfContent) {
        const parser = new DOMParser();
        const opfDoc = parser.parseFromString(opfContent, "application/xml");

        // Check for parse errors
        if (opfDoc.querySelector("parsererror")) {
          issues.push({
            severity: "error",
            message: "OPF file has XML parse errors",
            file: opfPath,
            fix: "Open the .opf file in a text editor and repair the broken XML — usually a tag closed in the wrong order, a missing closing tag, or an unclosed quote.",
          });
        }

        // Check metadata
        const title = opfDoc.querySelector("dc\\:title, title");
        if (!title?.textContent?.trim()) {
          issues.push({
            severity: "error",
            message: "Missing dc:title in metadata",
            file: opfPath,
            fix: "Add <dc:title>Your Book Title</dc:title> inside the <metadata> section of the .opf file.",
          });
        }

        const creator = opfDoc.querySelector("dc\\:creator, creator");
        if (!creator?.textContent?.trim()) {
          issues.push({
            severity: "warning",
            message: "Missing dc:creator in metadata",
            file: opfPath,
            fix: "Add <dc:creator>Author Name</dc:creator> inside the <metadata> section of the .opf file, so libraries and stores don't list the book as authorless.",
          });
        }

        const language = opfDoc.querySelector("dc\\:language, language");
        if (!language?.textContent?.trim()) {
          issues.push({
            severity: "warning",
            message: "Missing dc:language in metadata",
            file: opfPath,
            fix: "Add <dc:language>en</dc:language> inside <metadata> in the .opf file, using your book's language code (en, fr, de…). Readers use it for hyphenation, fonts and text-to-speech.",
          });
        }

        const identifier = opfDoc.querySelector("dc\\:identifier, identifier");
        if (!identifier?.textContent?.trim()) {
          issues.push({
            severity: "warning",
            message: "Missing dc:identifier in metadata",
            file: opfPath,
            fix: "Add <dc:identifier>some-unique-id</dc:identifier> inside <metadata> — use the ISBN if you have one, or any unique code if not.",
          });
        }

        // Check manifest
        const manifestItems = opfDoc.querySelectorAll("manifest > item");
        if (manifestItems.length === 0) {
          issues.push({
            severity: "error",
            message: "Manifest is empty",
            file: opfPath,
            fix: "The manifest is the book's inventory of files. Re-export the book — or, if building by hand, add an <item> line for every file the book uses.",
          });
        }

        // Check spine
        const spineItems = opfDoc.querySelectorAll("spine > itemref");
        if (spineItems.length === 0) {
          issues.push({
            severity: "error",
            message: "Spine is empty — no content to read",
            file: opfPath,
            fix: "The spine sets the reading order. Add <itemref> entries pointing at your chapter files, or re-export the book.",
          });
        }

        // Check nav document (EPUB 3)
        const hasNav = Array.from(manifestItems).some(
          (item) => item.getAttribute("properties")?.includes("nav")
        );
        if (!hasNav) {
          issues.push({
            severity: "warning",
            message: "No EPUB 3 nav document found (properties=\"nav\")",
            file: opfPath,
            fix: "Add a navigation document (usually nav.xhtml with the table of contents) and declare it in the manifest with properties=\"nav\". Most editors generate this on export.",
          });
        }

        // Check that all manifest files exist in zip
        for (const item of manifestItems) {
          const href = item.getAttribute("href") ?? "";
          const opfDir = opfPath.includes("/")
            ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1)
            : "";
          const fullPath = resolvePath(opfDir, href);
          if (!zip.file(fullPath)) {
            issues.push({
              severity: "error",
              message: `Manifest references missing file: ${href}`,
              file: opfPath,
              fix: "Either put the missing file back at that path inside the archive, or delete its <item> line from the manifest.",
            });
          }
        }

        // Check that all spine idrefs exist in manifest
        const manifestIds = new Set(
          Array.from(manifestItems).map((item) => item.getAttribute("id") ?? "")
        );
        for (const item of spineItems) {
          const idref = item.getAttribute("idref") ?? "";
          if (!manifestIds.has(idref)) {
            issues.push({
              severity: "error",
              message: `Spine references missing manifest item: ${idref}`,
              file: opfPath,
              fix: "Change the idref to match an id that exists in the manifest, or delete the stray <itemref> line from the spine.",
            });
          }
        }
      }
    }

    // 4. Check for HTML/XHTML validity in chapter files
    const chapterFiles = files.filter(
      (f) => (f.endsWith(".xhtml") || f.endsWith(".html")) && f.startsWith("OEBPS/")
    );
    for (const cf of chapterFiles) {
      const content = await zip.file(cf)?.async("string");
      if (content) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, "application/xhtml+xml");
        if (doc.querySelector("parsererror")) {
          issues.push({
            severity: "warning",
            message: "XML parse error",
            file: cf,
            fix: "Open the chapter file and repair the broken markup — every tag must close in reverse order (like <p><b></b></p>, never <p><b></p></b>). One mismatched tag can blank a whole chapter.",
          });
        }
        if (!content.includes("<body")) {
          issues.push({
            severity: "warning",
            message: "Missing body element",
            file: cf,
            fix: "Every chapter needs a <body> element wrapping its text. Add one around the chapter content, or re-export the chapter.",
          });
        }
      }
    }

    // 5. Check for absolute URLs in content
    for (const cf of chapterFiles) {
      const content = await zip.file(cf)?.async("string");
      if (content) {
        const absUrls = content.match(/href="https?:\/\/[^"]*"/g);
        if (absUrls && absUrls.length > 0) {
          issues.push({
            severity: "info",
            message: `Contains ${absUrls.length} external link(s)`,
            file: cf,
            fix: "Nothing to fix unless you want a fully offline book — then replace the web links with local content.",
          });
        }
      }
    }
  } catch (error) {
    issues.push({
      severity: "error",
      message: `Failed to parse EPUB: ${error instanceof Error ? error.message : "Unknown error"}`,
      fix: "The file may not be a real EPUB (for example a renamed PDF or Word document). Export or save it as EPUB and try again.",
    });
  }

  const hasErrors = issues.some((i) => i.severity === "error");
  return { valid: !hasErrors, issues };
}

/**
 * Verify the mimetype entry is the first file in the archive and stored
 * uncompressed, as the EPUB spec requires. Reads the first ZIP local file
 * header straight from the buffer (JSZip doesn't expose the method).
 */
function checkMimetypeStorage(buffer: ArrayBuffer, issues: ValidationIssue[]): void {
  const view = new DataView(buffer);
  if (view.byteLength < 30) return;
  // Local file header signature "PK\x03\x04".
  if (view.getUint32(0, true) !== 0x04034b50) return;
  const method = view.getUint16(8, true);
  const nameLen = view.getUint16(26, true);
  if (30 + nameLen > view.byteLength) return;
  const name = new TextDecoder().decode(new Uint8Array(buffer, 30, nameLen));
  if (name !== "mimetype") {
    issues.push({
      severity: "error",
      message: "mimetype is not the first file in the archive",
      fix: "Re-zip the book so the mimetype file goes in first, before everything else — reading apps look for it at the very start of the archive.",
    });
  }
  if (method !== 0) {
    issues.push({
      severity: "error",
      message: `mimetype file is compressed (method ${method}) — it must be stored uncompressed`,
      fix: "Re-zip with the mimetype stored, not compressed: add it first with no compression (e.g. `zip -X0 book.epub mimetype`), then add the rest of the files.",
    });
  }
}

function resolvePath(base: string, relative: string): string {
  if (relative.startsWith("/")) return relative.substring(1);
  const parts = (base + relative).split("/");
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "..") resolved.pop();
    else if (part !== "." && part !== "") resolved.push(part);
  }
  return resolved.join("/");
}
