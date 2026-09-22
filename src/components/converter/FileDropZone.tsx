"use client";

import { useCallback, useRef, useState } from "react";
import { FileUp } from "lucide-react";

interface FileDropZoneProps {
  accept: string;
  onFile: (file: File) => void;
  /** When `multiple` is set, batches are delivered here instead of `onFile`. */
  onFiles?: (files: File[]) => void;
  multiple?: boolean;
  label: string;
  disabled?: boolean;
}

export function FileDropZone({
  accept,
  onFile,
  onFiles,
  multiple,
  label,
  disabled,
}: FileDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const deliver = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      const files = Array.from(list);
      if (files.length === 0) return;
      if (multiple && onFiles) onFiles(files);
      else onFile(files[0]);
    },
    [multiple, onFiles, onFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      deliver(e.dataTransfer.files);
    },
    [deliver, disabled]
  );

  const formatList = accept.replace(/\./g, "").replace(/,/g, ", ");

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`relative rounded-2xl border bg-paper p-3 shadow-panel outline-none transition-all focus-visible:ring-3 focus-visible:ring-ring/50 ${
        disabled
          ? "pointer-events-none opacity-50"
          : "cursor-pointer hover:-translate-y-0.5 hover:shadow-lift"
      }`}
    >
      <div
        className={`rounded-xl border-2 border-dashed p-8 sm:p-10 text-center transition-colors ${
          dragOver ? "border-brass bg-brass/5" : "border-brass/30"
        }`}
      >
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-brass/10">
          <FileUp className="size-5 text-brass" aria-hidden="true" />
        </div>
        <p className="font-heading text-lg">{label}</p>
        <p className="body-sm text-muted-foreground mt-1.5">
          or click to browse · {formatList}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          deliver(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
