import { FileText, FileType, Code, FileCode, AlignLeft, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";

const formats = [
  {
    icon: FileText,
    label: "PDF",
    description: "Extract text and detect chapters",
    href: "/convert/pdf",
  },
  {
    icon: FileType,
    label: "DOCX",
    description: "Parse Word manuscripts",
    href: "/convert/docx",
  },
  {
    icon: Code,
    label: "Markdown",
    description: "Convert MD with frontmatter",
    href: "/convert/markdown",
  },
  {
    icon: FileCode,
    label: "HTML",
    description: "Clean and restructure web content",
    href: "/convert/html",
  },
  {
    icon: AlignLeft,
    label: "TXT",
    description: "Auto-detect chapters from plain text",
    href: "/convert/txt",
  },
  {
    icon: BookOpen,
    label: "EPUB",
    description: "Open and edit existing EPUBs",
    href: "/convert/epub",
  },
];

export function FormatCards() {
  return (
    <section className="container px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-10">
        <h2 className="heading-lg">Convert From Any Format</h2>
        <p className="body-md-loose text-muted-foreground mt-2">
          Drop in your file and PageSmith handles the rest
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {formats.map((format) => (
          <Link key={format.label} href={format.href}>
            <Card className="p-6 hover:bg-muted/30 transition-colors cursor-pointer h-full">
              <div className="mb-3 w-fit rounded-lg bg-muted p-2.5">
                <format.icon className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="heading-sm">{format.label}</h3>
              <p className="body-sm text-muted-foreground mt-1">{format.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
