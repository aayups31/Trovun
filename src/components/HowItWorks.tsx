import { ArrowUpRight, Check, CheckCheck, Search, ShieldCheck } from 'lucide-react';
import Image from '@/components/ui/ResilientImage';
import { TrovunGlyph } from './TrovunGlyph';
import s from './Home.module.css';

export function HowItWorks() {
  return (
    <section
      className={`${s.section} ${s.storySection}`}
      id="how-it-works"
      data-home-story
      aria-labelledby="how-heading"
    >
      <div className={`${s.wrap} ${s.storySticky}`}>
        <header className={s.storyHeader} data-home-reveal>
          <p className={s.eyebrow}>Less friction. More connection.</p>
          <h2 className={s.heading} id="how-heading">
            It feels <span className={s.serif}>familiar.</span>
          </h2>
          <p>A shared campus makes everything a little easier.</p>
        </header>
        <div className={s.storyGrid} data-home-stage>
          <article className={s.storyCard} data-home-story-card>
            <div className={`${s.scene} ${s.accessScene}`} aria-hidden="true" data-preview="access">
              <div className={s.accessPanel} data-home-scene-panel>
                <div data-preview-content>
                  <TrovunGlyph className={s.sceneLogo} />
                  <p className={s.sceneTitle}>You’re in good company.</p>
                  <p className={s.sceneSub}>A marketplace just for Waterloo.</p>
                  <div className={s.accessInputStage}>
                    <div className={s.emailField} data-email-field>
                      <span>
                        {'you@uwaterloo.ca'.split('').map((char, index) => (
                          <span data-email-char key={index}>
                            {char}
                          </span>
                        ))}
                      </span>
                      <Check size={15} data-email-check />
                    </div>
                    <div className={s.demoCode} data-access-code>
                      {'294681'.split('').map((digit, index) => (
                        <span data-code-digit key={index}>
                          {digit}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className={s.verifiedPill} data-access-verified>
                    <ShieldCheck size={15} /> Waterloo email verified
                  </div>
                  <div className={s.demoButton} data-access-button>
                    Welcome to Trovun <ArrowUpRight size={15} />
                  </div>
                </div>
              </div>
            </div>
            <div className={s.storyCaption}>
              <h3>Your campus is your way in.</h3>
              <p>Verify your Waterloo email. Meet the community you already belong to.</p>
            </div>
          </article>
          <article className={`${s.storyCard} ${s.browseStory}`} data-home-story-card>
            <div className={`${s.scene} ${s.browseScene}`} aria-hidden="true" data-preview="browse">
              <div className={s.browsePanel} data-home-scene-panel>
                <div data-preview-content>
                  <div className={s.demoBrand}>
                    <TrovunGlyph className={s.miniLogo} /> Trovun <span>Waterloo</span>
                  </div>
                  <div className={s.demoSearch}>
                    <Search size={15} />
                    <span className={s.searchText}>
                      <span data-search-placeholder>Find your next good thing</span>
                      <span className={s.searchQuery} data-search-query>
                        {'desk setup'.split('').map((char, index) => (
                          <span data-search-char key={index}>
                            {char}
                          </span>
                        ))}
                      </span>
                    </span>
                  </div>
                  <div className={s.demoTabs}>
                    <span>For you</span>
                    <span>Books</span>
                    <span>Electronics</span>
                  </div>
                  <div className={s.demoResultsViewport}>
                    <div className={s.demoProducts} data-browse-all>
                      {[
                        ['electronics', 'Desk setup', '$145'],
                        ['books', 'Course books', '$38'],
                        ['household', 'Desk lamp', '$26'],
                        ['clothing', 'Campus layers', '$32'],
                      ].map(([category, title, price]) => (
                        <div key={category}>
                          <div className={s.demoProductImage}>
                            <Image
                              src={`/waterloo/category-${category}-photo-v3.webp`}
                              alt=""
                              fill
                              sizes="150px"
                            />
                          </div>
                          <p>
                            {title}
                            <span>{price}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className={s.demoResults} data-browse-results>
                      <p className={s.resultsLabel}>For your desk</p>
                      {[
                        ['electronics', '27″ monitor', '$145'],
                        ['household', 'Desk lamp', '$26'],
                      ].map(([category, title, price]) => (
                        <div className={s.demoResult} key={category}>
                          <span>
                            <Image
                              src={`/waterloo/category-${category}-photo-v3.webp`}
                              fill
                              sizes="100px"
                              alt=""
                            />
                          </span>
                          <p>
                            {title}
                            <small>Available on campus</small>
                          </p>
                          <strong>{price}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={s.storyCaption}>
              <h3>Good finds, a little closer.</h3>
              <p>Browse useful things from students nearby. Find the one that fits your term.</p>
            </div>
          </article>
          <article className={s.storyCard} data-home-story-card>
            <div className={`${s.scene} ${s.chatScene}`} aria-hidden="true" data-preview="chat">
              <div className={s.chatPanel} data-home-scene-panel>
                <div data-preview-content>
                  <div className={s.chatHeader}>
                    <span className={s.chatAvatar}>
                      <TrovunGlyph className={s.miniLogo} />
                    </span>
                    <div>
                      Waterloo student
                      <small>
                        <ShieldCheck size={12} /> Verified account
                      </small>
                    </div>
                  </div>
                  <p className={s.chatBubble} data-chat-message>
                    Hey! Is the desk lamp still available?
                  </p>
                  <p className={`${s.chatBubble} ${s.chatReply}`} data-chat-message>
                    It is! Meet at SLC after class?
                  </p>
                  <p className={s.chatBubble} data-chat-message>
                    Perfect. See you there!
                  </p>
                  <span className={s.chatRead} data-chat-receipt>
                    <CheckCheck size={14} /> SLC. After class. Sorted.
                  </span>
                </div>
              </div>
            </div>
            <div className={s.storyCaption}>
              <h3>A message. A meetup. Yours.</h3>
              <p>Chat on Trovun and choose a familiar public spot to make the handoff.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
