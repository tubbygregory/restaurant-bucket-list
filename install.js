'use strict';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      document.getElementById('install-help').textContent += ' Offline setup failed; reconnect and reload to try again.';
    });
  });
}
let installPrompt = null;
const installButton = document.getElementById('install');
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
installButton.addEventListener('click', async () => {
  if (!installPrompt) return;
  const prompt = installPrompt;
  installPrompt = null;
  installButton.hidden = true;
  try {
    await prompt.prompt();
  } catch (_) {
    document.getElementById('install-help').textContent += ' The install prompt could not open. Use your browser’s installation menu instead.';
  }
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  installButton.hidden = true;
  document.getElementById('install-help').textContent = 'App installed. Open Restaurant Bucket List from your home screen.';
});
