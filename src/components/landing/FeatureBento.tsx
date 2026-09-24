import { Layers, BookMarked, Eye, LibraryBig, BadgeCheck, GripVertical } from "lucide-react";

const mockChapters = ["Dedication", "The Letter", "What the River Kept"];

export function FeatureBento() {
  return (
    <section className="bg-secondary/40 py-16 lg:py-20">
      <div className="container px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow mb-3">The workbench</p>
          <h2 className="heading-lg">Everything a book needs, under one roof</h2>
          <div className="rule-brass mx-auto mt-4" />
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Chapters — wide tile with a miniature workbench */}
          <div className="rounded-2xl border bg-card p-6 shadow-panel transition-shadow hover:shadow-lift sm:col-span-2">
            <div className="grid size-10 place-items-center rounded-xl bg-brass/10">
              <Layers className="size-5 text-brass" aria-hidden="true" />
            </div>
            <h3 className="heading-md mt-4">A workbench for chapters</h3>
            <p className="body-sm text-muted-foreground mt-2 max-w-md">
              Auto-detected chapters arrive as a draft TOC. Reorder with
              drag-and-drop, merge or split, set heading levels — the TOC
              rebuilds itself on every change.
            </p>
            <div className="mt-5 max-w-xs space-y-1.5" aria-hidden>
              {mockChapters.map((title, i) => (
                <div
                  key={title}
                  className={`flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm ${
                    i === 1 ? "border-brass/40" : ""
                  }`}
                  style={{ marginLeft: `${i * 14}px` }}
                >
                  <GripVertical className="size-3.5 text-muted-foreground/60" />
                  {title}
                </div>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="rounded-2xl border bg-card p-6 shadow-panel transition-shadow hover:shadow-lift">
            <div className="grid size-10 place-items-center rounded-xl bg-brass/10">
              <BookMarked className="size-5 text-brass" aria-hidden="true" />
            </div>
            <h3 className="heading-md mt-4">Metadata &amp; cover</h3>
            <p className="body-sm text-muted-foreground mt-2">
              Title, author, ISBN, language, description and a cover image —
              everything a store page asks for, set once.
            </p>
          </div>

          {/* Preview */}
          <div className="rounded-2xl border bg-card p-6 shadow-panel transition-shadow hover:shadow-lift">
            <div className="grid size-10 place-items-center rounded-xl bg-brass/10">
              <Eye className="size-5 text-brass" aria-hidden="true" />
            </div>
            <h3 className="heading-md mt-4">Read before you bind</h3>
            <p className="body-sm text-muted-foreground mt-2">
              Flip through your book in a reader-style preview, exactly as a
              device will render it.
            </p>
          </div>

          {/* Library shelf */}
          <div className="rounded-2xl border bg-card p-6 shadow-panel transition-shadow hover:shadow-lift">
            <div className="grid size-10 place-items-center rounded-xl bg-brass/10">
              <LibraryBig className="size-5 text-brass" aria-hidden="true" />
            </div>
            <h3 className="heading-md mt-4">A shelf for finished books</h3>
            <p className="body-sm text-muted-foreground mt-2">
              Every bound book lands on your library shelf — search across
              titles and text, flip card or list views, and sort series into
              collections.
            </p>
            <div className="mt-5 flex items-end gap-1.5" aria-hidden>
              <div className="w-9 rounded-t-md bg-brass-soft/80" style={{ height: "52px" }} />
              <div className="w-9 rounded-t-md bg-brass/25" style={{ height: "64px" }} />
              <div className="w-9 rounded-t-md bg-brass-soft/50" style={{ height: "44px" }} />
              <div className="w-9 rounded-t-md bg-brass/40" style={{ height: "58px" }} />
              <span className="code ml-1 mb-1 rounded-md bg-muted px-2 py-1 text-muted-foreground">
                Collections
              </span>
            </div>
          </div>

          {/* Validation */}
          <div className="rounded-2xl border bg-card p-6 shadow-panel transition-shadow hover:shadow-lift">
            <div className="grid size-10 place-items-center rounded-xl bg-brass/10">
              <BadgeCheck className="size-5 text-brass" aria-hidden="true" />
            </div>
            <h3 className="heading-md mt-4">Press-checked before export</h3>
            <p className="body-sm text-muted-foreground mt-2 max-w-md">
              The EPUB checker inspects the package before a store does — and
              tells you exactly what to fix.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5" aria-hidden>
              {["Mimetype", "Container", "OPF", "Manifest", "Spine", "Nav", "XHTML"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="code rounded-md bg-muted px-2 py-1 text-muted-foreground"
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
