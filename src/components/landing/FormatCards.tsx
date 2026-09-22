import { FileText, FileType, Code, FileCode, AlignLeft, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";

const formats = [
  {
    icon: FileText,
    label: "PDF",
    description: "Extract text and detect chapters",
    href: "/convert/pdf",
    color: "text-red-500",
  },
  {
    icon: FileType,
    label: "DOCX",
    description: "Parse Word manuscripts",
    href: "/convert/docx",
    color: "text-blue-500",
  },
  {
    icon: Code,
    label: "Markdown",
    description: "Convert MD with frontmatter",
    href: "/convert/markdown",
    color: "text-purple-500",
  },
  {
    icon: FileCode,
    label: "HTML",
    description: "Clean and restructure web content",
    href: "/convert/html",
    color: "text-orange-500",
  },
  {
    icon: AlignLeft,
    label: "TXT",
    description: "Auto-detect chapters from plain text",
    href: "/convert/txt",
    color: "text-green-500",
  },
  {
    icon: BookOpen,
    label: "EPUB",
    description: "Open and edit existing EPUBs",
    href: "/convert/epub",
    color: "text-teal-500",
  },
];

export function FormatCards() {
  return (
    <section className="container px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold">Convert From Any Format</h2>
        <p className="text-muted-foreground mt-2">
          Drop in your file and PageSmith handles the rest
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {formats.map((format) => (
          <Link key={format.label} href={format.href}>
            <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer h-full">
              <format.icon className={`h-8 w-8 mb-3 ${format.color}`} />
              <h3 className="font-semibold text-lg">{format.label}</h3>
              <p className="text-sm text-muted-foreground mt-1">{format.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
