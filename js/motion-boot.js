/* Prepare motion before the first paint; fail open if the main script fails. */
(() => {
  const root = document.documentElement;
  const state = window.umamiMotion = {
    enabled: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
  // The exported IX2 initial-state selectors must not hide/reposition content.
  root.classList.add('w-mod-ix');
  if (!state.enabled) return;
  root.classList.add('motion-boot');
  state.timer = window.setTimeout(() => {
    state.enabled = false;
    root.classList.remove('motion-boot');
    document.querySelectorAll('.reveal-pending').forEach((element) => element.classList.remove('reveal-pending'));
  }, 5000);
})();
