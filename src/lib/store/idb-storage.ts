import { openDB, type IDBPDatabase } from "idb";
import type { StateStorage } from "zustand/middleware";
import {
  formatBytes,
  perfEnabled,
  perfLog,
  perfMeasure,
} from "@/lib/utils/perf";

/**
 * Zustand `StateStorage` backed by IndexedDB (via the `idb` helper).
 *
 * Why: localStorage caps out around 5MB per origin, and projects embed
 * base64 covers + chapter HTML — a couple of covered books can exceed it,
 * and the persist middleware has no QuotaExceededError handling. IndexedDB
 * quotas are orders of magnitude larger.
 *
 * Also owns the one-time migration from the legacy localStorage payload:
 * on the first read that finds nothing in IndexedDB, any surviving
 * `localStorage[<name>]` value is adopted into IndexedDB and removed from
 * localStorage. Theme + AI settings intentionally stay in localStorage —
 * they are tiny and are read synchronously (theme boot script, AI loader).
 *
 * The adapter never throws: every method resolves so the persist
 * middleware always finishes hydration.
 */

const DB_NAME = "pagesmith-db";
const STORE_NAME = "kv";
const DB_VERSION = 1;

/**
 * IndexedDB only exists in browsers. During SSR/prerender the adapter is
 * imported and read from, so every method no-ops (quietly — this is expected,
 * not a failure) and hydration completes with the initial state.
 */
function hasIDB(): boolean {
  return typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Write-behind coalescing for persist traffic.
 *
 * Zustand's persist middleware calls `setItem` on *every* store write — each
 * editor keystroke and every reader chapter turn re-serializes the whole
 * shelf (all books, all base64 images) and would otherwise block the main
 * thread for hundreds of ms per interaction. Writes are debounced with a
 * trailing edge and flushed when the page hides, so bursts collapse into a
 * single IndexedDB put and no edit is lost on tab close.
 */
const WRITE_DEBOUNCE_MS = 1000;

const pendingWrites = new Map<string, string>();
const writeTimers = new Map<string, ReturnType<typeof setTimeout>>();
let coalescedWrites = 0;
let hideFlushArmed = false;

async function flushWrite(name: string): Promise<void> {
  const value = pendingWrites.get(name);
  pendingWrites.delete(name);
  const timer = writeTimers.get(name);
  if (timer) {
    clearTimeout(timer);
    writeTimers.delete(name);
  }
  if (value === undefined) return;
  if (!hasIDB()) return;
  try {
    const db = await getDB();
    const tWrite = performance.now();
    await db.put(STORE_NAME, value, name);
    // Persist runs on every store write (including each editor keystroke),
    // so a large payload here means edits are serializing megabytes.
    if (perfEnabled()) {
      perfMeasure(`idb write ${name}`, tWrite);
      perfLog(`idb write payload ${name}`, { bytes: formatBytes(value.length) });
    }
  } catch (err) {
    console.warn(
      "[pagesmith] Failed to persist state to IndexedDB (keeping in-memory state):",
      err
    );
  }
}

function armHideFlush(): void {
  if (hideFlushArmed || typeof window === "undefined") return;
  hideFlushArmed = true;
  const flushAll = () => {
    for (const name of Array.from(pendingWrites.keys())) {
      void flushWrite(name);
    }
  };
  window.addEventListener("pagehide", flushAll);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAll();
  });
}

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

export const idbStorage: StateStorage = {
  async getItem(name: string): Promise<string | null> {
    if (!hasIDB()) return null;

    try {
      const db = await getDB();
      const tRead = performance.now();
      const value = (await db.get(STORE_NAME, name)) as string | undefined;
      if (typeof value === "string" && value.length > 0) {
        if (perfEnabled()) {
          perfMeasure(`idb read ${name}`, tRead);
          perfLog(`idb payload ${name}`, { bytes: formatBytes(value.length) });
          // Estimate zustand's synchronous JSON.parse cost that follows this
          // read before first paint. Debug-only double parse — the real parse
          // still happens inside the persist middleware.
          const tParse = performance.now();
          JSON.parse(value);
          perfMeasure(`idb JSON.parse estimate ${name}`, tParse);
        }
        return value;
      }
    } catch (err) {
      console.warn("[pagesmith] IndexedDB read failed:", err);
    }

    // First run on this device (or IDB unavailable): adopt the legacy
    // localStorage payload so no one loses projects from the old build.
    try {
      const legacy = localStorage.getItem(name);
      if (legacy) {
        try {
          const db = await getDB();
          await db.put(STORE_NAME, legacy, name);
          localStorage.removeItem(name);
        } catch {
          // Couldn't copy — keep the legacy key and serve it as-is.
        }
        return legacy;
      }
    } catch {
      // Storage unavailable (private mode etc.) — nothing to adopt.
    }
    return null;
  },

  async setItem(name: string, value: string): Promise<void> {
    if (!hasIDB()) return;
    armHideFlush();
    if (pendingWrites.has(name)) coalescedWrites += 1;
    pendingWrites.set(name, value);
    const existing = writeTimers.get(name);
    if (existing) clearTimeout(existing);
    if (perfEnabled() && coalescedWrites > 0 && coalescedWrites % 10 === 0) {
      perfLog("idb writes coalesced", { count: coalescedWrites });
    }
    writeTimers.set(
      name,
      setTimeout(() => {
        void flushWrite(name);
      }, WRITE_DEBOUNCE_MS)
    );
  },

  async removeItem(name: string): Promise<void> {
    if (!hasIDB()) return;
    try {
      const db = await getDB();
      await db.delete(STORE_NAME, name);
    } catch (err) {
      console.warn("[pagesmith] Failed to delete state from IndexedDB:", err);
    }
  },
};
