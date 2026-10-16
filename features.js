'use strict';

const PERSONAL_KEY = 'restaurantBucketMap.personal.v1';
function restaurantKey(item) {
  // No spreadsheet IDs exist. Include the stored Maps link to distinguish branches.
  return JSON.stringify([item.name, item.city, item.area, item.maps].map(value => String(value || '').trim()));
}
function cleanPersonal(value) {
  return {
    favourite: value?.favourite === true,
    status: ['want', 'visited'].includes(value?.status) ? value.status : '',
    rating: Number.isInteger(value?.rating) && value.rating >= 1 && value.rating <= 5 ? value.rating : null,
    note: typeof value?.note === 'string' ? value.note.slice(0, 2000) : ''
  };
}
let personalRecords = Object.create(null);
let personalReadError = false;
try {
  const stored = JSON.parse(localStorage.getItem(PERSONAL_KEY) || '{}');
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) throw new Error('Invalid personal data');
  Object.entries(stored).forEach(([key, value]) => { personalRecords[key] = cleanPersonal(value); });
} catch (_) { personalReadError = true; }
let selectedRestaurant = null;
let lastPickedKey = null;
let restoredHash = null;
const byId = id => document.getElementById(id);
function personalFor(item) { return personalRecords[restaurantKey(item)] || cleanPersonal(null); }
function matchesPersonal(item) {
  const value = personalFor(item);
  const status = byId('personal-status').value;
  return (!byId('favourites-only').checked || value.favourite) &&
    (!status || (status === 'unmarked' ? !value.status : value.status === status));
}
function resetPersonalFilters() {
  byId('personal-status').value = '';
  byId('favourites-only').checked = false;
  byId('clear-map-area').hidden = true;
}
function inMapBounds(coords, bounds) {
  return coords.lat >= bounds.south && coords.lat <= bounds.north &&
    (bounds.west <= bounds.east ? coords.lon >= bounds.west && coords.lon <= bounds.east : coords.lon >= bounds.west || coords.lon <= bounds.east);
}
function sortMatches(matches) {
  let mode = byId('sort-results').value || 'auto';
  if (mode === 'nearest' && !locationOrigin) {
    mode = 'auto';
    byId('sort-results').value = 'auto';
    byId('discovery-message').textContent = 'Choose a place or use Near me to sort by distance.';
  }
  const nearest = mode === 'nearest' || (mode === 'auto' && locationOrigin);
  const price = item => /^£{1,4}$/.test(item.price) ? item.price.length : Infinity;
  const priority = item => item.priority || '\uffff';
  return matches.sort((a, b) => {
    let difference = 0;
    if (nearest) difference = (a.distance ?? Infinity) - (b.distance ?? Infinity);
    if (mode === 'price') difference = price(a.item) - price(b.item);
    if (mode === 'priority') difference = priority(a.item).localeCompare(priority(b.item), 'en-GB');
    return (Number.isNaN(difference) ? 0 : difference) || a.item.name.localeCompare(b.item.name, 'en-GB');
  });
}
function personalSummary(item) {
  const value = personalFor(item);
  return [value.favourite ? '♥ Favourite' : '', value.status === 'visited' ? 'Visited' : value.status === 'want' ? 'Want to go' : '', value.rating ? `★ ${value.rating}/5` : ''].filter(Boolean).join(' · ');
}
function decorateMarker(marker, item) {
  if (!marker.on) return;
  marker.on('popupopen', event => {
    const content = event.popup.getElement()?.querySelector('.leaflet-popup-content');
    if (!content || content.querySelector('.open-details')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'open-details';
    button.textContent = 'View restaurant details';
    button.addEventListener('click', () => openDetails(item));
    content.appendChild(button);
  });
}
function restaurantLink(item) {
  const url = new URL(location.href);
  url.search = '';
  url.hash = `details?${new URLSearchParams({ restaurant: restaurantKey(item) })}`;
  return url.href;
}
function openDetails(item, push = true, picked = false) {
  selectedRestaurant = item;
  byId('personal-form').hidden = false;
  byId('details-heading').textContent = item.name;
  byId('restaurant-details').innerHTML = popupHtml(item) + (!item.coords ? '<p class="unmapped-note">This record has no valid map coordinates. Venue links are still available.</p>' : '');
  const personal = personalFor(item);
  byId('detail-favourite').checked = personal.favourite;
  byId('detail-status').value = personal.status;
  byId('detail-rating').value = personal.rating || '';
  byId('detail-note').value = personal.note;
  byId('details-map').disabled = !item.coords;
  byId('shuffle-restaurant').hidden = !picked;
  byId('personal-message').textContent = personalReadError ? 'Personal storage could not be read. Existing saved data will not be overwritten.' : 'These details stay on this browser/device. They are not synced or included in shared links.';
  byId('restaurant-link').value = restaurantLink(item);
  showView('details', push);
  if (push) history.replaceState({ restaurantView: 'details' }, '', new URL(restaurantLink(item)).hash);
}
function showRestaurantMap(item) {
  if (!item?.coords) return;
  showView('map');
  // The selected restaurant can be outside the currently filtered marker set (e.g. a shared link).
  if (typeof detailMarker !== 'undefined' && detailMarker) map.removeLayer(detailMarker);
  detailMarker = L.marker([item.coords.lat, item.coords.lon], { title: item.name, alt: item.name }).addTo(map).bindPopup(popupHtml(item));
  map.setView([item.coords.lat, item.coords.lon], 15);
  decorateMarker(detailMarker, item);
  detailMarker.openPopup();
}
let detailMarker = null;
function clearDetailMarker() {
  if (detailMarker) map.removeLayer(detailMarker);
  detailMarker = null;
}
function pickRestaurant() {
  const pool = matchedResults.filter(result => !(locationOrigin || mapBoundsFilter) || result.item.coords).map(result => result.item);
  const alternatives = pool.length > 1 ? pool.filter(item => restaurantKey(item) !== lastPickedKey) : pool;
  if (!alternatives.length) {
    byId('discovery-message').textContent = 'No restaurant matches this selection with a known location. Clear filters or widen your search.';
    return;
  }
  const item = alternatives[Math.floor(Math.random() * alternatives.length)];
  lastPickedKey = restaurantKey(item);
  openDetails(item, true, true);
}
byId('personal-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!selectedRestaurant) return;
  if (personalReadError) {
    byId('personal-message').textContent = 'Could not read existing personal storage, so no changes were saved. Check browser storage permissions before trying again.';
    return;
  }
  const value = cleanPersonal({ favourite: byId('detail-favourite').checked, status: byId('detail-status').value, rating: Number(byId('detail-rating').value), note: byId('detail-note').value });
  personalRecords[restaurantKey(selectedRestaurant)] = value;
  try {
    localStorage.setItem(PERSONAL_KEY, JSON.stringify(personalRecords));
    byId('personal-message').textContent = 'Saved on this device.';
  } catch (_) { byId('personal-message').textContent = 'Kept for this session only: browser storage is unavailable. Changes will be lost when you close this app.'; }
  render();
});
byId('details-map').addEventListener('click', () => showRestaurantMap(selectedRestaurant));
byId('pick-restaurant').addEventListener('click', pickRestaurant);
byId('shuffle-restaurant').addEventListener('click', pickRestaurant);
for (const id of ['personal-status', 'favourites-only', 'sort-results']) byId(id).addEventListener('change', () => {
  resultsLimit = 30;
  if (id === 'sort-results' && byId(id).value === 'nearest' && !locationOrigin) {
    byId('discovery-message').textContent = 'Choose a place or use Near me in Find to sort by distance.';
    byId(id).value = 'auto';
  } else byId('discovery-message').textContent = '';
  render();
});
byId('load-more').addEventListener('click', () => {
  const firstNew = resultsLimit;
  resultsLimit += 30;
  render();
  byId('nearby-list').children[firstNew]?.querySelector('button')?.focus();
});
byId('search-map-area').addEventListener('click', () => {
  const bounds = map.getBounds();
  clearLocation();
  map.fitBounds(bounds);
  mapBoundsFilter = { south: bounds.getSouth(), north: bounds.getNorth(), west: bounds.getWest(), east: bounds.getEast() };
  // Wrapped world copies must use canonical longitudes; a full world span needs no longitude filter.
  if (mapBoundsFilter.east - mapBoundsFilter.west >= 360) { mapBoundsFilter.west = -180; mapBoundsFilter.east = 180; }
  else { const wrap = value => ((value + 180) % 360 + 360) % 360 - 180; mapBoundsFilter.west = wrap(mapBoundsFilter.west); mapBoundsFilter.east = wrap(mapBoundsFilter.east); }
  byId('clear-map-area').hidden = false;
  resultsLimit = 30;
  render();
  showView('results');
});
byId('clear-map-area').addEventListener('click', () => { mapBoundsFilter = null; byId('clear-map-area').hidden = true; render(); });

function shortlistState(includeLocation) {
  const filters = Object.fromEntries(Object.keys(filterLabels).map(field => [field, byId(field).value]));
  const state = { q: searchInput.value.slice(0, 160), filters, sort: byId('sort-results').value };
  if (includeLocation && locationOrigin) { state.origin = { lat: locationOrigin.lat, lon: locationOrigin.lon }; state.radius = byId('radius').value; }
  if (includeLocation && mapBoundsFilter) state.bounds = mapBoundsFilter;
  return state;
}
function buildShortlistLink(includeLocation = false) {
  const url = new URL(location.href);
  url.search = '';
  url.hash = `results?${new URLSearchParams({ filters: JSON.stringify(shortlistState(includeLocation)) })}`;
  return url.href;
}
byId('share-shortlist').addEventListener('click', () => {
  byId('share-panel').hidden = false;
  byId('share-link').value = '';
  byId('share-location').checked = false;
  byId('share-message').textContent = 'This shares category and text filters, not personal collection filters. Nearby and map-area filters are excluded unless you opt in.';
});
byId('close-share').addEventListener('click', () => { byId('share-panel').hidden = true; byId('share-shortlist').focus(); });
byId('build-share').addEventListener('click', () => {
  byId('share-link').value = buildShortlistLink(byId('share-location').checked);
  byId('share-message').textContent = 'Link ready. It will show the current live spreadsheet when opened; restaurant data can change.';
});
async function shareLink(url, title, messageElement) {
  if (!url) { messageElement.textContent = 'Create a link first.'; return; }
  if (navigator.share) {
    try { await navigator.share({ title, url }); messageElement.textContent = 'Shared.'; return; }
    catch (error) { if (error.name === 'AbortError') { messageElement.textContent = 'Sharing cancelled.'; return; } }
  }
  messageElement.textContent = 'Use Copy link, or select and copy the link shown here.';
}
byId('native-share').addEventListener('click', () => shareLink(byId('share-link').value, 'Restaurant shortlist', byId('share-message')));
async function copyLink(input, message) {
  if (!input.value) { message.textContent = 'Create a link first.'; return; }
  try { await navigator.clipboard.writeText(input.value); message.textContent = 'Link copied.'; }
  catch (_) { input.focus(); input.select(); message.textContent = 'Select and copy this link using your browser.'; }
}
byId('copy-share').addEventListener('click', () => copyLink(byId('share-link'), byId('share-message')));
byId('copy-restaurant').addEventListener('click', () => copyLink(byId('restaurant-link'), byId('personal-message')));
byId('share-restaurant').addEventListener('click', () => {
  if (selectedRestaurant) shareLink(restaurantLink(selectedRestaurant), selectedRestaurant.name, byId('personal-message'));
});
function restoreSharedState() {
  const hash = location.hash;
  if (hash === restoredHash || !data.length) return;
  restoredHash = hash;
  const params = new URLSearchParams(hash.split('?').slice(1).join('?'));
  if (params.has('restaurant')) {
    const item = data.find(item => restaurantKey(item) === params.get('restaurant'));
    if (item) openDetails(item, false);
    else { byId('details-heading').textContent = 'Restaurant not found'; byId('restaurant-details').textContent = 'This restaurant may have changed in the spreadsheet. Search the current list to find it.'; selectedRestaurant = null; byId('personal-form').hidden = true; byId('details-map').disabled = true; byId('shuffle-restaurant').hidden = true; byId('restaurant-link').value = ''; byId('personal-message').textContent = '';  }
  }
  if (params.has('filters')) {
    try {
      const raw = params.get('filters');
      if (raw.length > 12000) throw new Error('Link too large');
      const state = JSON.parse(raw);
      if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('Invalid filters');
      searchInput.value = typeof state.q === 'string' ? state.q.slice(0, 160) : '';
      resetPersonalFilters();
      clearLocation();
      mapBoundsFilter = null;
      for (const field of Object.keys(filterLabels)) byId(field).value = typeof state.filters?.[field] === 'string' ? state.filters[field].slice(0, 512) : '';
      populateFilters();
      if (Object.keys(filterLabels).some(field => typeof state.filters?.[field] === 'string' && state.filters[field] && byId(field).value !== state.filters[field])) byId('discovery-message').textContent = 'Some shared filters no longer exist in the sheet. Please check the filters shown here.';
      byId('sort-results').value = ['auto', 'name', 'nearest', 'priority', 'price'].includes(state.sort) ? state.sort : 'auto';
      if (state.origin && typeof state.origin.lat === 'number' && typeof state.origin.lon === 'number' && resolveCoordinates({ latitude: state.origin.lat, longitude: state.origin.lon })) {
        byId('radius').value = ['5', '10', '25', '50'].includes(state.radius) ? state.radius : '10';
        setLocation(state.origin, 'shared location');
      }
      const b = state.bounds;
      if (b && ['south', 'north', 'west', 'east'].every(key => typeof b[key] === 'number' && Number.isFinite(b[key])) && b.south >= -90 && b.north <= 90 && b.south <= b.north && Math.abs(b.west) <= 180 && Math.abs(b.east) <= 180) {
        mapBoundsFilter = { south: b.south, north: b.north, west: b.west, east: b.east }; byId('clear-map-area').hidden = false;
      }
    } catch (_) { byId('discovery-message').textContent = 'This shared link is invalid. Use Find to choose your own filters.'; }
  }
}
window.addEventListener('popstate', () => { restoreSharedState(); render(); });
restoreSharedState();
if (data.length) render();
