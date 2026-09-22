"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { FileUp, ArrowRight, ShieldCheck, Zap, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useProjectStore } from "@/lib/store/project";

const ACCEPTED = ".pdf,.docx,.md,.markdown,.html,.htm,.txt,.epub";

export function Hero() {
  const router = useRouter();
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const { createProject } = useProjectStore();

  const handleFile = useCallback(
    async (file: File) => {
      setParsing(true);
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const formatMap: Record<string, string> = {
          pdf: "pdf",
          docx: "docx",
          md: "md",
          markdown: "md",
          html: "html",
          htm: "html",
          txt: "txt",
          epub: "epub",
        };
        const format = formatMap[ext];
        if (!format) {
          alert("Unsupported file format");
          return;
        }

        const projectName = file.name.replace(/\.[^.]+$/, "");
        createProject(projectName);

        const formData = new FormData();
        formData.append("file", file);

        sessionStorage.setItem("pendingParse", JSON.stringify({ format, projectName }));
        const reader = new FileReader();
        reader.onload = () => {
          sessionStorage.setItem("pendingFileData", reader.result as string);
          sessionStorage.setItem("pendingFileName", file.name);
          router.push(`/convert/${format}`);
        };
        reader.readAsDataURL(file);
      } finally {
        setParsing(false);
      }
    },
    [createProject, router]
  );

  return (
    <section className="relative overflow-hidden">
      <div className="container px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-none border px-3 py-1 text-xs text-muted-foreground mb-6">
          <Sparkles className="h-3 w-3" />
          Free · Local · AI-Powered
        </div>

        <h1 className="display mb-6">
          Craft Beautiful EPUB Books
          <br />
          From Any Format
        </h1>

        <p className="body-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          Convert PDF, DOCX, Markdown, HTML, TXT, and EPUB files into clean, structured ebooks.
          Edit chapters, translate with AI, and export — all running locally in your browser.
        </p>

        <div
          className={`relative max-w-xl mx-auto rounded-lg border border-dashed p-8 sm:p-12 transition-all cursor-pointer group ${
            dragOver
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-input hover:border-primary/50 hover:bg-muted/30"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ACCEPTED;
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFile(file);
            };
            input.click();
          }}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-lg bg-muted p-4 group-hover:bg-secondary transition-colors">
              <FileUp className="h-8 w-8 text-foreground" />
            </div>
            <div>
              <p className="font-medium text-lg">
                {parsing ? "Parsing..." : "Drop your file here"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse · PDF, DOCX, MD, HTML, TXT, EPUB
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/convert" className={buttonVariants({ size: "lg" })}>
            Open Converter <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link href="/editor" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Start with Blank Book
          </Link>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-foreground" />
            Files stay local
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-foreground" />
            No account needed
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-foreground" />
            AI-powered editing
          </div>
        </div>
      </div>
    </section>
  );
}
