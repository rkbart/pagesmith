"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store/project";
import {
  translateText,
  editChapter,
  calculateReadability,
  loadAIConfig,
} from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Languages, Wand2, BarChart3, Copy, Check, Sparkles, Lock, Globe } from "lucide-react";

type AITool = "translate" | "edit" | "readability";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "tr", label: "Turkish" },
];

const EDIT_STYLES = [
  { value: "grammar", label: "Fix Grammar" },
  { value: "style", label: "Improve Style" },
  { value: "concise", label: "Make Concise" },
  { value: "formal", label: "More Formal" },
  { value: "casual", label: "More Casual" },
];

export function AIPanel() {
  const { project, activeChapterId, updateChapter } = useProjectStore();
  const [tool, setTool] = useState<AITool>("readability");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [targetLang, setTargetLang] = useState("es");
  const [editStyle, setEditStyle] = useState("grammar");

  const activeChapter = project?.chapters.find((c) => c.id === activeChapterId);

  async function runAI() {
    if (!activeChapter) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const config = loadAIConfig();
    const plainText = activeChapter.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    try {
      if (tool === "readability") {
        const metrics = calculateReadability(plainText);
        setResult(
          JSON.stringify(
            {
              "Flesch-Kincaid Grade Level": metrics.fleschKincaidGrade,
              "Flesch Reading Ease": metrics.fleschReadingEase,
              "Average Sentence Length": `${metrics.averageSentenceLength} words`,
              "Average Word Length": `${metrics.averageWordLength} letters`,
              "Word Count": metrics.wordCount,
              "Sentence Count": metrics.sentenceCount,
              "Reading Level": getReadingLevel(metrics.fleschKincaidGrade),
            },
            null,
            2
          )
        );
      } else if (tool === "translate") {
        const result = await translateText(
          { text: plainText, targetLang: targetLang as never, sourceLang: "en" },
          config
        );
        setResult(result.translatedText);
      } else if (tool === "edit") {
        const result = await editChapter({ text: plainText, style: editStyle as never }, config);
        setResult(result.editedText);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  }

  function applyResult() {
    if (!activeChapter || !result) return;
    if (tool === "readability") return;
    updateChapter(activeChapter.id, { content: `<p>${result.replace(/\n/g, "</p>\n<p>")}</p>` });
    setResult(null);
  }

  function copyResult() {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-brass/10">
            <Sparkles className="size-4 text-brass" aria-hidden="true" />
          </span>
          <h3 className="font-heading text-lg">AI Tools</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          <span className="inline-flex items-center gap-1">
            {loadAIConfig().provider === "browser" ? (
              <Lock className="size-3" aria-hidden="true" />
            ) : (
              <Globe className="size-3" aria-hidden="true" />
            )}
            {loadAIConfig().provider === "browser" ? "Local" : "API"}
          </span>
        </Badge>
      </div>

      {!activeChapter ? (
        <p className="text-sm text-muted-foreground">Select a chapter to use AI tools.</p>
      ) : (
        <div className="space-y-4">
          {/* Tool selector */}
          <div className="flex gap-2">
            {(
              [
                { value: "readability", label: "Readability", icon: BarChart3 },
                { value: "translate", label: "Translate", icon: Languages },
                { value: "edit", label: "Edit", icon: Wand2 },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={tool === value ? "brass" : "outline"}
                size="sm"
                onClick={() => {
                  setTool(value);
                  setResult(null);
                  setError(null);
                }}
              >
                <Icon className="h-4 w-4 mr-1" />
                {label}
              </Button>
            ))}
          </div>

          {/* Options */}
          {tool === "translate" && (
            <div className="flex items-center gap-3">
              <Label className="text-sm">Target language:</Label>
              <Select
                value={targetLang}
                onValueChange={(v) => v && setTargetLang(v)}
              >
                <SelectTrigger className="w-40">
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
          )}

          {tool === "edit" && (
            <div className="flex items-center gap-3">
              <Label className="text-sm">Style:</Label>
              <Select
                value={editStyle}
                onValueChange={(v) => v && setEditStyle(v)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDIT_STYLES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Run button */}
          <Button onClick={runAI} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : tool === "readability" ? (
              "Analyze Readability"
            ) : tool === "translate" ? (
              `Translate to ${LANGUAGES.find((l) => l.code === targetLang)?.label}`
            ) : (
              "Edit Chapter"
            )}
          </Button>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Result:</Label>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={copyResult}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  {tool !== "readability" && (
                    <Button variant="outline" size="sm" onClick={applyResult}>
                      Apply to Chapter
                    </Button>
                  )}
                </div>
              </div>
              <Textarea
                value={result}
                readOnly
                rows={tool === "readability" ? 8 : 10}
                className="font-mono text-xs"
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function getReadingLevel(grade: number): string {
  if (grade < 6) return "Elementary (easy read)";
  if (grade < 8) return "Middle School";
  if (grade < 12) return "High School";
  if (grade < 14) return "College";
  return "Graduate / Professional";
}
