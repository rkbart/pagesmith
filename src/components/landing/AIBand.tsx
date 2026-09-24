import Link from "next/link";
import {
  Languages,
  Wand2,
  ScanText,
  NotebookPen,
  Gauge,
  Users,
  KeyRound,
} from "lucide-react";

const aiFeatures = [
  {
    icon: Languages,
    title: "Translation",
    description: "Whole chapters or the full book, with formatting preserved.",
  },
  {
    icon: Wand2,
    title: "Smart editing",
    description: "Grammar fixes, style improvements, consistency passes.",
  },
  {
    icon: ScanText,
    title: "Chapter detection",
    description: "Long texts and PDFs split into properly structured chapters.",
  },
  {
    icon: NotebookPen,
    title: "Summaries",
    description: "Chapter digests and a full synopsis for your back cover.",
  },
  {
    icon: Gauge,
    title: "Readability",
    description: "Grade level, reading ease and sentence complexity per chapter.",
  },
  {
    icon: Users,
    title: "Character tracking",
    description: "Names extracted and traced across chapters for consistency.",
  },
];

export function AIBand() {
  return (
    <section className="container px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="relative overflow-hidden rounded-3xl bg-[#211a12] px-6 py-12 text-[#f3ead6] sm:px-10 lg:px-14 lg:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 size-80 rounded-full bg-brass-soft/20 blur-3xl"
        />
        <div className="relative">
          <div className="max-w-2xl">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-brass-soft">
              The apprentice
            </p>
            <h2 className="heading-lg text-[#f8efdb]">
              An apprentice for the final polish
            </h2>
            <p className="body-lg mt-4 text-[#cbbfa4]">
              Every book needs a second pair of eyes. PageSmith ships with
              quiet AI tools that read alongside you — and unlike most
              binderies, yours never phones home.
            </p>
          </div>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {aiFeatures.map((feature) => (
              <li
                key={feature.title}
                className="rounded-xl border border-white/10 bg-white/5 p-5"
              >
                <div className="grid size-9 place-items-center rounded-lg bg-brass-soft/15">
                  <feature.icon className="size-4.5 text-brass-soft" aria-hidden="true" />
                </div>
                <h3 className="heading-sm mt-3 text-[#f8efdb]">{feature.title}</h3>
                <p className="mt-1 text-sm text-[#b3a68a]">{feature.description}</p>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#b3a68a]">
              Readability, chapter detection and summaries run free in your
              browser — no key, no account.
            </p>
            <Link
              href="/settings"
              className="inline-flex w-fit items-center gap-2 text-sm font-medium text-brass-soft underline-offset-4 hover:underline"
            >
              <KeyRound className="size-4" aria-hidden="true" />
              Run it local with Ollama — or plug in any of 12 cloud providers
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
