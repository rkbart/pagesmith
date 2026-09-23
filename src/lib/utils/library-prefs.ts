/**
 * Remembered library layout. Like the reader's typography preferences this is
 * a small single-device setting, so localStorage is the right home (the books
 * themselves live in IndexedDB).
 */

export type LibraryView = "cards" | "list";

const VIEW_KEY = "pagesmith-library-view";
export const DEFAULT_LIBRARY_VIEW: LibraryView = "cards";

export function loadLibraryView(): LibraryView {
  if (typeof window === "undefined") return DEFAULT_LIBRARY_VIEW;
  try {
    const stored = window.localStorage.getItem(VIEW_KEY);
    return stored === "list" || stored === "cards" ? stored : DEFAULT_LIBRARY_VIEW;
  } catch {
    return DEFAULT_LIBRARY_VIEW;
  }
}

export function saveLibraryView(view: LibraryView): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Storage unavailable — the toggle still works for this visit.
  }
}

/**
 * Folder collapse state: the ids of collections currently collapsed.
 * Everything not listed reads as expanded.
 */
const FOLDERS_KEY = "pagesmith-library-collapsed";

export function loadCollapsedFolders(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(FOLDERS_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function saveCollapsedFolders(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FOLDERS_KEY, JSON.stringify(ids));
  } catch {
    // Storage unavailable — collapse state still works for this visit.
  }
}
