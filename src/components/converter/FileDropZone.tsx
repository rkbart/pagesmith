"use client";

import { useCallback, useRef, useState } from "react";
import { FileUp } from "lucide-react";

interface FileDropZoneProps {
  accept: string;
  onFile: (file: File) => void;
  label: string;
  disabled?: boolean;
}

export function FileDropZone({ accept, onFile, label, disabled }: FileDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile, disabled]
  );

  return (
    <div
      className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-all cursor-pointer ${
        dragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-full bg-primary/10 p-4">
          <FileUp className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="font-medium text-lg">{label}</p>
          <p className="text-sm text-muted-foreground mt-1">
            or click to browse · {accept.replace(/\./g, "").replace(/,/g, ", ")}
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
