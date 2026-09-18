import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { TrovunGlyph } from './TrovunGlyph';
import s from './Home.module.css';
export function FinalCTA() {
  return (
    <section className={`${s.section} ${s.joinSection}`} id="join" aria-labelledby="join-heading">
      <div className={s.wrap}>
        <div className={s.joinContent} data-home-reveal>
          <TrovunGlyph className={s.joinGlyph} />
          <p className={s.eyebrow}>Your university. Your people.</p>
          <h2 className={s.joinHeading} id="join-heading">
            You already belong.
            <br />
            <span className={s.serif}>Find your people.</span>
          </h2>
          <p>A marketplace made for you and the campus you call home.</p>
          <Link className={s.primaryButton} href="/signup">
            Join Trovun <ArrowUpRight aria-hidden="true" size={18} />
          </Link>
          <span className={s.joinNote}>Exclusively for verified Waterloo students.</span>
        </div>
      </div>
    </section>
  );
}
