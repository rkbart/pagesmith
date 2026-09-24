"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store/project";
import {
  translateText,
  editChapter,
  calculateReadability,
  generateSummary,
  detectChaptersAI,
  analyzeConsistency,
  loadAIConfig,
} from "@/lib/ai";
import type { SummaryResult, ConsistencyResult } from "@/types/ai";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Languages, Wand2, BarChart3, Copy, Check,
  Sparkles, Lock, Globe, Undo2, BookOpen, Puzzle, Shield,
  History,   ChevronUp, Trash2,
} from "lucide-react";

type AITool = "readability" | "translate" | "edit" | "summarize" | "detect-chapters" | "consistency";

interface AIHistoryEntry {
  tool: AITool;
  result: string;
  timestamp: number;
  timeLabel: string;
}

const TOOL_LABELS: Record<AITool, string> = {
  readability: "Readability",
  translate: "Translate",
  edit: "Edit",
  summarize: "Summarize",
  "detect-chapters": "Detect Chapters",
  consistency: "Consistency",
};

const MAX_HISTORY = 10;

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
  const { project, activeChapterId, updateChapter, checkpointChapter, undoChapter, addChapter } =
    useProjectStore();
  const [tool, setTool] = useState<AITool>("readability");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<AIHistoryEntry[]>([]);

  const [targetLang, setTargetLang] = useState("es");
  const [editStyle, setEditStyle] = useState("grammar");

  const activeChapter = project?.chapters.find((c) => c.id === activeChapterId);

  function addToHistory(t: AITool, r: string) {
    const entry: AIHistoryEntry = { tool: t, result: r, timestamp: Date.now(), timeLabel: "just now" };
    setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
  }

  function restoreFromHistory(entry: AIHistoryEntry) {
    setResult(entry.result);
    setTool(entry.tool);
    setShowHistory(false);
  }

  function clearHistory() {
    setHistory([]);
  }

  async function runAI() {
    if (!project) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setApplied(false);

    const config = loadAIConfig();

    try {
      if (tool === "readability") {
        if (!activeChapter) return;
        const plainText = activeChapter.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const metrics = calculateReadability(plainText);
        const text = JSON.stringify(
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
        );
        setResult(text);
        addToHistory(tool, text);
      } else if (tool === "translate") {
        if (!activeChapter) return;
        const plainText = activeChapter.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const res = await translateText(
          { text: plainText, targetLang: targetLang as never, sourceLang: "en" },
          config
        );
        setResult(res.translatedText);
        addToHistory(tool, res.translatedText);
      } else if (tool === "edit") {
        if (!activeChapter) return;
        const plainText = activeChapter.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const res = await editChapter({ text: plainText, style: editStyle as never }, config);
        setResult(res.editedText);
        addToHistory(tool, res.editedText);
      } else if (tool === "summarize") {
        const chapters = project.chapters.map((c) => ({
          title: c.title,
          content: c.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
          id: c.id,
        }));
        if (chapters.length === 0) {
          setError("No chapters to summarize.");
          setLoading(false);
          return;
        }
        const res: SummaryResult = await generateSummary(chapters, config);
        const parts = res.chapterSummaries.map((cs) => `### ${cs.chapterId}\n\n${cs.summary}`).join("\n\n");
        const text = `${parts}\n\n---\n\n## Book Synopsis\n\n${res.bookSynopsis}`;
        setResult(text);
        addToHistory(tool, text);
      } else if (tool === "detect-chapters") {
        if (!activeChapter) return;
        const plainText = activeChapter.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const chapters = await detectChaptersAI(plainText, config);
        const text = chapters.map((ch, i) => `## Chapter ${i + 1}: ${ch.title}\n\n${ch.content}`).join("\n\n");
        setResult(text);
        addToHistory(tool, text);
      } else if (tool === "consistency") {
        const chapters = project.chapters.map((c) => ({ title: c.title, content: c.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() }));
        if (chapters.length < 2) {
          setError("Need at least 2 chapters in the project for consistency analysis.");
          setLoading(false);
          return;
        }
        const res: ConsistencyResult = await analyzeConsistency(chapters, config);
        const lines: string[] = [];
        lines.push(`## Consistency Analysis\n`);
        lines.push(res.overall);
        lines.push("");
        for (const finding of res.findings) {
          const icon = finding.type === "character" ? "👤" : finding.type === "plot" ? "📖" : "⏱️";
          lines.push(`${icon} **${finding.type.charAt(0).toUpperCase() + finding.type.slice(1)}** (${finding.severity}): ${finding.description}`);
          if (finding.chapters.length > 0) {
            lines.push(`   - Affected: ${finding.chapters.join(", ")}`);
          }
          lines.push("");
        }
        const text = lines.join("\n");
        setResult(text);
        addToHistory(tool, text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  }

  function applyResult() {
    if (!activeChapter || !result) return;
    if (tool === "readability" || tool === "consistency") return;
    checkpointChapter(activeChapter.id);
    updateChapter(activeChapter.id, { content: `<p>${result.replace(/\n/g, "</p>\n<p>")}</p>` });
    setResult(null);
    setApplied(true);
  }

  function insertSummary() {
    if (!project || !result) return;
    const synopsisMatch = result.match(/## Book Synopsis\n\n([\s\S]*)$/);
    const summaryText = synopsisMatch ? synopsisMatch[1].trim() : result;
    addChapter("Summary", `<p>${summaryText.replace(/\n/g, "</p>\n<p>")}</p>`);
    setResult(null);
  }

  function revertApply() {
    if (!activeChapter) return;
    if (undoChapter(activeChapter.id)) setApplied(false);
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
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <>
              <Badge variant="outline" className="text-xs">{history.length} recent</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="h-7 w-7 p-0"
              >
                {showHistory ? <ChevronUp className="h-4 w-4" /> : <History className="h-4 w-4" />}
              </Button>
            </>
          )}
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
      </div>

      {/* History panel */}
      {showHistory && history.length > 0 && (
        <div className="mb-4 rounded-lg border bg-muted/30 p-3 space-y-2 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Recent Results</Label>
            <Button variant="ghost" size="sm" onClick={clearHistory} className="h-6 text-xs">
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
          {history.map((entry, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded border p-2 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => restoreFromHistory(entry)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-[10px]">{TOOL_LABELS[entry.tool]}</Badge>
                  <span className="text-[10px] text-muted-foreground">{entry.timeLabel}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {entry.result.substring(0, 80).replace(/\n/g, " ")}...
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 flex-shrink-0 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setResult(entry.result);
                  setTool(entry.tool);
                  setShowHistory(false);
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {!project ? (
        <p className="text-sm text-muted-foreground">No project open. Create a project to use AI tools.</p>
      ) : (
        <div className="space-y-4">
          {/* Tool selector */}
          <div className="flex gap-2 flex-wrap">
            {(
              [
                { value: "readability" as const, label: "Readability", icon: BarChart3 },
                { value: "translate" as const, label: "Translate", icon: Languages },
                { value: "edit" as const, label: "Edit", icon: Wand2 },
                { value: "summarize" as const, label: "Summarize", icon: BookOpen },
                { value: "detect-chapters" as const, label: "Detect Chapters", icon: Puzzle },
                { value: "consistency" as const, label: "Consistency", icon: Shield },
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
                  setApplied(false);
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
            ) : tool === "summarize" ? (
              "Summarize Document"
            ) : tool === "detect-chapters" ? (
              "Detect Chapters"
            ) : tool === "consistency" ? (
              "Analyze Consistency"
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

          {/* Revert an apply the user changed their mind about */}
          {applied && !result && (
            <div className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
              <span className="text-muted-foreground">Applied to the chapter.</span>
              <Button variant="outline" size="sm" onClick={revertApply}>
                <Undo2 className="h-4 w-4 mr-1" />
                Revert
              </Button>
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
                  {tool === "summarize" ? (
                    <Button variant="outline" size="sm" onClick={insertSummary}>
                      <BookOpen className="h-4 w-4 mr-1" />
                      Insert as New Chapter
                    </Button>
                  ) : tool !== "readability" && tool !== "consistency" ? (
                    <Button variant="outline" size="sm" onClick={applyResult}>
                      Apply to Chapter
                    </Button>
                  ) : null}
                </div>
              </div>
              <Textarea
                value={result}
                readOnly
                rows={tool === "readability" ? 8 : tool === "consistency" ? 12 : 10}
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
