import Link from "next/link";
import {
  FileText,
  FileType2,
  Hash,
  FileCode,
  AlignLeft,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";

const formats = [
  { icon: FileText, label: "PDF", href: "/convert/pdf" },
  { icon: FileType2, label: "DOCX", href: "/convert/docx" },
  { icon: Hash, label: "Markdown", href: "/convert/markdown" },
  { icon: FileCode, label: "HTML", href: "/convert/html" },
  { icon: AlignLeft, label: "TXT", href: "/convert/txt" },
  { icon: BookOpen, label: "EPUB", href: "/convert/epub" },
];

export function FormatStrip() {
  return (
    <section className="container px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h2 className="heading-md">Six ways onto the press</h2>
        <p className="body-sm text-muted-foreground mt-1.5">
          Every import ends in the same place: a clean EPUB 3.
        </p>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-2.5">
        {formats.map((format) => (
          <Link
            key={format.label}
            href={format.href}
            className="group inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2.5 text-sm font-medium shadow-panel transition-all hover:-translate-y-0.5 hover:border-brass/40 hover:shadow-lift"
          >
            <format.icon className="size-4 text-brass" aria-hidden="true" />
            {format.label}
            <ArrowUpRight
              className="size-3.5 text-muted-foreground transition-colors group-hover:text-brass"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
