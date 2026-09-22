import { FileDown, PenLine, BookCheck } from "lucide-react";

const steps = [
  {
    icon: FileDown,
    title: "Import",
    text: "Drop a manuscript in any of six formats. Chapters are detected and a draft table of contents is set for you.",
  },
  {
    icon: PenLine,
    title: "Refine",
    text: "Edit and reorder chapters, set metadata and cover. AI tools polish grammar, tone and clarity as you go.",
  },
  {
    icon: BookCheck,
    title: "Bind",
    text: "Export a clean, store-ready EPUB 3 — checked for structural issues before it ever downloads.",
  },
];

export function ProcessPipeline() {
  return (
    <section className="container px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow mb-3">The bindery process</p>
        <h2 className="heading-lg">From manuscript to bookshelf in three passes</h2>
        <div className="rule-brass mx-auto mt-4" />
      </div>

      <div className="relative mt-12 grid gap-10 sm:grid-cols-3 sm:gap-6 lg:gap-10">
        <div
          aria-hidden
          className="absolute top-7 right-[16%] left-[16%] hidden h-px bg-border lg:block"
        />
        {steps.map((step, i) => (
          <div key={step.title} className="relative text-center">
            <div className="relative z-10 mx-auto grid size-14 place-items-center rounded-full border bg-card shadow-panel">
              <step.icon className="size-5 text-brass" aria-hidden="true" />
            </div>
            <p className="eyebrow mt-4 mb-1.5">Pass {i + 1}</p>
            <h3 className="heading-md">{step.title}</h3>
            <p className="mx-auto mt-2 max-w-xs body-sm text-muted-foreground">
              {step.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
