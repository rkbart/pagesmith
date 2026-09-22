/**
 * Reading position + typography preferences for the reading room.
 *
 * Both are tiny single-device conveniences, so they live in localStorage —
 * the books themselves are in IndexedDB (`src/lib/store/idb-storage.ts`).
 * Positions are keyed by project id so every book resumes where it was left
 * off; a missing entry simply means "start at the first chapter".
 */

const POSITIONS_KEY = "pagesmith-reading-progress";
const PREFS_KEY = "pagesmith-reader-prefs";

export interface ReadingPosition {
  chapterId: string;
  /** 0–1 fraction of the scrollable height. */
  scrollRatio: number;
}

export type FontScale = "sm" | "md" | "lg";
export type FontFamily = "serif" | "sans";

export interface ReaderPrefs {
  fontScale: FontScale;
  fontFamily: FontFamily;
}

export const DEFAULT_READER_PREFS: ReaderPrefs = {
  fontScale: "md",
  fontFamily: "serif",
};

export const FONT_SIZE_STEPS: Record<FontScale, string> = {
  sm: "17px",
  md: "19px",
  lg: "22px",
};

/** Book typography: a serif body is the whole point of a reading room. */
export const FONT_FAMILIES: Record<FontFamily, string> = {
  serif: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
  sans: 'var(--font-inter), -apple-system, "Segoe UI", sans-serif',
};

function readPositions(): Record<string, ReadingPosition> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(POSITIONS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, ReadingPosition>;
  } catch {
    return {};
  }
}

export function loadPosition(projectId: string): ReadingPosition | null {
  const position = readPositions()[projectId];
  if (!position || typeof position.chapterId !== "string") return null;
  return {
    chapterId: position.chapterId,
    scrollRatio:
      typeof position.scrollRatio === "number"
        ? Math.min(1, Math.max(0, position.scrollRatio))
        : 0,
  };
}

export function savePosition(projectId: string, position: ReadingPosition): void {
  if (typeof window === "undefined") return;
  try {
    const all = readPositions();
    all[projectId] = position;
    window.localStorage.setItem(POSITIONS_KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable or full — bookmarking is a convenience, never fatal.
  }
}

/** Drop a book's bookmark (used when the book itself is deleted). */
export function clearPosition(projectId: string): void {
  if (typeof window === "undefined") return;
  try {
    const all = readPositions();
    if (!(projectId in all)) return;
    delete all[projectId];
    window.localStorage.setItem(POSITIONS_KEY, JSON.stringify(all));
  } catch {
    // nothing to clean up
  }
}

export function loadReaderPrefs(): ReaderPrefs {
  if (typeof window === "undefined") return DEFAULT_READER_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_READER_PREFS;
    const parsed = JSON.parse(raw) as Partial<ReaderPrefs>;
    const fontScale =
      parsed.fontScale && parsed.fontScale in FONT_SIZE_STEPS
        ? parsed.fontScale
        : DEFAULT_READER_PREFS.fontScale;
    const fontFamily =
      parsed.fontFamily && parsed.fontFamily in FONT_FAMILIES
        ? parsed.fontFamily
        : DEFAULT_READER_PREFS.fontFamily;
    return { fontScale, fontFamily };
  } catch {
    return DEFAULT_READER_PREFS;
  }
}

export function saveReaderPrefs(prefs: ReaderPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage unavailable — the reader still works with in-memory prefs.
  }
}
