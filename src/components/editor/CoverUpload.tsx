"use client";

import { useCallback, useRef } from "react";
import { useProjectStore } from "@/lib/store/project";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CoverUpload() {
  const { project, setCover } = useProjectStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setCover({
          data: reader.result as string,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    },
    [setCover]
  );

  if (project?.cover) {
    return (
      <div className="relative group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={project.cover.data}
          alt="Book cover"
          className="w-full rounded-md border"
        />
        <button
          onClick={() => setCover(undefined)}
          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Remove cover"
        >
          <X className="h-4 w-4" />
        </button>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2"
          onClick={() => inputRef.current?.click()}
        >
          Replace Cover
        </Button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed rounded-md p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:bg-muted/50 transition-colors"
      >
        <ImagePlus className="h-8 w-8" />
        <span className="text-sm">Upload cover image</span>
        <span className="text-xs">JPG, PNG, or WebP</span>
      </button>
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
    </div>
  );
}
