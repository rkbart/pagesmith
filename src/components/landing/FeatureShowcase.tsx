import { Layers, Type, Image, ListOrdered, Eye, CheckCircle2 } from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Chapter Management",
    description: "Auto-detect chapters, reorder with drag-and-drop, merge or split as needed.",
  },
  {
    icon: Type,
    title: "Rich Text Editing",
    description: "Edit chapter content with a full-featured editor. Format headings, paragraphs, and dialogue.",
  },
  {
    icon: ListOrdered,
    title: "Auto Table of Contents",
    description: "Generate a navigable TOC from your chapter structure. Edit labels and nesting levels.",
  },
  {
    icon: Image,
    title: "Cover & Metadata",
    description: "Set title, author, ISBN, description, language, and upload a cover image.",
  },
  {
    icon: Eye,
    title: "In-Browser Preview",
    description: "Read your EPUB before export. See exactly how it will look on a reader device.",
  },
  {
    icon: CheckCircle2,
    title: "EPUB Validation",
    description: "Check your EPUB for structural issues before publishing to stores or readers.",
  },
];

export function FeatureShowcase() {
  return (
    <section className="bg-muted/50 py-16">
      <div className="container px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Everything You Need to Publish</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            From raw manuscript to polished EPUB — PageSmith gives you the tools to craft a
            professional ebook without leaving your browser.
          </p>
        </div>
        <div className="space-y-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="shrink-0 rounded-lg bg-primary/10 p-3">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{f.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
