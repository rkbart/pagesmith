"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { lookupWord, defineWithAI, type DictionaryResult } from "@/lib/ai/dictionary";

interface DictionaryState {
  word: string;
  x: number;
  y: number;
}

export function useDictionary() {
  const [selectedWord, setSelectedWord] = useState<DictionaryState | null>(null);
  const [definition, setDefinition] = useState<DictionaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiFallback, setAiFallback] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreNextMouseUp = useRef(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const clear = useCallback(() => {
    setSelectedWord(null);
    setDefinition(null);
    setAiFallback(false);
    setLoading(false);
  }, []);

  const lookup = useCallback(async (word: string, x: number, y: number) => {
    setSelectedWord({ word, x, y });
    setLoading(true);
    setAiFallback(false);

    // Try DictionaryAPI.dev first for single words
    const result = await lookupWord(word);
    if (result) {
      setDefinition(result);
      setLoading(false);
      return;
    }

    // Fall back to AI for multi-word phrases or if API fails
    setAiFallback(true);
    const aiDefinition = await defineWithAI(word);
    setDefinition({ word, meanings: [{ partOfSpeech: "phrase", definitions: [{ definition: aiDefinition }] }] });
    setLoading(false);
  }, []);

  // Listen for text selection on mouseup
  useEffect(() => {
    function handleMouseUp() {
      if (ignoreNextMouseUp.current) {
        ignoreNextMouseUp.current = false;
        return;
      }

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        debounceTimer.current = setTimeout(() => {
          const currentSel = window.getSelection();
          if (!currentSel || currentSel.isCollapsed || !currentSel.toString().trim()) {
            clear();
          }
        }, 100);
        return;
      }

      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      const text = sel.toString().trim();
      const range = sel.getRangeAt(0);
      const rects = range.getClientRects();
      let x = window.innerWidth / 2;
      let y = window.innerHeight / 2;

      if (rects.length > 0) {
        const first = rects[0];
        x = first.left + first.width / 2;
        y = first.top;
      }

      if (!/\s/.test(text)) {
        lookup(text, x, y);
      } else {
        debounceTimer.current = setTimeout(() => {
          const currentSel = window.getSelection();
          if (currentSel && !currentSel.isCollapsed && currentSel.toString().trim()) {
            const text = currentSel.toString().trim();
            const range = currentSel.getRangeAt(0);
            const rects = range.getClientRects();
            if (rects.length > 0) {
              x = rects[0].left + rects[0].width / 2;
              y = rects[0].top;
            }
            lookup(text, x, y);
          }
        }, 300);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") clear();
    }

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleKeyDown);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [lookup, clear]);

  // Click outside tooltip to dismiss
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        selectedWord &&
        !(e.target as HTMLElement).closest("[data-dictionary]")
      ) {
        ignoreNextMouseUp.current = true;
        clear();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [selectedWord, clear]);

  return {
    selectedWord,
    definition,
    loading,
    aiFallback,
    tooltipRef,
  };
}
