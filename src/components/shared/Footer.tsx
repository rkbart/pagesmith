import { Hammer } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t py-8 mt-auto">
      <div className="container px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Hammer className="h-4 w-4" />
          <span>PageSmith — Free, browser-first EPUB tools</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Your files never leave your device.</span>
          <a
            href="https://www.buymeacoffee.com/rkbart"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            ☕ Support development
          </a>
        </div>
      </div>
    </footer>
  );
}
