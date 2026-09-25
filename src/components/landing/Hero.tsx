"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import {
  FileUp,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { stageFileForConvert, ACCEPTED_DROP } from "@/lib/utils/handoff";

const trust = [
  { icon: ShieldCheck, label: "Files never leave your device" },
  { icon: Zap, label: "No account, no upload" },
  { icon: Sparkles, label: "AI tools built in" },
];

export function Hero() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [staging, setStaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setStaging(true);
      setError(null);
      // Stage the file, then route — /convert/[format] picks it up and
      // parses immediately. No re-drop needed.
      const format = await stageFileForConvert(file);
      if (!format) {
        setStaging(false);
        setError(
          "That format isn't on the press yet — try PDF, DOCX, MD, HTML, TXT or EPUB."
        );
        return;
      }
      router.push(`/convert/${format}`);
    },
    [router]
  );

  return (
    <section className="relative overflow-hidden">
      {/* warm ink-wash backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-10%] size-[420px] rounded-full bg-brass-soft/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-40%] left-[-10%] size-[380px] rounded-full bg-secondary/70 blur-3xl"
      />

      <div className="container relative px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* Copy */}
          <div>
            <p className="eyebrow mb-4">The browser bindery</p>
            <h1 className="display">
              Bind your words into a finished&nbsp;book.
            </h1>
            <p className="body-lg text-muted-foreground mt-5 max-w-xl">
              Drop a PDF, DOCX, Markdown, HTML, TXT or EPUB manuscript.
              PageSmith detects your chapters, hands you a full editing
              workbench with AI tools, and presses it into a clean EPUB 3 —
              everything stays on your device.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/convert"
                className={`${buttonVariants({ variant: "brass", size: "lg" })} w-full justify-center sm:w-auto`}
              >
                Bind a book <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/editor"
                className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-6 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 w-full justify-center sm:w-auto"
              >
                Open the Forge
              </Link>
            </div>

            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2">
              {trust.map((t) => (
                <li key={t.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <t.icon className="size-4 text-brass" aria-hidden="true" />
                  {t.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Dropzone — styled as a manuscript sheet */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop a manuscript file to import, or press Enter to browse"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onClick={() => inputRef.current?.click()}
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
            className="relative rounded-2xl border bg-paper p-3 shadow-lift outline-none cursor-pointer transition-transform duration-200 hover:-translate-y-1 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div
              className={`rounded-xl border-2 border-dashed p-8 sm:p-10 text-center transition-colors ${
                dragOver ? "border-brass bg-brass/5" : "border-brass/30"
              }`}
            >
              <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-brass/10">
                <FileUp className="size-6 text-brass" aria-hidden="true" />
              </div>
              <p className="font-heading text-xl">
                {staging ? "Warming the press…" : "Drop a manuscript on the press"}
              </p>
              <p className="body-sm text-muted-foreground mt-1.5">
                or click to browse — PDF, DOCX, MD, HTML, TXT, EPUB
              </p>
              {error && (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between px-2 pt-3 pb-1">
              <span className="code text-muted-foreground">EPUB 3 out</span>
              <span className="code text-muted-foreground">Nothing uploaded</span>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_DROP}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
