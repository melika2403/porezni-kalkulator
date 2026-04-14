import Navbar from 'src/components/Navbar';
import Hero from 'src/components/Hero';
import Features from 'src/components/Features';
import Pricing from 'src/components/Pricing';
import HowItWorks from 'src/components/HowItWorks';
import Faq from 'src/components/Faq';
import Footer from 'src/components/Footer';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <HowItWorks />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
