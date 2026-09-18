import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { HeroBackground } from './HeroBackground';
import Link from 'next/link';
import s from './Home.module.css';

export function Hero() {
  return (
    <section className={s.hero} aria-labelledby="home-heading" data-home-hero>
      <HeroBackground />
      <div className={`${s.wrap} ${s.heroGrid}`}>
        <div className={s.heroCopy}>
          <p className={s.eyebrow}>
            <span className={s.statusDot} /> Your university. Your community.
          </p>
          <h1 className={s.heroTitle} id="home-heading">
            <span>Your university.</span>
            <span>Your people.</span>
            <span className={s.serif}>For you.</span>
          </h1>
          <p className={s.heroDescription}>
            A marketplace that feels like belonging. Find what you need, pass on what you love, and
            meet the Waterloo people who make campus yours.
          </p>
          <div className={s.actions}>
            <Link className={s.primaryButton} href="/signup">
              Find your people <ArrowUpRight aria-hidden="true" size={18} />
            </Link>
            <Link className={s.textLink} href="/marketplace" prefetch={false}>
              Explore the marketplace <ArrowUpRight aria-hidden="true" size={16} />
            </Link>
          </div>
          <p className={s.heroNote}>Your @uwaterloo.ca email is your way in.</p>
        </div>
      </div>
      <div className={`${s.wrap} ${s.heroFoot}`}>
        <p>Built by students. Shared by your university.</p>
        <a className={s.textLink} href="#why-waterloo">
          Take a look around <ArrowDown aria-hidden="true" size={16} />
        </a>
      </div>
    </section>
  );
}
