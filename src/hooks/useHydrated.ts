"use client";

import { useProjectStore } from "@/lib/store/project";

/**
 * True once the project store has finished restoring the shelf from
 * IndexedDB on the client.
 *
 * Pages that read projects must wait: without this gate the editor briefly
 * believes you have no books and flashes its empty state. Starts false on
 * both server and client, flips true when `hydrateFromStorage` (in
 * `lib/store/project`) finishes.
 */
export function useProjectHydrated(): boolean {
  return useProjectStore((state) => state.hydrated);
}
