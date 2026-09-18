type Gsap = (typeof import('gsap'))['gsap'];
type ScrollTriggerPlugin = (typeof import('gsap/ScrollTrigger'))['ScrollTrigger'];

// Loop the authored sequences while visible; suspend offscreen and in hidden tabs.
export function setupHomePreviews(
  root: HTMLElement,
  gsap: Gsap,
  ScrollTrigger: ScrollTriggerPlugin,
) {
  const story = root.querySelector<HTMLElement>('[data-home-story]');
  if (!story) return () => {};
  const master = gsap.timeline({ paused: true, repeat: -1 });
  const panels = root.querySelectorAll('[data-home-scene-panel]');
  const visible = new Set<Element>();
  root.querySelectorAll<HTMLElement>('[data-preview]').forEach((scene) => {
    const q = (selector: string) => scene.querySelectorAll(selector);
    const clip = gsap.timeline({
      defaults: { ease: 'power2.out' },
    });
    if (scene.dataset.preview === 'access') {
      clip
        .set(q('[data-email-field]'), { autoAlpha: 1 }, 0)
        .set(q('[data-access-code]'), { autoAlpha: 0 }, 0)
        .fromTo(
          q('[data-email-char]'),
          { opacity: 0 },
          { opacity: 1, duration: 0.07, stagger: 0.09, ease: 'none' },
          0.4,
        )
        .fromTo(
          q('[data-email-check]'),
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 0.45 },
          1.9,
        )
        .to(q('[data-email-field]'), { autoAlpha: 0, duration: 0.35 }, 2.4)
        .to(q('[data-access-code]'), { autoAlpha: 1, duration: 0.4 }, 2.65)
        .fromTo(
          q('[data-code-digit]'),
          { opacity: 0, y: 5 },
          { opacity: 1, y: 0, stagger: 0.19, duration: 0.35 },
          2.8,
        )
        .to(q('[data-access-code]'), { autoAlpha: 0, duration: 0.35 }, 4.25)
        .to(q('[data-email-field]'), { autoAlpha: 1, duration: 0.4 }, 4.5)
        .fromTo(
          q('[data-access-verified]'),
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.7 },
          4.65,
        )
        .fromTo(
          q('[data-access-button]'),
          { opacity: 0.35, y: 5 },
          { opacity: 1, y: 0, duration: 0.8 },
          5,
        );
    } else if (scene.dataset.preview === 'browse') {
      clip
        .set(q('[data-browse-all]'), { autoAlpha: 1, y: 0 }, 0)
        .set(q('[data-browse-results]'), { autoAlpha: 0, y: 12 }, 0)
        .set(q('[data-search-placeholder]'), { opacity: 1 }, 0)
        .set(q('[data-search-query]'), { opacity: 0 }, 0)
        .to(q('[data-search-placeholder]'), { opacity: 0, duration: 0.3 }, 0.9)
        .to(q('[data-search-query]'), { opacity: 1, duration: 0.1 }, 1.15)
        .fromTo(
          q('[data-search-char]'),
          { opacity: 0 },
          { opacity: 1, stagger: 0.14, duration: 0.08, ease: 'none' },
          1.2,
        )
        .to(q('[data-browse-all]'), { autoAlpha: 0, y: -10, duration: 0.6 }, 3.4)
        .to(q('[data-browse-results]'), { autoAlpha: 1, y: 0, duration: 0.95 }, 3.7);
    } else {
      clip
        .fromTo(
          q('[data-chat-message]'),
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: 0.85,
            stagger: 1.9,
          },
          0.5,
        )
        .fromTo(
          q('[data-chat-receipt]'),
          { opacity: 0, y: 6 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
          },
          5.4,
        );
    }
    master.add(clip, 0);
    const sync = () => {
      if (document.visibilityState === 'visible' && visible.size > 0) master.play();
      else master.pause();
    };
    const trigger = ScrollTrigger.create({
      trigger: scene,
      start: 'top 82%',
      end: 'bottom 5%',
      onToggle: (self) => {
        if (self.isActive) visible.add(scene);
        else visible.delete(scene);
        sync();
      },
    });
    if (trigger.isActive) visible.add(scene);
    sync();
  });
  // One envelope hides the entire frame, border and contents on the same beat.
  // The star field belongs to the scene and is never part of this timeline.
  master
    .fromTo(
      panels,
      { autoAlpha: 0, y: 22 },
      { autoAlpha: 1, y: 0, duration: 2, ease: 'sine.inOut' },
      0,
    )
    .to(panels, { autoAlpha: 0, y: -24, duration: 2.8, ease: 'sine.inOut' }, 8)
    .to({}, { duration: 0.6 });
  const syncAll = () => {
    if (visible.size > 0 && document.visibilityState === 'visible') master.play();
    else master.pause();
  };
  syncAll();
  story.setAttribute('data-previews-ready', '');
  story.addEventListener('trovun:story-progress', syncAll);
  document.addEventListener('visibilitychange', syncAll);
  return () => {
    master.kill();
    story.removeAttribute('data-previews-ready');
    story.removeEventListener('trovun:story-progress', syncAll);
    document.removeEventListener('visibilitychange', syncAll);
  };
}
