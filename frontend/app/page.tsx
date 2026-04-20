import { FooterCTASection } from "@/components/home/FooterCTASection";
import { HeroSection } from "@/components/home/HeroSection";
import { LiveExampleSection } from "@/components/home/LiveExampleSection";
import { ManifestoSection } from "@/components/home/ManifestoSection";

export default function HomePage() {
  return (
    <main className="bg-white text-[#1A1A1A]">
      <HeroSection />
      <div className="bg-[#FAFAFA]">
        <ManifestoSection />
      </div>
      <LiveExampleSection />
      <div className="border-t border-[#EEE] bg-[#FAFAFA]">
        <FooterCTASection />
      </div>
    </main>
  );
}
