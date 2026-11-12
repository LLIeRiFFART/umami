/* Own the decorative IX2 motion; retain Webflow's slider, lightbox and forms. */
(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 1140px)');
  const all = (selector) => Array.from(document.querySelectorAll(selector));
  const running = new Set();

  // Stop exported motion while the early boot mask still hides initial states.
  // Components (forms, slider, lightbox, dropdown) keep their original runtime.
  if (typeof window.Webflow?.require === 'function') {
    const ix2 = window.Webflow.require('ix2');
    if (ix2) {
      ix2.destroy();
    }
    const ix3 = window.Webflow.require('ix3');
    if (ix3) {
      ix3.destroy();
      ix3.ready = () => Promise.resolve();
      ix3.getInstance = () => null;
    }
  }

  function animate(element, frames, duration = 320, delay = 0) {
    if (reduced.matches || !element.animate) return Promise.resolve();
    const animation = element.animate(frames, {
      duration, delay, easing: 'cubic-bezier(.2, .65, .3, 1)', fill: 'backwards',
    });
    running.add(animation);
    return animation.finished.catch(() => {}).finally(() => running.delete(animation));
  }

  function init() {
    const ix2 = typeof window.Webflow?.require === 'function' ? window.Webflow.require('ix2') : null;
    ix2?.destroy();

    // Remove only the old animation state, not photo crop transforms from CSS.
    const legacy = all('.image, .text_title_1, .icon_benefit_1, .btn_1, '
      + '[class^="card_2_wrapped"], .white_bg_up_5, .white_bg_bottom_5, '
      + '.text_-_3, .line_menu, .x-folder3');
    legacy.forEach((element) => {
      ['transform', 'opacity', 'display', 'will-change'].forEach((key) => element.style.removeProperty(key));
    });

    setupDialog();
    setupMenu();
    setupFAQ();
    all('[data-copyright-year]').forEach((element) => {
      element.textContent = String(new Date().getFullYear());
    });
    document.documentElement.classList.add('motion-ready');

    setupReveals();

    reduced.addEventListener('change', (event) => {
      if (event.matches) running.forEach((animation) => animation.finish());
    });
  }

  async function setupReveals() {
    const state = window.umamiMotion;
    const root = document.documentElement;
    const groups = [];
    const pending = new Set();

    function group(trigger, steps) {
      if (!trigger) return;
      const valid = steps.filter((step) => step.element);
      valid.forEach(({ element }) => {
        element.classList.add('reveal-pending');
        pending.add(element);
      });
      groups.push({ trigger, steps: valid });
    }

    function step(element, delay = 0, duration = 850, distance = 10, effect = null) {
      return { element, delay, duration, distance, effect };
    }

    function showEverything() {
      root.classList.remove('motion-boot');
      pending.forEach((element) => element.classList.remove('reveal-pending'));
      pending.clear();
      if (state) {
        state.enabled = false;
        window.clearTimeout(state.timer);
      }
    }

    if (!state?.enabled || reduced.matches || !Element.prototype.animate || !('IntersectionObserver' in window)) {
      showEverything();
      return;
    }

    // No positional animation on the CTA: its text stays in its final position.
    group(document.querySelector('.section_1'), [
      step(document.querySelector('.h1'), 0, 500, 0, 'chars'),
      step(document.querySelector('.right_1'), 80, 600, 0),
      step(document.querySelector('.text_title_1'), 250, 500, 200, 'slide-x'),
      ...all('.icon_benefit_1').map((element, index) => step(element, 380 + index * 110, 850, 0)),
      step(document.querySelector('.btn_1'), 480, 850, 0),
    ]);
    group(document.querySelector('.benefits_all_2'),
      all('[class^="card_2_wrapped"]').map((element, index) => step(element, index * 250, 850, 12)));

    group(document.querySelector('.title-btn_3'), [
      step(document.querySelector('.title-btn_3'), 0, 450),
      ...all('.lightbox_3').map((element, index) => step(element, 250 + index * 80, 600, 8)),
    ]);

    all('.title-btn_4, .title_4_rameni').forEach((heading) => {
      const cards = heading.nextElementSibling?.matches('.cards_4_all')
        ? Array.from(heading.nextElementSibling.querySelectorAll('.cards_4_wrapped')) : [];
      group(heading, [step(heading, 0, 450),
        ...cards.map((element, index) => step(element, 250 + index * 220, 950, 10))]);
    });
    all('.white_bg_up_5, .white_bg_bottom_5').forEach((element) => group(element, [step(element)]));
    all('.title-btn_7').forEach((element) => group(element, [step(element, 0, 450)]));

    // All initial states already exist before clearing the early boot mask.
    root.classList.remove('motion-boot');
    await document.fonts?.ready;
    if (!state.enabled || reduced.matches) { showEverything(); return; }
    window.clearTimeout(state.timer);

    async function reveal({ element, delay, duration, distance, effect }) {
      // Do not fade an empty image box and then pop in its decoded contents.
      const images = element.matches('img') ? [element] : Array.from(element.querySelectorAll('img'));
      await Promise.all(images.map((image) => image.decode?.().catch(() => {})));
      if (!state.enabled || reduced.matches) {
        element.classList.remove('reveal-pending');
        return;
      }
      if (effect === 'chars' && window.SplitText) {
        // Restore the original masked, character-by-character hero entrance,
        // without re-enabling the conflicting exported Webflow timelines.
        const split = new window.SplitText(element, { type: 'chars', mask: 'chars' });
        const chars = split.chars;
        const stagger = 150;
        const animations = chars.map((char, index) => char.animate([
          { opacity: 0, transform: 'translateY(20px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ], {
          duration: duration - stagger,
          delay: delay + index / Math.max(1, chars.length - 1) * stagger,
          easing: 'cubic-bezier(.22, .61, .36, 1)', fill: 'both',
        }));
        animations.forEach((animation) => running.add(animation));
        element.classList.remove('reveal-pending');
        pending.delete(element);
        await Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
        split.revert();
        animations.forEach((animation) => { animation.cancel(); running.delete(animation); });
        return;
      }
      const offset = effect === 'slide-x' ? `${distance}px 0` : `0 ${distance}px`;
      const frames = distance
        ? [{ opacity: 0, translate: offset }, { opacity: 1, translate: '0 0' }]
        : [{ opacity: 0 }, { opacity: 1 }];
      const animation = element.animate(frames, {
        duration, delay, easing: 'cubic-bezier(.22, .61, .36, 1)', fill: 'both',
      });
      running.add(animation);
      try { await animation.finished; } catch { /* Reduced motion or interrupted page. */ }
      // Keep the final paint until the underlying visible state has been restored.
      element.classList.remove('reveal-pending');
      pending.delete(element);
      animation.cancel();
      running.delete(animation);
    }

    const owners = new Map();
    const started = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
        const item = owners.get(entry.target);
        if (!item || started.has(item)) return;
        started.add(item);
        [item.trigger, ...item.steps.map(({ element }) => element)].forEach((element) => observer.unobserve(element));
        item.steps.forEach(reveal);
      });
    }, { threshold: 0.08 });
    // Also observe the content, so restoring a scroll position below its heading
    // never leaves a section hidden after refresh or an anchor jump.
    groups.forEach((item) => {
      [item.trigger, ...item.steps.map(({ element }) => element)].forEach((element) => {
        owners.set(element, item);
        observer.observe(element);
      });
    });
    reduced.addEventListener('change', (event) => {
      if (event.matches) { observer.disconnect(); showEverything(); }
    });
  }

  function setupDialog() {
    const dialog = document.querySelector('.form_pop_up');
    const backdrop = document.querySelector('.bg_form');
    if (!dialog || !backdrop) return;
    let open = false;
    let closing = false;
    let revision = 0;
    let returnFocus;
    let previousOverflow;
    const background = Array.from(dialog.parentElement.children).filter((element) => element !== dialog && element !== backdrop);
    const inertState = new Map();
    const focusable = () => Array.from(dialog.querySelectorAll('a[href], button, input, [tabindex="0"]')).filter((element) => !element.disabled);

    dialog.style.display = 'none';
    dialog.style.removeProperty('transform');
    dialog.style.removeProperty('opacity');
    dialog.setAttribute('aria-hidden', 'true');
    backdrop.style.display = 'none';

    async function close() {
      if (!open) return;
      open = false;
      closing = true;
      const current = ++revision;
      await Promise.all([
        animate(dialog, [{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '0 -12px' }], 220),
        animate(backdrop, [{ opacity: 1 }, { opacity: 0 }], 220),
      ]);
      if (current !== revision) return;
      closing = false;
      dialog.style.display = 'none';
      backdrop.style.display = 'none';
      dialog.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = previousOverflow;
      background.forEach((element) => { element.inert = inertState.get(element); });
      returnFocus?.focus({ preventScroll: true });
    }

    function show(event) {
      event.preventDefault();
      if (open || closing) return;
      open = true;
      revision++;
      returnFocus = event.currentTarget;
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      background.forEach((element) => {
        inertState.set(element, element.inert);
        element.inert = true;
      });
      dialog.style.display = 'flex';
      backdrop.style.display = 'block';
      dialog.setAttribute('aria-hidden', 'false');
      animate(backdrop, [{ opacity: 0 }, { opacity: 1 }], 280);
      animate(dialog, [{ opacity: 0, translate: '0 -16px' }, { opacity: 1, translate: '0 0' }], 360);
      dialog.querySelector('input')?.focus({ preventScroll: true });
    }

    all('.btn_header, .btn_footer, .btn_5, .title-btn_7 .btn_3').forEach((element) => {
      element.setAttribute('aria-haspopup', 'dialog');
      element.setAttribute('aria-controls', dialog.id);
      element.addEventListener('click', show);
    });
    dialog.querySelector('.close_form').addEventListener('click', (event) => { event.preventDefault(); close(); });
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', (event) => {
      if (!open) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const items = focusable();
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  }

  function setupMenu() {
    const button = document.querySelector('.menu_burger');
    const menu = document.querySelector('.nav_menu_mobile .container.flex_nav');
    if (!button || !menu) return;
    let open = false;
    let revision = 0;
    menu.style.removeProperty('transform');
    menu.style.removeProperty('opacity');
    menu.style.display = 'none';
    menu.inert = true;

    async function toggle(next, restoreFocus = false) {
      if (next === open) return;
      open = next;
      const current = ++revision;
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      menu.inert = !open;
      if (open) {
        menu.style.display = 'flex';
        animate(menu, [{ opacity: 0, translate: '0 12px' }, { opacity: 1, translate: '0 0' }], 280);
      } else {
        await animate(menu, [{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '0 8px' }], 180);
        if (current === revision) {
          menu.style.display = 'none';
          if (restoreFocus) button.focus({ preventScroll: true });
        }
      }
    }

    button.addEventListener('click', () => toggle(!open));
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => toggle(false, true)));
    document.addEventListener('click', (event) => {
      if (open && !menu.contains(event.target) && !button.contains(event.target)) toggle(false);
    });
    document.addEventListener('keydown', (event) => {
      if (open && event.key === 'Escape') { event.preventDefault(); toggle(false, true); }
    });
    desktop.addEventListener('change', () => toggle(false));
  }

  function setupFAQ() {
    all('.drop-down').forEach((dropdown, index) => {
      const toggle = dropdown.querySelector('.drop-1');
      const answer = dropdown.querySelector('.open-drop');
      const content = answer.querySelector('.paragraph');
      let animation;
      let revision = 0;
      let expanded = false;
      answer.id ||= `faq-answer-${index}`;
      answer.setAttribute('role', 'region');
      answer.setAttribute('aria-labelledby', toggle.id);
      answer.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-controls', answer.id);

      function update() {
        const next = toggle.getAttribute('aria-expanded') === 'true';
        if (next === expanded) return;
        expanded = next;
        const current = ++revision;
        const start = answer.getBoundingClientRect().height;
        animation?.cancel();
        answer.style.visibility = 'visible';
        answer.setAttribute('aria-hidden', String(!expanded));
        const height = expanded ? content.getBoundingClientRect().height : 0;
        answer.style.height = `${height}px`;
        if (reduced.matches || !answer.animate) {
          answer.style.visibility = expanded ? 'visible' : 'hidden';
          if (expanded) answer.style.height = 'auto';
          return;
        }
        animation = answer.animate([{ height: `${start}px` }, { height: `${height}px` }], {
          duration: 300, easing: 'cubic-bezier(.2, .65, .3, 1)',
        });
        running.add(animation);
        const active = animation;
        active.finished.then(() => {
          if (current !== revision) return;
          answer.style.height = expanded ? 'auto' : '0px';
          answer.style.visibility = expanded ? 'visible' : 'hidden';
        }).catch(() => {}).finally(() => running.delete(active));
      }

      new MutationObserver(update).observe(toggle, { attributes: true, attributeFilter: ['aria-expanded'] });
    });
  }

  // IX2's exported configuration starts at readyState=complete. Run after it.
  if (document.readyState === 'complete') init();
  else window.addEventListener('load', () => window.setTimeout(init, 0), { once: true });
})();
