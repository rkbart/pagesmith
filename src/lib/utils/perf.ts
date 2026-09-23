/**
 * Opt-in performance instrumentation for the import/hydration paths.
 *
 * Enable with `localStorage.setItem("pagesmith-perf", "1")` (devtools
 * console), then watch for `[pagesmith-perf]` lines. Overhead when disabled
 * is a single flag check per call site.
 */

const FLAG_KEY = "pagesmith-perf";

export function perfEnabled(): boolean {
  try {
    return (
      typeof localStorage !== "undefined" &&
      localStorage.getItem(FLAG_KEY) === "1"
    );
  } catch {
    return false;
  }
}

export function perfLog(
  message: string,
  data?: Record<string, number | string>
): void {
  if (!perfEnabled()) return;
  console.debug(`[pagesmith-perf] ${message}`, data ?? "");
}

/** Wall-time a promise-returning step; passes through untouched when disabled. */
export function perfTime<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!perfEnabled()) return fn();
  const start = performance.now();
  return fn().then(
    (result) => {
      perfMeasure(label, start);
      return result;
    },
    (err) => {
      perfMeasure(`${label} (failed)`, start);
      throw err;
    }
  );
}

export function perfMeasure(label: string, start: number): void {
  if (!perfEnabled()) return;
  perfLog(label, { ms: Math.round((performance.now() - start) * 10) / 10 });
}

/** Human-readable byte counts for the perf logs (e.g. 2457600 -> "2.3MB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
