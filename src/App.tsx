import { Categories } from './components/Categories';
import { FinalCTA } from './components/FinalCTA';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { MarketingScrollMotion } from './components/MarketingScrollMotion';
import { Nav } from './components/Nav';
import { WhyBetter } from './components/WhyBetter';
import type { PublicListingShowcaseItem } from './features/marketplace/public-showcase';
import styles from './components/Home.module.css';

type AppProps = {
  showcaseListings: PublicListingShowcaseItem[];
};

export function App({ showcaseListings }: AppProps) {
  return (
    <div className={styles.home} data-home-root>
      <MarketingScrollMotion />
      <a className="um-skip-link" href="#main-content">
        Skip to main content
      </a>
      <div className="relative z-10 flex min-h-screen w-full flex-col">
        <Nav />
        <main className="flex-1" id="main-content">
          <Hero />
          <WhyBetter listings={showcaseListings} />
          <HowItWorks />
          <Categories />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </div>
  );
}
