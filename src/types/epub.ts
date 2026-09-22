export interface EpubPackage {
  metadata: {
    title: string;
    creator: string;
    language: string;
    description?: string;
    identifier?: string;
    publisher?: string;
    date?: string;
    subject?: string;
  };
  manifest: EpubManifestItem[];
  spine: string[];
  nav: EpubNavItem[];
}

export interface EpubManifestItem {
  id: string;
  href: string;
  mediaType: string;
  properties?: string;
}

export interface EpubNavItem {
  id: string;
  href: string;
  label: string;
  children?: EpubNavItem[];
}

export interface EpubChapterFile {
  id: string;
  href: string;
  content: string; // XHTML content
}

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  message: string;
  file?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}
