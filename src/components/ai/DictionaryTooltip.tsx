"use client";

import { useDictionary } from "@/hooks/useDictionary";
import { Loader2, BookOpen, Wand2 } from "lucide-react";

export function DictionaryTooltip() {
  const { selectedWord, definition, loading, aiFallback, tooltipRef } = useDictionary();

  if (!selectedWord || (!definition && !loading)) return null;

  const x = selectedWord.x;
  const y = selectedWord.y;

  return (
    <div
      ref={tooltipRef}
      data-dictionary
      className="fixed z-50 max-w-sm rounded-xl border bg-background shadow-lg p-4"
      style={{ left: Math.min(x, window.innerWidth - 340), top: Math.min(y + 8, window.innerHeight - 200) }}
    >
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="h-4 w-4 text-brass" aria-hidden="true" />
        <span className="font-heading text-base font-semibold">{selectedWord.word}</span>
        {aiFallback && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Wand2 className="h-3 w-3" /> AI definition
          </span>
        )}
      </div>

      {definition?.phonetic && (
        <p className="code text-xs text-muted-foreground mb-2">{definition.phonetic}</p>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Looking up…
        </div>
      )}

      {definition && !loading && (
        <div className="space-y-2">
          {definition.meanings.map((meaning, i) => (
            <div key={i}>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {meaning.partOfSpeech}
              </p>
              {meaning.definitions.map((def, j) => (
                <p key={j} className="text-sm mt-0.5">
                  {def.definition}
                  {def.example && (
                    <span className="text-muted-foreground italic"> “{def.example}”</span>
                  )}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}