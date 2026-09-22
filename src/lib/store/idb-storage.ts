import { openDB, type IDBPDatabase } from "idb";
import type { StateStorage } from "zustand/middleware";

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

let dbPromise: Promise<IDBPDatabase> | null = null;

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
    try {
      const db = await getDB();
      const value = (await db.get(STORE_NAME, name)) as string | undefined;
      if (typeof value === "string" && value.length > 0) {
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
    try {
      const db = await getDB();
      await db.put(STORE_NAME, value, name);
    } catch (err) {
      console.warn(
        "[pagesmith] Failed to persist state to IndexedDB (keeping in-memory state):",
        err
      );
    }
  },

  async removeItem(name: string): Promise<void> {
    try {
      const db = await getDB();
      await db.delete(STORE_NAME, name);
    } catch (err) {
      console.warn("[pagesmith] Failed to delete state from IndexedDB:", err);
    }
  },
};
