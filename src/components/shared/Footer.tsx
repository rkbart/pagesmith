import Link from "next/link";
import { Feather, Coffee, CodeXml, ShieldCheck } from "lucide-react";

const productLinks = [
  { href: "/convert", label: "Import & Convert" },
  { href: "/editor", label: "Editor" },
  { href: "/check", label: "EPUB Checker" },
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
              <a
                href="https://www.buymeacoffee.com/rkbart"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Coffee className="size-4 text-brass" aria-hidden="true" />
                Buy Me a Coffee
              </a>
              <a
                href="https://github.com/rkbart/pagesmith"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <CodeXml className="size-4 text-brass" aria-hidden="true" />
                Source on GitHub
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
