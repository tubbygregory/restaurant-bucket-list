'use strict';
const viewNames = ['map', 'find', 'filters', 'results', 'details', 'more'];
const captions = { map: 'Your next great meal', find: 'Step 1 · Find a place', filters: 'Step 2 · Make it yours', results: 'Step 3 · Choose a restaurant', details: 'Restaurant details', more: 'Installation, updates & live data' };
let currentView = 'map';
function showView(view, push = true, focus = true) {
  if (!viewNames.includes(view)) view = 'map';
  const previous = currentView;
  currentView = view;
  if (push && location.hash.split('?')[0] !== `#${view}`) history.pushState({ restaurantView: view }, '', `#${view}`);
  document.getElementById('map-stage').hidden = view !== 'map';
  document.getElementById('map').hidden = view !== 'map';
  document.getElementById('workspace').hidden = view === 'map';
  for (const name of viewNames.filter(name => name !== 'map')) document.getElementById(`view-${name}`).hidden = name !== view;
  document.getElementById('search-steps').hidden = view === 'more' || view === 'details';
  document.getElementById('view-back').hidden = view === 'map';
  document.getElementById('view-caption').textContent = view === 'map' && typeof mapSummary !== 'undefined' ? mapSummary : captions[view];
  document.querySelector('.header-find').hidden = view !== 'map';
  document.querySelectorAll('[data-view]').forEach(button => {
    const active = button.dataset.view === view || (view === 'filters' && button.closest('.bottom-nav') && button.dataset.view === 'find');
    if (active) button.setAttribute('aria-current', button.closest('.search-steps') ? 'step' : 'page');
    else button.removeAttribute('aria-current');
  });
  if (view === 'map') {
    map.invalidateSize();
    if (locationOrigin) focusLocation();
    if (focus && previous !== 'map') document.querySelector('.header-find').focus();
  } else {
    document.getElementById('workspace').scrollTop = 0;
    if (focus) document.getElementById(`${view === 'find' ? 'find' : view}-heading`).focus();
  }
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
document.getElementById('view-back').addEventListener('click', () => {
  const back = { find: 'map', filters: 'find', results: 'filters', details: 'results', more: 'map' };
  showView(back[currentView] || 'map');
});
window.addEventListener('popstate', () => showView(location.hash.slice(1).split('?')[0], false));
showView(location.hash.slice(1).split('?')[0], false, false);
