import ScrollFrameSequence from "@/components/ScrollFrameSequence";
import HeroCaption from "@/components/HeroCaption";
import InteriorCaption from "@/components/InteriorCaption";
import ServicesList from "@/components/ServicesList";
import FinaleCaption from "@/components/FinaleCaption";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ApproachPanels from "@/components/ApproachPanels";
import StatementSection from "@/components/StatementSection";
import WorkTeaser from "@/components/WorkTeaser";
import FinalCTA from "@/components/FinalCTA";

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="top">
        <ScrollFrameSequence
          framePath="/frames/hero/frame_%04d.webp"
          frameCount={121}
          mobileFramePath="/frames/hero-mobile/frame_%04d.webp"
          mobileFrameCount={40}
          aspectRatio={16 / 9}
        >
          <HeroCaption />
        </ScrollFrameSequence>
        <ApproachPanels />
        <ScrollFrameSequence
          framePath="/frames/windshield/frame_%04d.webp"
          frameCount={121}
          mobileFramePath="/frames/windshield-mobile/frame_%04d.webp"
          mobileFrameCount={40}
          aspectRatio={16 / 9}
        >
          <InteriorCaption />
        </ScrollFrameSequence>
        <ServicesList />
        <StatementSection />
        <ScrollFrameSequence
          framePath="/frames/burnout/frame_%04d.webp"
          frameCount={121}
          mobileFramePath="/frames/burnout-mobile/frame_%04d.webp"
          mobileFrameCount={40}
          aspectRatio={16 / 9}
        >
          <FinaleCaption />
        </ScrollFrameSequence>
        <WorkTeaser />
        <FinalCTA />
        <Footer />
      </main>
    </>
  );
}
