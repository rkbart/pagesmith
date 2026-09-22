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
            AI-Powered
          </Badge>
          <h2 className="heading-lg">Let AI Polish Your Book</h2>
          <p className="body-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
            Basic AI features run free in your browser. For premium quality, connect your own
            OpenAI or Anthropic API key — your key, your data, your control.
          </p>
        </div>
        <div className="space-y-3">
          {aiFeatures.map((feature) => (
            <div
              key={feature.title}
              className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="shrink-0 rounded-lg bg-muted p-2">
                <feature.icon className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="heading-sm">{feature.title}</h3>
                  <Badge variant="outline" className="text-xs">
                    {feature.badge}
                  </Badge>
                </div>
                <p className="body-sm text-muted-foreground mt-1">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
