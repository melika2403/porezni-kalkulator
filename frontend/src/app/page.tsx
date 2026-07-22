import Hero from "src/components/Hero/Hero";
import Features from "src/components/Features/Features";
import Pricing from "src/components/Pricing/Pricing";
import HowItWorks from "src/components/HowItWorks/HowItWorks";
import PkOfficeTeaser from "src/components/PkOfficeTeaser/PkOfficeTeaser";
import BlogTeaser from "src/components/BlogTeaser/BlogTeaser";
import ResourceTeasers from "src/components/ResourceTeasers/ResourceTeasers";
import PoreznKalendar from "src/components/PoreznKalendar/PoreznKalendar";
import Faq from "src/components/Faq/Faq";
import SocialProof from "src/components/SocialProof/SocialProof";
import FinalCta from "src/components/FinalCta/FinalCta";

export default function HomePage() {
  return (
    <>
      <main>
        <Hero />
        <Features />
        <Pricing />
        <HowItWorks />
        <SocialProof />
        <PkOfficeTeaser />
        <BlogTeaser />
        {/* Šifre djelatnosti + javni prihodi: dva ranija full-bleed teasera
            sažeta u jednu kompaktnu sekciju sa dvije kartice. */}
        <ResourceTeasers />
        <PoreznKalendar />
        <Faq />
        <FinalCta />
      </main>
    </>
  );
}
