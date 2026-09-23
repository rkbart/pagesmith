"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Floating back-to-top button. Owns its scroll listener and visibility
 * state so long pages never re-render their content on scroll — the
 * updater bails out unless visibility flips.
 */
export function BackToTop({
  threshold = 600,
  className,
}: {
  /** Pixels scrolled before the button appears. */
  threshold?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () =>
      setVisible((was) => {
        const next = window.scrollY > threshold;
        return was === next ? was : next;
      });
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  if (!visible) return null;
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Back to top"
      title="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={className ?? "fixed right-4 bottom-4 z-30 size-11 rounded-full border bg-background shadow-panel"}
    >
      <ArrowUp />
    </Button>
  );
}
