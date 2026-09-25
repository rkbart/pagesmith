"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/lib/store/project";
import { ImagePlus, X, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookCover } from "@/types/project";

/**
 * Compact cover strip: thumbnail + status + change/remove actions in one
 * row. Lives above the chapter editor — the old full-width card buried the
 * upload affordance and stretched covers awkwardly.
 */
export function CoverUpload() {
  const { project, setCover } = useProjectStore();
  const inputRef = useRef<HTMLInputElement>(null);
  // Two-step delete confirm (no dialog needed for one destructive action).
  const [confirming, setConfirming] = useState(false);
  const [previousCover, setPreviousCover] = useState<BookCover | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }
      // Save current cover before replacing so it can be undone.
      if (project?.cover) {
        setPreviousCover(project.cover);
      }
      setConfirming(false);
      const reader = new FileReader();
      reader.onload = () => {
        setCover({
          data: reader.result as string,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    },
    [setCover, project]
  );

  // Clear undo buffer after a few seconds.
  useEffect(() => {
    if (!previousCover) return;
    const t = setTimeout(() => setPreviousCover(null), 6000);
    return () => clearTimeout(t);
  }, [previousCover]);

  if (!project) return null;

  return (
    <section
      aria-label="Book cover"
      className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-panel sm:gap-4"
    >
      {project.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.cover.data}
          alt="Book cover"
          width={64}
          height={96}
          className="h-20 w-14 shrink-0 rounded-lg border object-cover sm:h-24 sm:w-16"
        />
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Upload cover image"
          className="grid h-20 w-14 shrink-0 place-items-center rounded-lg border-2 border-dashed border-brass/30 text-brass transition-colors hover:border-brass/60 hover:bg-brass/5 sm:h-24 sm:w-16"
        >
          <ImagePlus className="size-6" aria-hidden="true" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <p className="eyebrow">Cover</p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {project.cover
            ? "Set — prints as the book's first page."
            : "None yet — readers see a placeholder."}
        </p>
      </div>
      {project.cover ? (
        <>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => inputRef.current?.click()}
          >
            Replace
          </Button>
          <button
            type="button"
            onClick={() => {
              if (!confirming) {
                // Save cover before removing so it can be undone.
                setPreviousCover(project.cover!);
                setConfirming(true);
                setTimeout(() => setConfirming(false), 3000);
                return;
              }
              setConfirming(false);
              setCover(undefined);
            }}
            aria-label={
              confirming ? "Confirm remove cover" : "Remove cover"
            }
            title="Remove cover"
            className={`shrink-0 rounded-md p-1.5 text-xs transition-colors ${
              confirming
                ? "bg-destructive font-medium text-destructive-foreground"
                : "text-muted-foreground hover:text-destructive"
            }`}
          >
            {confirming ? "Sure?" : <X className="size-4" aria-hidden="true" />}
          </button>
        </>
      ) : previousCover ? (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => {
            setCover(previousCover);
            setPreviousCover(null);
          }}
        >
          <Undo2 className="size-4 mr-1" />
          Restore
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => inputRef.current?.click()}
        >
          Upload
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </section>
  );
}
