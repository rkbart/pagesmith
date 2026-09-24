"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Classic } from "@theme-toggles/react";

const STORAGE_KEY = "pagesmith-theme";

/**
 * The theme is applied to `<html class="dark">` by the boot script in the root
 * layout, before first paint. React therefore doesn't *own* the value — it
 * reads it, which makes this an external store.
 *
 * Crucially, reading the stored theme inside a `useState` initializer would
 * make the client's first render disagree with the server HTML (server always
 * renders "light"), so React would discard the entire server-rendered tree and
 * rebuild it on the client. `useSyncExternalStore` avoids that: React uses
 * `getServerSnapshot` while hydrating, then switches to the live DOM value.
 *
 * Subscribing to `<html>`'s class also keeps the button honest when something
 * else changes the theme (another tab via the `storage` event, devtools, etc).
 */
function subscribe(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

/** Must match what the server rendered, i.e. the light-mode button. */
function getServerSnapshot(): boolean {
  return false;
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next = !dark;
    // The DOM is the source of truth; the observer above re-renders us.
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // storage unavailable — theme still applies for this session
    }
  }, [dark]);

  return (
    <Classic
      toggled={dark}
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="rounded-lg p-2 text-xl transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    />
  );
}
