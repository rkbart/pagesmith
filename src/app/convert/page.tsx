"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  FileText,
  FileType2,
  Hash,
  FileCode,
  AlignLeft,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { FileDropZone } from "@/components/converter/FileDropZone";
import { stageFileForConvert, ACCEPTED_DROP } from "@/lib/utils/handoff";

const formats = [
  { icon: FileText, label: "PDF", href: "/convert/pdf" },
  { icon: FileType2, label: "DOCX", href: "/convert/docx" },
  { icon: Hash, label: "Markdown", href: "/convert/markdown" },
  { icon: FileCode, label: "HTML", href: "/convert/html" },
  { icon: AlignLeft, label: "TXT", href: "/convert/txt" },
  { icon: BookOpen, label: "EPUB", href: "/convert/epub" },
];

export default function ConvertHub() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleAnyFile(file: File) {
    setError(null);
    const format = await stageFileForConvert(file);
    if (!format) {
      setError("Unsupported format — try PDF, DOCX, Markdown, HTML, TXT or EPUB.");
      return;
    }
    router.push(`/convert/${format}`);
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mb-10 text-center">
        <p className="eyebrow mb-2">The import desk</p>
        <h1 className="heading-lg">Bring in a manuscript</h1>
        <p className="body-md-loose mt-2 text-muted-foreground">
          Drop any file below — we&apos;ll detect the format — or choose your source.
        </p>
      </div>

      <FileDropZone
        accept={ACCEPTED_DROP}
        onFile={handleAnyFile}
        label="Drop any manuscript here"
      />

      {error && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="mt-10">
        <p className="eyebrow mb-4 text-center">Or pick your source</p>
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
          {formats.map((format) => (
            <Link key={format.label} href={format.href}>
              <Card className="h-full items-center gap-2 p-5 text-center transition-all hover:-translate-y-0.5 hover:border-brass/40 hover:shadow-lift">
                <div className="mx-auto grid size-11 place-items-center rounded-xl bg-brass/10">
                  <format.icon className="size-5 text-brass" aria-hidden="true" />
                </div>
                <h3 className="heading-sm">{format.label}</h3>
                <p className="code text-muted-foreground">→ EPUB</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
