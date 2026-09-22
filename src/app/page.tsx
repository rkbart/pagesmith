import { Hero } from "@/components/landing/Hero";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { FormatCards } from "@/components/landing/FormatCards";
import { AISection } from "@/components/landing/AISection";

export default function Home() {
  return (
    <div className="flex flex-col">
      <Hero />
      <FormatCards />
      <FeatureShowcase />
      <AISection />
    </div>
  );
}
