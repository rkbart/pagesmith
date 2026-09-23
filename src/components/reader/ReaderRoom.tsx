"use client";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  List,
  Minus,
  Plus,
} from "lucide-react";
import { ReaderToc } from "./ReaderToc";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProjectStore } from "@/lib/store/project";
import {
  DEFAULT_READER_PREFS,
  FONT_FAMILIES,
  FONT_SIZE_STEPS,
  loadPosition,
  loadReaderPrefs,
  savePosition,
  saveReaderPrefs,
  type FontFamily,
  type FontScale,
  type ReaderPrefs,
} from "@/lib/utils/reading-progress";
import type { Project } from "@/types/project";

const SCALES: FontScale[] = ["sm", "md", "lg"];
const SCALE_LABELS: Record<FontScale, string> = { sm: "S", md: "M", lg: "L" };
/** Scroll events fire constantly; bookmarks are written on a trailing edge. */
const SCROLL_SAVE_DELAY = 400;

function TypeControls({
  prefs,
  onStep,
  onFamily,
  onReset,
  className,
}: {
  prefs: ReaderPrefs;
  onStep: (delta: number) => void;
  onFamily: (family: FontFamily) => void;
  onReset: () => void;
  className?: string;
}) {
  const scaleIndex = SCALES.indexOf(prefs.fontScale);

  return (
    <div className={className}>
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Smaller text"
          disabled={scaleIndex === 0}
          onClick={() => onStep(-1)}
        >
          <Minus />
        </Button>
        <span className="code w-6 text-center text-muted-foreground" aria-hidden="true">
          {SCALE_LABELS[prefs.fontScale]}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Larger text"
          disabled={scaleIndex === SCALES.length - 1}
          onClick={() => onStep(1)}
        >
          <Plus />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Button
          variant={prefs.fontFamily === "serif" ? "secondary" : "ghost"}
          size="icon-sm"
          aria-label="Serif typeface"
          aria-pressed={prefs.fontFamily === "serif"}
          onClick={() => onFamily("serif")}
        >
          <span className="font-heading text-sm">Aa</span>
        </Button>
        <Button
          variant={prefs.fontFamily === "sans" ? "secondary" : "ghost"}
          size="icon-sm"
          aria-label="Sans-serif typeface"
          aria-pressed={prefs.fontFamily === "sans"}
          onClick={() => onFamily("sans")}
        >
          <span className="text-sm">Aa</span>
        </Button>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Button variant="ghost" size="sm" className="h-8 px-2.5" onClick={onReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}

/**
 * The reading room for one book.
 *
 * Chapter selection is owned *here* (not by the store's `activeChapterId`) so
 * the first paint is already the right chapter — otherwise the reader would
 * flash chapter one for a frame before the bookmark took effect. The store is
 * kept in sync afterwards, so the editor opens on the chapter you stopped at.
 *
 * Reading the bookmark during render is safe because callers gate rendering on
 * `useProjectHydrated()`: this component only ever mounts after React has
 * finished hydrating, so there is no server/client markup to disagree with.
 */
export function ReaderRoom({ project }: { project: Project }) {
  const setActiveChapter = useProjectStore((state) => state.setActiveChapter);
  const [prefs, setPrefs] = useState<ReaderPrefs>(() => loadReaderPrefs());
  const [tocOpen, setTocOpen] = useState(false);
  const saveTimer = useRef<number | null>(null);


  const chapters = useMemo(
    () => [...project.chapters].sort((a, b) => a.order - b.order),
    [project.chapters]
  );

  const [chapterId, setChapterId] = useState<string | null>(() => {
    const bookmark = loadPosition(project.id);
    if (bookmark && chapters.some((c) => c.id === bookmark.chapterId)) {
      return bookmark.chapterId;
    }
    return chapters[0]?.id ?? null;
  });

  const index = Math.max(
    0,
    chapters.findIndex((chapter) => chapter.id === chapterId)
  );
  const chapter = chapters[index];
  const total = chapters.length;

  /** Move to a chapter; the scroll effect below does the repositioning. */
  const goTo = useCallback(
    (nextIndex: number) => {
      const target = chapters[nextIndex];
      if (target) setChapterId(target.id);
    },
    [chapters]
  );

  const goPrev = useCallback(() => {
    if (index > 0) goTo(index - 1);
  }, [index, goTo]);

  const goNext = useCallback(() => {
    if (index < total - 1) goTo(index + 1);
  }, [index, total, goTo]);

  // Keep the editor's "current chapter" in step with the reader.
  useEffect(() => {
    if (chapterId) setActiveChapter(chapterId);
  }, [chapterId, setActiveChapter]);

  // ---- Scroll: restore the bookmark, or start a new chapter at the top ----
  useEffect(() => {
    const saved = loadPosition(project.id);
    const ratio = saved && saved.chapterId === chapterId ? saved.scrollRatio : 0;
    // Wait a frame so the incoming chapter is laid out before jumping.
    const frame = requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      // Disable smooth-scroll behavior while we restore the bookmark — we want
      // the chapter to appear first, then jump. A pending smooth animation would
      // start mid-flight and drag the page over several seconds.
      const oldBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo({ top: Math.min(1, Math.max(0, ratio)) * Math.max(0, max) });
      // Best-effort restore: if the global sheet re-applies smooth after us,
      // we leave the inline value so the next manual scroll in this tab is
      // unaffected. The reading progress bar is animated separately so it isn't
      // impacted by document-level scroll behavior.
      requestAnimationFrame(() => {
        document.documentElement.style.scrollBehavior = oldBehavior || "";
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [chapterId, project.id]);

  // ---- Keep the bookmark current while scrolling -------------------------
  useEffect(() => {
    function handleScroll() {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        if (!chapterId) return;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        savePosition(project.id, {
          chapterId,
          scrollRatio: max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0,
        });
      }, SCROLL_SAVE_DELAY);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [project.id, chapterId]);

  // ---- Typography preferences -------------------------------------------
  useEffect(() => {
    saveReaderPrefs(prefs);
  }, [prefs]);

  // ---- Arrow-key page turns ---------------------------------------------
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      if (event.key === "ArrowLeft") goPrev();
      else if (event.key === "ArrowRight") goNext();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goPrev, goNext]);

  const stepScale = useCallback((delta: number) => {
    setPrefs((current) => {
      const currentIndex = SCALES.indexOf(current.fontScale);
      const next =
        SCALES[Math.min(SCALES.length - 1, Math.max(0, currentIndex + delta))];
      return { ...current, fontScale: next };
    });
  }, []);

  const setFamily = useCallback(
    (fontFamily: FontFamily) => setPrefs((current) => ({ ...current, fontFamily })),
    []
  );

  const resetPrefs = useCallback(() => setPrefs(DEFAULT_READER_PREFS), []);

  const title = project.metadata.title || project.name;
  const progress = total > 0 ? ((index + 1) / total) * 100 : 0;


  return (
    <div>
      {/* ---- Reading bar: position, type controls, way back ---- */}
      {/* Solid background (no backdrop-blur): blurring a giant scrolling
          chapter behind a sticky bar forces expensive repaints per frame. */}
      <div className="sticky top-16 z-30 border-b bg-background">
        <div className="container flex h-14 items-center gap-2 px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setTocOpen(true)}
          >
            <List />
            <span className="hidden sm:inline">Contents</span>
          </Button>

          <div className="min-w-0 flex-1">
            <p className="font-heading truncate text-sm">{title}</p>
            <p className="code truncate text-muted-foreground">
              {total > 0 ? index + 1 : 0} / {total}
              {chapter ? ` · ${chapter.title}` : ""}
            </p>
          </div>

          <TypeControls
            prefs={prefs}
            onStep={stepScale}
            onFamily={setFamily}
            onReset={resetPrefs}
            className="hidden sm:block"
          />

          <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />

          <Link
            href="/library"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "shrink-0",
            })}
          >
            Library
          </Link>
        </div>

        <div
          className="h-0.5 w-full bg-secondary"
          role="progressbar"
          aria-label="Reading progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="h-full bg-brass-soft transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="container px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
          <aside className="hidden lg:block">
            <div className="sticky top-32 max-h-[calc(100dvh-10rem)] overflow-y-auto pr-2">
              <ReaderToc
                chapters={chapters}
                activeChapterId={chapterId}
                onSelect={setChapterId}
              />
            </div>
          </aside>

          <main className="min-w-0">
            {chapter ? (
              <article className="mx-auto max-w-[68ch]">
                <header className="mb-8">
                  <p className="eyebrow mb-2">Chapter {index + 1}</p>
                  <h1 className="heading-lg">{chapter.title}</h1>
                  <div className="rule-brass mt-5" />
                </header>

                <div
                  className="prose max-w-none dark:prose-invert"
                  style={{
                    fontFamily: FONT_FAMILIES[prefs.fontFamily],
                    fontSize: FONT_SIZE_STEPS[prefs.fontScale],
                    lineHeight: 1.75,
                  }}
                  dangerouslySetInnerHTML={{ __html: chapter.content }}
                />

                <nav className="mt-14 flex items-center justify-between gap-3 border-t pt-6">
                  <Button variant="outline" onClick={goPrev} disabled={index === 0}>
                    <ChevronLeft />
                    Previous
                  </Button>
                  <span className="code hidden text-muted-foreground sm:block">
                    {index + 1} of {total}
                  </span>
                  <Button
                    variant="outline"
                    onClick={goNext}
                    disabled={index >= total - 1}
                  >
                    Next
                    <ChevronRight />
                  </Button>
                </nav>

                {index === total - 1 && (
                  <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <BookOpenCheck className="size-4 text-brass" aria-hidden="true" />
                    The end of the book — your place is saved.
                  </p>
                )}
              </article>
            ) : (
              <p className="py-20 text-center text-muted-foreground">
                This book has no chapters to read yet.
              </p>
            )}
          </main>
        </div>
      </div>

      {/* ---- Contents drawer (below lg) ---- */}
      <Dialog open={tocOpen} onOpenChange={setTocOpen}>
        <DialogContent className="top-0 left-0 h-dvh w-80 max-w-[85vw] translate-x-0 translate-y-0 content-start gap-5 overflow-y-auto rounded-none rounded-r-2xl p-5 sm:max-w-xs lg:hidden">
          <DialogHeader>
            <DialogTitle className="text-base">{title}</DialogTitle>
          </DialogHeader>

          <ReaderToc
            chapters={chapters}
            activeChapterId={chapterId}
            onSelect={(id) => {
              setChapterId(id);
              setTocOpen(false);
            }}
          />

          <div className="border-t pt-4">
            <p className="eyebrow mb-3">Type</p>
            <TypeControls
              prefs={prefs}
              onStep={stepScale}
              onFamily={setFamily}
              onReset={resetPrefs}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

