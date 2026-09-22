"use client";

import { useSyncExternalStore } from "react";
import { useProjectStore } from "@/lib/store/project";

/** Stable reference — `useSyncExternalStore` reads this on every render. */
const getFalse = () => false;

/**
 * True once the persisted project store has finished hydrating on the client.
 *
 * Projects hydrate asynchronously out of IndexedDB, so any page that reads
 * them must wait: without this gate the editor briefly believes you have no
 * books and flashes its empty state. The server snapshot is always false, so
 * the first paint is the loading state on both sides of hydration.
 *
 * `onFinishHydration` already matches useSyncExternalStore's
 * subscribe/unsubscribe contract.
 */
export function useProjectHydrated(): boolean {
  return useSyncExternalStore(
    useProjectStore.persist.onFinishHydration,
    () => useProjectStore.persist.hasHydrated(),
    getFalse
  );
}
