import type { ValidationIssue, ValidationResult } from "@/types/epub";

export async function validateEpub(file: File): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  const JSZip = (await import("jszip")).default;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const files = Object.keys(zip.files);

    // 1. Check mimetype
    const mimetypeFile = zip.file("mimetype");
    if (!mimetypeFile) {
      issues.push({ severity: "error", message: "Missing mimetype file" });
    } else {
      const mimetype = await mimetypeFile.async("string");
      if (mimetype !== "application/epub+zip") {
        issues.push({
          severity: "error",
          message: `Incorrect mimetype: "${mimetype}" (expected "application/epub+zip")`,
        });
      }
    }

    // 2. Check container.xml
    const containerFile = zip.file("META-INF/container.xml");
    if (!containerFile) {
      issues.push({ severity: "error", message: "Missing META-INF/container.xml" });
    } else {
      const containerXml = await containerFile.async("string");
      if (!containerXml.includes("rootfile")) {
        issues.push({ severity: "error", message: "container.xml has no rootfile entry" });
      }
    }

    // 3. Find and check OPF
    const opfPath = files.find((f) => f.endsWith(".opf"));
    if (!opfPath) {
      issues.push({ severity: "error", message: "No OPF file found" });
    } else {
      const opfContent = await zip.file(opfPath)?.async("string");
      if (opfContent) {
        const parser = new DOMParser();
        const opfDoc = parser.parseFromString(opfContent, "application/xml");

        // Check for parse errors
        if (opfDoc.querySelector("parsererror")) {
          issues.push({ severity: "error", message: "OPF file has XML parse errors", file: opfPath });
        }

        // Check metadata
        const title = opfDoc.querySelector("dc\\:title, title");
        if (!title?.textContent?.trim()) {
          issues.push({ severity: "error", message: "Missing dc:title in metadata", file: opfPath });
        }

        const creator = opfDoc.querySelector("dc\\:creator, creator");
        if (!creator?.textContent?.trim()) {
          issues.push({ severity: "warning", message: "Missing dc:creator in metadata", file: opfPath });
        }

        const language = opfDoc.querySelector("dc\\:language, language");
        if (!language?.textContent?.trim()) {
          issues.push({ severity: "warning", message: "Missing dc:language in metadata", file: opfPath });
        }

        const identifier = opfDoc.querySelector("dc\\:identifier, identifier");
        if (!identifier?.textContent?.trim()) {
          issues.push({ severity: "warning", message: "Missing dc:identifier in metadata", file: opfPath });
        }

        // Check manifest
        const manifestItems = opfDoc.querySelectorAll("manifest > item");
        if (manifestItems.length === 0) {
          issues.push({ severity: "error", message: "Manifest is empty", file: opfPath });
        }

        // Check spine
        const spineItems = opfDoc.querySelectorAll("spine > itemref");
        if (spineItems.length === 0) {
          issues.push({ severity: "error", message: "Spine is empty — no content to read", file: opfPath });
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
          issues.push({ severity: "warning", message: "XML parse error", file: cf });
        }
        if (!content.includes("<body")) {
          issues.push({ severity: "warning", message: "Missing body element", file: cf });
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
          });
        }
      }
    }
  } catch (error) {
    issues.push({
      severity: "error",
      message: `Failed to parse EPUB: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }

  const hasErrors = issues.some((i) => i.severity === "error");
  return { valid: !hasErrors, issues };
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
