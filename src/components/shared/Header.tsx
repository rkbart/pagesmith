"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Feather, Menu, X, Coffee } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

const navLinks = [
  { href: "/library", label: "Library" },
  { href: "/convert", label: "Import" },
  { href: "/check", label: "Proof Desk" },
  { href: "/editor", label: "Studio" },
  { href: "/settings", label: "Settings" },
];

const BMC_URL = "https://www.buymeacoffee.com/rkbart";

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 mr-auto">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brass-soft shadow-panel transition-transform group-hover:scale-105">
            <Feather className="size-4.5 text-white" aria-hidden="true" />
          </span>
          <span className="font-heading text-xl tracking-tight">
            Page<span className="italic text-brass">Smith</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                isActive(link.href)
                  ? "text-brass font-medium bg-brass/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2 ml-4">
          <ThemeToggle />
          <a
            href={BMC_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Support PageSmith on Buy Me a Coffee"
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Coffee className="size-4" aria-hidden="true" />
          </a>
        </div>

        <div className="md:hidden ml-auto flex items-center gap-1">
          <ThemeToggle />
          <button
            className="p-2 rounded-lg hover:bg-secondary"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block px-3 py-2.5 text-sm rounded-lg ${
                isActive(link.href)
                  ? "text-brass font-medium bg-brass/10"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <a
              href={BMC_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Support PageSmith on Buy Me a Coffee"
              className="inline-flex size-10 items-center justify-center rounded-lg border text-muted-foreground hover:bg-secondary"
            >
              <Coffee className="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
