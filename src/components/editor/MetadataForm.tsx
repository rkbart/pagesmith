"use client";

import { useMemo } from "react";
import { useProjectStore } from "@/lib/store/project";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Book } from "lucide-react";
import { plainText } from "@/lib/utils/library-search";
import type { BookMetadata } from "@/types/project";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "ru", label: "Russian" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "tr", label: "Turkish" },
];

/** Label + control pair with a uniform rhythm. */
function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function MetadataForm() {
  const { project, setMetadata } = useProjectStore();
  const chapters = project?.chapters ?? [];

  // Derived stats, not stored: word count + reading-time estimate.
  const stats = useMemo(() => {
    const text = chapters
      .map((c) => `${c.title}\n${plainText(c.content)}`)
      .join("\n");
    const words = text.split(/\s+/).filter(Boolean).length;
    return { words, minutes: Math.max(1, Math.round(words / 200)) };
  }, [chapters]);

  if (!project) return null;

  // Defensive: shelf payloads from older builds may lack the metadata block.
  const meta: BookMetadata = project.metadata ?? {
    title: project.name,
    author: "",
    language: "en",
    description: "",
  };
  const set = (patch: Partial<BookMetadata>) => setMetadata(patch);
  const text = (
    key: keyof BookMetadata,
    value: string | undefined,
    placeholder?: string
  ) => (
    <Input
      id={key}
      value={value ?? ""}
      onChange={(e) => set({ [key]: e.target.value })}
      placeholder={placeholder}
      className="overflow-x-auto"
    />
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-brass/10">
            <Book className="size-4 text-brass" aria-hidden="true" />
          </span>
          <h3 className="font-heading text-lg">Book metadata</h3>
        </div>
        <p className="code text-muted-foreground" aria-live="polite">
          {stats.words.toLocaleString()} words · ~{stats.minutes} min read
        </p>
      </div>

{/* ---- Core: always visible ---- */}
      <Accordion multiple={false} defaultValue={["core"]}>
        <AccordionItem value="core">
          <AccordionTrigger>Core</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 gap-4">
              <Field id="title" label="Title *">
                {text("title", meta.title, "Book title")}
              </Field>
              <Field id="subtitle" label="Subtitle">
                {text("subtitle", meta.subtitle, "Explanatory secondary title")}
              </Field>
              <Field id="author" label="Author *">
                {text("author", meta.author, "Author name")}
              </Field>
              <Field id="language" label="Language *">
                <Select
                  value={meta.language || "en"}
                  onValueChange={(v) => v && set({ language: v })}
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                id="direction"
                label="Reading direction"
                hint="Right-to-left sets page-progression-direction in the EPUB."
              >
                <Select
                  value={meta.direction ?? "ltr"}
                  onValueChange={(v) => v && set({ direction: v as "ltr" | "rtl" })}
                >
                  <SelectTrigger id="direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ltr">Left to right</SelectItem>
                    <SelectItem value="rtl">Right to left</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field id="exportFileName" label="Export file name" hint="Blank uses the title.">
                {text("exportFileName", meta.exportFileName, "my-book")}
              </Field>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="contributors">
          <AccordionTrigger>Contributors</AccordionTrigger>
          <AccordionContent>
            <p className="-mt-1 mb-4 text-sm text-muted-foreground">
              Distinct EPUB roles — translators and illustrators no longer
              belong in the Author field.
            </p>
            <div className="grid grid-cols-1 gap-4">
              <Field id="translator" label="Translator">
                {text("translator", meta.translator, "Translated by …")}
              </Field>
              <Field id="editor" label="Editor">
                {text("editor", meta.editor, "Edited by …")}
              </Field>
              <Field id="illustrator" label="Illustrator">
                {text("illustrator", meta.illustrator, "Illustrated by …")}
              </Field>
              <Field id="coverDesigner" label="Cover designer">
                {text("coverDesigner", meta.coverDesigner, "Cover by …")}
              </Field>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="publishing">
          <AccordionTrigger>Publishing</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 gap-4">
              <Field id="publisher" label="Publisher">
                {text("publisher", meta.publisher, "Publisher name")}
              </Field>
              <Field id="date" label="Publication date" hint="YYYY-MM-DD">
                {text("date", meta.date, "2026-09-23")}
              </Field>
              <Field id="isbn" label="ISBN">
                {text("isbn", meta.isbn, "978-0-00-000000-0")}
              </Field>
              <Field id="edition" label="Edition / volume" hint="e.g. 2nd edition, Vol. II">
                {text("edition", meta.edition, "1st edition")}
              </Field>
              <Field id="rights" label="Rights / copyright">
                {text("rights", meta.rights, "© 2026 …, All rights reserved")}
              </Field>
              <Field id="producer" label="Producer" hint="The ebook producer.">
                {text("producer", meta.producer, "Produced by …")}
              </Field>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="discovery">
          <AccordionTrigger>Discovery</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 gap-4">
              <Field id="subject" label="Subject">
                {text("subject", meta.subject, "Fiction")}
              </Field>
              <Field
                id="keywords"
                label="Keywords"
                hint="Comma-separated — each becomes a subject entry."
              >
                {text("keywords", meta.keywords, "dragons, maps, quests")}
              </Field>
              <Field
                id="category"
                label="Subject category"
                hint="BISAC-style code, stored with authority."
              >
                {text("category", meta.category, "FIC009000")}
              </Field>
              <Field
                id="audience"
                label="Target audience"
                hint="e.g. Adult, Young Adult, Children (8–12)."
              >
                {text("audience", meta.audience, "Adult")}
              </Field>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="series">
          <AccordionTrigger>Series</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 gap-4">
              <Field id="seriesName" label="Series name">
                {text("seriesName", meta.seriesName, "The Bound Trilogy")}
              </Field>
              <div className="space-y-2">
                <Label htmlFor="seriesPosition">Series position</Label>
                <Input
                  id="seriesPosition"
                  value={meta.seriesPosition ?? ""}
                  disabled={!meta.seriesName?.trim()}
                  onChange={(e) => set({ seriesPosition: e.target.value })}
                  placeholder="2"
                />
                <p className="text-xs text-muted-foreground">
                  Needs a series name first.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
