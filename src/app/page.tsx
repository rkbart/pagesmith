import { Hero } from "@/components/landing/Hero";
import { ProcessPipeline } from "@/components/landing/ProcessPipeline";
import { FormatStrip } from "@/components/landing/FormatStrip";
import { FeatureBento } from "@/components/landing/FeatureBento";
import { AIBand } from "@/components/landing/AIBand";
import { FinalCta } from "@/components/landing/FinalCta";

export default function Home() {
  return (
    <div className="flex flex-col">
      <Hero />
      <ProcessPipeline />
      <FormatStrip />
      <FeatureBento />
      <AIBand />
      <FinalCta />
    </div>
  );
}
