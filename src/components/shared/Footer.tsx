import Link from "next/link";
import { Feather, Mail, ShieldCheck } from "lucide-react";
import { BmcButton } from "@/components/shared/BmcButton";

/** Contact address for the footer's "Email me" row — blank until set. */
const CONTACT_EMAIL = "";

/** GitHub mark (lucide no longer ships brand icons). */
function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

const productLinks = [
  { href: "/library", label: "Library" },
  { href: "/convert", label: "Import & Convert" },
  { href: "/editor", label: "Studio" },
  { href: "/read", label: "Reading Room" },
  { href: "/check", label: "Proof Desk" },
  { href: "/settings", label: "Settings" },
];

export function Footer() {
  return (
    <footer className="border-t bg-secondary/40 mt-auto">
      <div className="container px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-lg bg-brass-soft">
                <Feather className="size-4 text-white" aria-hidden="true" />
              </span>
              <span className="font-heading text-lg tracking-tight">
                Page<span className="italic text-brass">Smith</span>
              </span>
            </div>
            <p className="body-sm text-muted-foreground mt-3 max-w-xs">
              A bindery for your words. Turn manuscripts into finished EPUB
              books — free, in your browser.
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3">
              <ShieldCheck className="size-3.5 text-brass" aria-hidden="true" />
              Your files never leave your device.
            </p>
          </div>

          <nav aria-label="Product">
            <p className="eyebrow mb-3">Bindery</p>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="eyebrow mb-3">Support the smith</p>
            <div className="flex flex-col gap-2">
              <BmcButton />
              {CONTACT_EMAIL ? (
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="size-4 text-brass" aria-hidden="true" />
                  Email me
                </a>
              ) : (
                <span
                  className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground/60"
                  title="Set CONTACT_EMAIL in Footer.tsx to activate"
                >
                  <Mail className="size-4 text-brass" aria-hidden="true" />
                  Email me
                </span>
              )}
              <a
                href="https://github.com/rkbart"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <GithubMark className="size-4 text-brass" />
                rkbart
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} PageSmith
          </p>
          <p className="text-xs text-muted-foreground">
            Free · No account · EPUB 3
          </p>
        </div>
      </div>
    </footer>
  );
}
