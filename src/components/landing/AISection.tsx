import { Languages, Wand2, FileText, Users, Gauge, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const aiFeatures = [
  {
    icon: Languages,
    title: "Smart Translation",
    description:
      "Translate entire chapters or your full book with context-aware AI. Preserves formatting and style.",
    badge: "Free in browser",
  },
  {
    icon: Wand2,
    title: "Smart Editing",
    description:
      "Grammar fixes, style improvements, and consistency checks across all your chapters.",
    badge: "Free in browser",
  },
  {
    icon: FileText,
    title: "Auto Chapter Detection",
    description:
      "AI splits long texts and PDFs into properly structured chapters — no manual splitting needed.",
    badge: "Free in browser",
  },
  {
    icon: BookOpen,
    title: "Auto Summaries",
    description:
      "Generate chapter summaries and a full book synopsis for your back cover or marketing.",
    badge: "BYOK for best quality",
  },
  {
    icon: Gauge,
    title: "Readability Scoring",
    description:
      "Flesch-Kincaid grade level, reading ease, and sentence complexity for every chapter.",
    badge: "Free in browser",
  },
  {
    icon: Users,
    title: "Character Tracker",
    description:
      "Extract character names and track their appearances across chapters for consistency.",
    badge: "BYOK for best quality",
  },
];

export function AISection() {
  return (
    <section className="py-16">
      <div className="container px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-3">
            ✨ AI-Powered
          </Badge>
          <h2 className="text-3xl font-bold">Let AI Polish Your Book</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Basic AI features run free in your browser. For premium quality, connect your own
            OpenAI or Anthropic API key — your key, your data, your control.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiFeatures.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {feature.badge}
                </Badge>
              </div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
