"use client";

import Link from "next/link";
import { FileText, FileType, Code, FileCode, AlignLeft, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";

const formats = [
  { icon: FileText, label: "PDF", href: "/convert/pdf", color: "text-red-500" },
  { icon: FileType, label: "DOCX", href: "/convert/docx", color: "text-blue-500" },
  { icon: Code, label: "Markdown", href: "/convert/markdown", color: "text-purple-500" },
  { icon: FileCode, label: "HTML", href: "/convert/html", color: "text-orange-500" },
  { icon: AlignLeft, label: "TXT", href: "/convert/txt", color: "text-green-500" },
  { icon: BookOpen, label: "EPUB", href: "/convert/epub", color: "text-teal-500" },
];

export default function ConvertHub() {
  return (
    <div className="container px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">Convert to EPUB</h1>
        <p className="text-muted-foreground mt-2">
          Choose your source format to begin conversion
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {formats.map((format) => (
          <Link key={format.label} href={format.href}>
            <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer text-center">
              <format.icon className={`h-10 w-10 mx-auto mb-3 ${format.color}`} />
              <h3 className="font-semibold text-lg">{format.label}</h3>
              <p className="text-sm text-muted-foreground mt-1">→ EPUB</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
