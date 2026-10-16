/* Apply before first paint, then keep device preferences and the selector in sync. */
(() => {
  'use strict';
  const key = 'restaurant-bucket-list-colour-mode';
  const modes = ['device', 'light', 'dark', 'contrast'];
  const dark = window.matchMedia('(prefers-color-scheme: dark)');
  const contrast = window.matchMedia('(prefers-contrast: more)');
  let mode = 'device';
  try {
    const saved = localStorage.getItem(key);
    if (modes.includes(saved)) mode = saved;
  } catch (_) { /* A usable default still works when storage is unavailable. */ }
  function apply() {
    const theme = mode === 'device' ? (contrast.matches ? 'contrast' : dark.matches ? 'dark' : 'light') : mode;
    document.documentElement.dataset.theme = theme;
    const chrome = document.querySelector('meta[name="theme-color"]');
    if (chrome) chrome.content = { light: '#faf9f4', dark: '#14221d', contrast: '#000000' }[theme];
  }
  apply();
  for (const media of [dark, contrast]) media.addEventListener('change', apply);
  document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('colour-mode');
    select.value = mode;
    select.addEventListener('change', () => {
      mode = modes.includes(select.value) ? select.value : 'device';
      apply();
      const status = document.getElementById('colour-mode-status');
      try {
        localStorage.setItem(key, mode);
        status.textContent = '';
      } catch (_) {
        status.textContent = 'Colour mode changed for this visit. Your browser could not save the preference.';
      }
    });
  });
})();
