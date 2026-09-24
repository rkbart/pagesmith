"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProjectStore } from "@/lib/store/project";
import { useProjectHydrated } from "@/hooks/useHydrated";
import { ChapterList } from "@/components/editor/ChapterList";
import { ChapterEditor } from "@/components/editor/ChapterEditor";
import { CoverUpload } from "@/components/editor/CoverUpload";
import { MetadataForm } from "@/components/editor/MetadataForm";
import { ExportBar } from "@/components/editor/ExportBar";
import { BackToTop } from "@/components/shared/BackToTop";
import { AIPanel } from "@/components/ai/AIPanel";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildEpub } from "@/lib/epub/generate";
import { validateEpub } from "@/lib/epub/validate";
import {
  clearCachedProof,
  clearProofForProject,
  getCachedProof,
  loadProofForProject,
  originalFileIfUnedited,
  saveProofForProject,
  setCachedProof,
} from "@/lib/epub/proof-cache";
import type { ValidationIssue } from "@/types/epub";
import {
  Plus,
  Library,
  Feather,
  Loader2,
  Settings2,
  Sparkles,
  X,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  RotateCw,
} from "lucide-react";

function EditorContent() {
  const searchParams = useSearchParams();
  const {
    project,
    projects,
    activeChapterId,
    loadProject,
  } = useProjectStore();
  // Chapters live in a slide hide/reveal panel on the left (drawer on
  // mobile, collapsing sidebar on desktop).
  const [sideOpen, setSideOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches
  );

  // On mobile, picking a chapter closes the drawer. A store subscription
  // (not a render effect) so the set-state-in-effect rule stays satisfied.
  useEffect(() => {
    const unsub = useProjectStore.subscribe((state, prev) => {
      if (
        state.activeChapterId !== prev.activeChapterId &&
        typeof window !== "undefined" &&
        !window.matchMedia("(min-width: 1024px)").matches
      ) {
        setSideOpen(false);
      }
    });
    return unsub;
  }, []);

  // AI Tools live in a right slide-over so the chapter stays visible
  // while they run — no backdrop on desktop, dimmed backdrop on mobile.
  const [aiOpen, setAiOpen] = useState(false);
  // Metadata docks the same way.
  const [metaOpen, setMetaOpen] = useState(false);

  // Proof findings — collapsible inline list so fixes happen here, no
  // trip back to the Proof Desk needed.
  const router = useRouter();
  const [proofDismissed, setProofDismissed] = useState(false);
  const [proofExpanded, setProofExpanded] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [recheckError, setRecheckError] = useState<string | null>(null);
  const [liveIssues, setLiveIssues] = useState<ValidationIssue[] | null>(null);
  // Bumped when findings change outside render (recheck) so the
  // sessionStorage read below stays fresh.
  const [proofVersion, setProofVersion] = useState(0);
  const proofRaw = searchParams.get("proof");
  const proofData = proofRaw ? (() => { try { return JSON.parse(proofRaw); } catch { return null; } })() : null;

  // Findings sources, richest first: this session's in-page recheck, the
  // in-memory handoff from the Proof Desk, then the per-book
  // sessionStorage slot (survives refresh). All are matched to the book
  // on the bench; anything else is ignored.
  const severityRank = { error: 0, warning: 1, info: 2 } as const;
  const cachedProof = getCachedProof();
  const proofIssues = useMemo(() => {
    if (liveIssues) return liveIssues;
    if (cachedProof?.projectId && project && cachedProof.projectId === project.id) {
      return [...cachedProof.result.issues].sort(
        (a, b) => severityRank[a.severity] - severityRank[b.severity],
      );
    }
    if (project) {
      const stored = loadProofForProject(project.id);
      if (stored) {
        return [...stored.result.issues].sort(
          (a, b) => severityRank[a.severity] - severityRank[b.severity],
        );
      }
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveIssues, cachedProof, project, proofVersion]);

  const proofCounts = proofIssues
    ? {
        error: proofIssues.filter((i) => i.severity === "error").length,
        warning: proofIssues.filter((i) => i.severity === "warning").length,
        info: proofIssues.filter((i) => i.severity === "info").length,
      }
    : proofData;
  const proofTotal =
    (proofCounts?.error ?? 0) + (proofCounts?.warning ?? 0) + (proofCounts?.info ?? 0);
  // A recheck that comes back clean still deserves its moment.
  const recheckedClean = liveIssues !== null && liveIssues.length === 0;
  const showProof = !proofDismissed && (proofTotal > 0 || recheckedClean);

  useEffect(() => {
    setProofDismissed(false);
    setProofExpanded(false);
    setLiveIssues(null);
    setRecheckError(null);
  }, [proofRaw, project?.id]);

  // Re-proof the open book right here in the background. While the book
  // is unedited since the Proof Desk shelved it, the original dropped
  // bytes are re-validated so the proof reproduces; once edited, the
  // current state is built and proofed instead. No navigation, so this
  // also covers books that never passed through the Proof Desk.
  const runRecheck = useCallback(async () => {
    const current = useProjectStore.getState().project;
    if (!current || rechecking) return;
    setRechecking(true);
    setRecheckError(null);
    try {
      const original = originalFileIfUnedited(current.id, current.updatedAt);
      let file: File;
      if (original) {
        file = original;
      } else {
        const { blob, filename } = await buildEpub(current);
        file = new File([blob], filename, { type: "application/epub+zip" });
      }
      const validation = await validateEpub(file);
      const sorted = [...validation.issues].sort(
        (a, b) => severityRank[a.severity] - severityRank[b.severity]
      );
      setLiveIssues(sorted);
      setCachedProof({
        result: validation,
        fileName: file.name,
        projectId: current.id,
        timestamp: Date.now(),
        originalFile: file,
      });
      saveProofForProject(current.id, validation, file.name);
      setProofVersion((v) => v + 1);
      setProofDismissed(false);
      setProofExpanded(sorted.length > 0);
    } catch (err) {
      setRecheckError(err instanceof Error ? err.message : "Re-check failed");
    } finally {
      setRechecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rechecking]);

  // Dismiss clears every copy (live, in-memory, per-book slot) and drops
  // the ?proof= param, so a refresh can't resurrect the banner.
  const dismissProof = useCallback(() => {
    const current = useProjectStore.getState().project;
    if (current) {
      clearProofForProject(current.id);
      if (getCachedProof()?.projectId === current.id) clearCachedProof();
    }
    setLiveIssues(null);
    setProofDismissed(true);
    setProofExpanded(false);
    router.replace("/editor");
  }, [router]);

  useEffect(() => {
    if (!aiOpen && !metaOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAiOpen(false);
        setMetaOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aiOpen, metaOpen]);

  // State lives in IndexedDB, which hydrates asynchronously after mount — gate
  // the UI on it so the empty state never flashes and the auto-load below
  // always runs against restored data.
  const hydrated = useProjectHydrated();

  useEffect(() => {
    if (!project && projects.length > 0) {
      const mostRecent = [...projects].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      loadProject(mostRecent.id);
    }
  }, [project, projects, loadProject]);

  if (!hydrated) {
    return (
      <div className="container flex items-center justify-center gap-2 py-32 text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-brass" aria-hidden="true" />
        Opening the bindery…
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-brass/10 shadow-panel">
          <Feather className="size-7 text-brass" aria-hidden="true" />
        </div>
        <h1 className="heading-lg mb-3">The bench is clear</h1>
        <p className="body-md-loose text-muted-foreground mb-8">
          Bring in a manuscript or an EPUB to start binding.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/convert" className={buttonVariants({ variant: "brass", size: "lg" })}>
            <Plus className="mr-2 h-4 w-4" /> Import a manuscript
          </Link>
          <Link href="/library" className={buttonVariants({ variant: "outline", size: "lg" })}>
            <Library className="mr-2 h-4 w-4" aria-hidden="true" /> Browse your library
          </Link>
        </div>
      </div>
    );
  }

  const activeChapter = project.chapters.find((c) => c.id === activeChapterId);

  return (
      <div className="container px-4 sm:px-6 lg:px-8 py-6">
        {showProof && (
          <Card className="mb-4 border-amber-500/30 bg-amber-500/5 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <p className="font-heading min-w-0 flex-1 text-sm">
                {recheckedClean
                  ? "Re-check found no issues — this book is ready to ship."
                  : `The Proof Desk found ${proofCounts.error} error${proofCounts.error !== 1 ? "s" : ""}${
                      proofCounts.warning > 0 ? ` and ${proofCounts.warning} warning${proofCounts.warning !== 1 ? "s" : ""}` : ""
                    }${
                      proofCounts.info > 0 ? ` and ${proofCounts.info} info` : ""
                    } in this book.`}
              </p>
              <div className="flex shrink-0 items-center gap-1">
                {proofIssues && proofIssues.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setProofExpanded((v) => !v)}
                    aria-expanded={proofExpanded}
                    aria-label={proofExpanded ? "Hide findings" : "Show findings"}
                    title={proofExpanded ? "Hide findings" : "Show findings"}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ChevronDown
                      className={`size-4 transition-transform ${proofExpanded ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void runRecheck()}
                  disabled={rechecking}
                  aria-label="Re-check this book"
                  title="Re-check this book"
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  <RotateCw
                    className={`size-4 ${rechecking ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  onClick={dismissProof}
                  aria-label="Dismiss"
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            {recheckError && (
              <p className="mt-2 text-xs text-destructive">{recheckError}</p>
            )}
            {proofExpanded && proofIssues && proofIssues.length > 0 && (
              <ul className="mt-3 space-y-2">
                {proofIssues.map((issue, i) => (
                  <li
                    key={i}
                    className={`rounded-lg border p-2.5 text-sm ${
                      issue.severity === "error"
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : issue.severity === "warning"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "border-border bg-secondary/60 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 w-16 shrink-0 text-xs font-semibold capitalize">
                        {issue.severity}
                      </span>
                      <span>
                        {issue.message}
                        {issue.file && (
                          <span className="code block opacity-70">{issue.file}</span>
                        )}
                      </span>
                    </div>
                    {issue.fix && (
                      <p className="mt-1.5 text-xs opacity-90">
                        <span className="font-semibold">How to fix: </span>
                        {issue.fix}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!proofIssues && (
              <p className="body-sm mt-2 text-muted-foreground">
                The detailed findings didn&apos;t carry over (the page was
                reloaded). Hit re-check above to run the proof again right here.
              </p>
            )}
          </Card>
        )}
        <ExportBar
        project={project}
        aiOpen={aiOpen}
        onToggleAI={() => { setMetaOpen(false); setAiOpen((v) => !v); }}
        metaOpen={metaOpen}
        onToggleMeta={() => { setAiOpen(false); setMetaOpen((v) => !v); }}
        chaptersOpen={sideOpen}
        onToggleChapters={() => setSideOpen((v) => !v)}
        chaptersCount={project.chapters.length}
      />

      <div className="mt-6 flex items-start gap-6">
        {/* Desktop sidebar: always visible. Chapters hide only behind the
            mobile drawer below. */}
        <aside className="hidden w-70 shrink-0 lg:block">
          <div className="space-y-3">
            <div className="flex items-center gap-1 rounded-xl border bg-card px-2 py-1.5 shadow-panel">
              <span className="eyebrow min-w-0 flex-1 truncate px-1">
                Chapters ({project.chapters.length})
              </span>
            </div>
            <ChapterList />
          </div>
        </aside>

        {/* Mobile drawer. */}
        <div
          className={`fixed inset-0 z-50 lg:hidden ${sideOpen ? "" : "pointer-events-none"}`}
          aria-hidden={!sideOpen}
        >
          <div
            onClick={() => setSideOpen(false)}
            className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${sideOpen ? "opacity-100" : "opacity-0"}`}
          />
          <aside
            className={`absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-background shadow-panel transition-transform duration-200 ${sideOpen ? "translate-x-0" : "-translate-x-full"}`}
            role="dialog"
            aria-label="Chapters"
          >
            <div className="flex items-center gap-1 border-b px-3 py-2.5">
              <span className="eyebrow min-w-0 flex-1 truncate px-1">
                Chapters ({project.chapters.length})
              </span>
              <button
                type="button"
                onClick={() => setSideOpen(false)}
                aria-label="Close chapters"
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <ChapterList />
            </div>
          </aside>
        </div>

        <div className="min-w-0 flex-1 lg:pr-2">
          <CoverUpload />
          <div className="mt-4">
          {activeChapter ? (
            <ChapterEditor key={activeChapter.id} chapter={activeChapter} />
          ) : (
            <div className="rounded-2xl border border-dashed border-brass/30 bg-paper p-12 text-center text-muted-foreground">
              <p className="mb-4 font-heading text-lg">No chapter on the bench</p>
            </div>
          )}
          </div>
        </div>

        {/* Desktop AI dock: squeezes the editor left with a smooth width
            transition instead of overlaying it. Mobile keeps the overlay
            below. */}
        <aside
          className={`hidden shrink-0 overflow-hidden transition-all duration-200 lg:block ${
            aiOpen ? "w-[400px] opacity-100" : "w-0 opacity-0"
          }`}
          aria-hidden={!aiOpen}
        >
          <div className="w-[400px] overflow-hidden rounded-xl border bg-card shadow-panel">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <Sparkles className="size-4 shrink-0 text-brass" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                AI Tools
                {activeChapter && (
                  <span className="text-muted-foreground"> · {activeChapter.title}</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setAiOpen(false)}
                aria-label="Close AI Tools"
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-4">
              <AIPanel />
            </div>
          </div>
        </aside>

        {/* Desktop metadata dock, same pattern. */}
        <aside
          className={`hidden shrink-0 overflow-hidden transition-all duration-200 lg:block ${
            metaOpen ? "w-[400px] opacity-100" : "w-0 opacity-0"
          }`}
          aria-hidden={!metaOpen}
        >
          <div className="w-[400px] overflow-hidden rounded-xl border bg-card shadow-panel">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <Settings2 className="size-4 shrink-0 text-brass" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                Metadata
              </span>
              <button
                type="button"
                onClick={() => setMetaOpen(false)}
                aria-label="Close metadata"
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-4">
              <MetadataForm />
            </div>
          </div>
        </aside>
      </div>
      {/* AI Tools overlay (mobile only). */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${aiOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!aiOpen}
      >
        <div
          onClick={() => setAiOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 lg:hidden ${aiOpen ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l bg-background shadow-panel transition-transform duration-200 ${aiOpen ? "translate-x-0" : "translate-x-full"}`}
          role="dialog"
          aria-label="AI Tools"
        >
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Sparkles className="size-4 shrink-0 text-brass" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              AI Tools
              {activeChapter && (
                <span className="text-muted-foreground"> · {activeChapter.title}</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setAiOpen(false)}
              aria-label="Close AI Tools"
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <AIPanel />
          </div>
        </aside>
      </div>
      {/* Metadata overlay (mobile only). */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${metaOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!metaOpen}
      >
        <div
          onClick={() => setMetaOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${metaOpen ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l bg-background shadow-panel transition-transform duration-200 ${metaOpen ? "translate-x-0" : "translate-x-full"}`}
          role="dialog"
          aria-label="Metadata"
        >
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Settings2 className="size-4 shrink-0 text-brass" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              Metadata
            </span>
            <button
              type="button"
              onClick={() => setMetaOpen(false)}
              aria-label="Close metadata"
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <MetadataForm />
          </div>
        </aside>
      </div>
      <BackToTop />
    </div>
  );
}

// useSearchParams() needs a Suspense boundary for static prerendering.
export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-16 text-center">
          <p className="font-heading mt-4 text-lg">Opening the studio…</p>
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  );
}
