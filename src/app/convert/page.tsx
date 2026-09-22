"use client";

import Link from "next/link";
import { FileText, FileType, Code, FileCode, AlignLeft, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";

const formats = [
  { icon: FileText, label: "PDF", href: "/convert/pdf" },
  { icon: FileType, label: "DOCX", href: "/convert/docx" },
  { icon: Code, label: "Markdown", href: "/convert/markdown" },
  { icon: FileCode, label: "HTML", href: "/convert/html" },
  { icon: AlignLeft, label: "TXT", href: "/convert/txt" },
  { icon: BookOpen, label: "EPUB", href: "/convert/epub" },
];

export default function ConvertHub() {
  return (
    <div className="container px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="heading-lg">Convert to EPUB</h1>
        <p className="body-md-loose text-muted-foreground mt-2">
          Choose your source format to begin conversion
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {formats.map((format) => (
          <Link key={format.label} href={format.href}>
            <Card className="p-6 hover:bg-muted/30 transition-colors cursor-pointer text-center">
              <div className="mb-3 mx-auto w-fit rounded-lg bg-muted p-2.5">
                <format.icon className="h-8 w-8 text-foreground" />
              </div>
              <h3 className="heading-sm">{format.label}</h3>
              <p className="body-sm text-muted-foreground mt-1">→ EPUB</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
