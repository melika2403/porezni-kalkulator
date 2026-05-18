import Hero from "src/components/Hero/Hero";
import Features from "src/components/Features/Features";
import Pricing from "src/components/Pricing/Pricing";
import HowItWorks from "src/components/HowItWorks/HowItWorks";
import SifreTeaser from "src/components/SifreTeaser/SifreTeaser";
import JavniPrihodiTeaser from "src/components/JavniPrihodiTeaser/JavniPrihodiTeaser";
import PoreznKalendar from "src/components/PoreznKalendar/PoreznKalendar";
import Faq from "src/components/Faq/Faq";

export default function HomePage() {
  return (
    <>
      <main>
        <Hero />
        <Features />
        <Pricing />
        <HowItWorks />
        <SifreTeaser />
        <JavniPrihodiTeaser />
        <PoreznKalendar />
        <Faq />
      </main>
    </>
  );
}
