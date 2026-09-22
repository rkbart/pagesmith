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
