import Hero from "src/components/Hero/Hero";
import Features from "src/components/Features/Features";
import Pricing from "src/components/Pricing/Pricing";
import HowItWorks from "src/components/HowItWorks/HowItWorks";
import PkOfficeTeaser from "src/components/PkOfficeTeaser/PkOfficeTeaser";
import BlogTeaser from "src/components/BlogTeaser/BlogTeaser";
import SifreTeaser from "src/components/SifreTeaser/SifreTeaser";
import JavniPrihodiTeaser from "src/components/JavniPrihodiTeaser/JavniPrihodiTeaser";
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
        <SifreTeaser />
        <JavniPrihodiTeaser />
        <PoreznKalendar />
        <Faq />
        <FinalCta />
      </main>
    </>
  );
}
