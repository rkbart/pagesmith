"use client";

import { Folder } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { Collection } from "@/types/project";

/** File-a-book picker: Unsorted + every shelf collection. */
export function CollectionSelect({
  bookTitle,
  collectionId,
  collections,
  onAssign,
  className,
}: {
  bookTitle: string;
  collectionId: string | null | undefined;
  collections: Collection[];
  onAssign: (collectionId: string | null) => void;
  className?: string;
}) {
  // Resolve the label ourselves instead of relying on the Select's
  // value→item lookup: a stale id (or any lookup miss) rendered the raw
  // collection id as the trigger text. Unknown ids read as Unsorted.
  const current = collections.find((c) => c.id === collectionId);
  const value = current ? current.id : "__none";
  const label = current ? current.name : "Unsorted";
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (!v) return;
        onAssign(v === "__none" ? null : v);
      }}
    >
      <SelectTrigger
        size="sm"
        className={className}
        aria-label={`File ${bookTitle} into a collection`}
        title={`${bookTitle} · ${label}`}
      >
        <Folder className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      </SelectTrigger>
      <SelectContent className="w-auto min-w-(--anchor-width) max-w-72">
        <SelectItem value="__none">Unsorted</SelectItem>
        {collections.map((c) => (
          <SelectItem
            key={c.id}
            value={c.id}
            title={c.name}
            className="[&>span]:min-w-0 [&>span]:shrink [&>span]:truncate"
          >
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
