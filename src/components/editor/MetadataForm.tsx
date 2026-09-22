"use client";

import { useProjectStore } from "@/lib/store/project";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export function MetadataForm() {
  const { project, setMetadata } = useProjectStore();

  if (!project) return null;

  const meta = project.metadata;

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <h3 className="font-semibold text-lg">Book Metadata</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={meta.title}
            onChange={(e) => setMetadata({ title: e.target.value })}
            placeholder="Book title"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="author">Author</Label>
          <Input
            id="author"
            value={meta.author}
            onChange={(e) => setMetadata({ author: e.target.value })}
            placeholder="Author name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select
            value={meta.language}
            onValueChange={(v) => v && setMetadata({ language: v })}
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
        </div>
        <div className="space-y-2">
          <Label htmlFor="isbn">ISBN (optional)</Label>
          <Input
            id="isbn"
            value={meta.isbn ?? ""}
            onChange={(e) => setMetadata({ isbn: e.target.value })}
            placeholder="978-0-00-000000-0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="publisher">Publisher (optional)</Label>
          <Input
            id="publisher"
            value={meta.publisher ?? ""}
            onChange={(e) => setMetadata({ publisher: e.target.value })}
            placeholder="Publisher name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject / Tags (optional)</Label>
          <Input
            id="subject"
            value={meta.subject ?? ""}
            onChange={(e) => setMetadata({ subject: e.target.value })}
            placeholder="Fiction, Fantasy, Adventure"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={meta.description}
          onChange={(e) => setMetadata({ description: e.target.value })}
          placeholder="Book description for stores and readers"
          rows={3}
        />
      </div>
    </div>
  );
}
