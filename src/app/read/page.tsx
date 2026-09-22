"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { BookOpen, Feather, Loader2 } from "lucide-react";
import { ReaderRoom } from "@/components/reader/ReaderRoom";
import { buttonVariants } from "@/components/ui/button";
import { useProjectHydrated } from "@/hooks/useHydrated";
import { useProjectStore } from "@/lib/store/project";

export default function ReadPage() {
  const hydrated = useProjectHydrated();
  const { project: active, projects, loadProject } = useProjectStore();

  /* With no book explicitly chosen, open the most recently edited one — the
     reading room should never be a dead end. */
  const target = useMemo(() => {
    if (active && projects.some((entry) => entry.id === active.id)) return active;
    if (projects.length === 0) return null;
    return [...projects].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  }, [active, projects]);

  useEffect(() => {
    if (!hydrated || !target || active?.id === target.id) return;
    loadProject(target.id);
  }, [hydrated, target, active, loadProject]);

  if (!hydrated) {
    return (
      <div className="container flex items-center justify-center gap-2 py-32 text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-brass" aria-hidden="true" />
        Opening the reading room…
      </div>
    );
  }

  if (!target) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-brass/10 shadow-panel">
          <Feather className="size-7 text-brass" aria-hidden="true" />
        </div>
        <h1 className="heading-lg mb-3">Nothing on the desk</h1>
        <p className="body-md-loose mx-auto mb-8 max-w-md text-muted-foreground">
          Pick a book from your library, or bind a manuscript into a new one.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/library" className={buttonVariants({ variant: "brass", size: "lg" })}>
            <BookOpen />
            Go to the library
          </Link>
          <Link href="/convert" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Import a manuscript
          </Link>
        </div>
      </div>
    );
  }

  /* Remounting per book keeps bookmark + typography state honest when you
     hop between titles. */
  return <ReaderRoom key={target.id} project={target} />;
}
