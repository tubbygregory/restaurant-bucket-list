'use strict';

const locationStatus = document.getElementById('location-status');
const placeResults = document.getElementById('place-results');
const findPlace = document.getElementById('find-place');
const nearMe = document.getElementById('near-me');
let locationRequest = 0;
let lastPlaceSearch = 0;
const placeCache = new Map();
let searchCircle = null;

function setLocation(coords, label) {
  if (!resolveCoordinates({ latitude: coords.lat, longitude: coords.lon })) {
    locationStatus.textContent = 'This location has invalid coordinates. Please try another location.';
    return;
  }
  locationOrigin = coords;
  if (originMarker) map.removeLayer(originMarker);
  originMarker = L.circleMarker([coords.lat, coords.lon], { radius: 8, color: '#164e43', fillOpacity: 0.8 }).addTo(map).bindPopup(escapeHtml(label));
  focusLocation();
  locationStatus.textContent = `Near ${label}. Distances are straight line, not travel distances. Records without coordinates cannot be checked for proximity and remain counted below.`;
  document.getElementById('clear-location').hidden = false;
  render();
}

function focusLocation() {
  if (searchCircle) map.removeLayer(searchCircle);
  searchCircle = L.circle([locationOrigin.lat, locationOrigin.lon], { radius: Number(document.getElementById('radius').value || 10) * 1609.344, color: '#164e43', weight: 1, fillOpacity: 0.04 }).addTo(map);
  const bounds = searchCircle.getBounds();
  if (!document.getElementById('map').hidden) map.fitBounds(bounds, { paddingTopLeft: [20, 20], paddingBottomRight: [20, 20], maxZoom: 14 });
}

// Explicit submissions only: no autocomplete or background geocoding.
document.getElementById('location-form').addEventListener('submit', async event => {
  event.preventDefault();
  const query = document.getElementById('place').value.trim();
  if (!query) return;
  const request = ++locationRequest;
  placeResults.replaceChildren();
  findPlace.disabled = true;
  locationStatus.textContent = 'Finding location…';
  try {
    let places = placeCache.get(query.toLowerCase());
    if (!places) {
      if (Date.now() - lastPlaceSearch < 1100) throw new Error('Please wait a moment before searching again.');
      lastPlaceSearch = Date.now();
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.search = new URLSearchParams({ q: query, format: 'jsonv2', limit: '5' });
      const response = await fetch(url, { signal: AbortSignal.timeout(10000), credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin' });
      if (!response.ok) throw new Error('Place search is unavailable. Try again later or use Near me.');
      const result = await response.json();
      if (!Array.isArray(result)) throw new Error('Place search returned an unexpected response.');
      places = result.filter(place => place && typeof place.display_name === 'string' && resolveCoordinates({ latitude: place.lat, longitude: place.lon }));
      placeCache.set(query.toLowerCase(), places);
    }
    if (request !== locationRequest) return;
    locationStatus.textContent = places.length ? 'Choose a location:' : 'No locations found. Try a town name or a full postcode with country.';
    places.forEach(place => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = place.display_name;
      button.addEventListener('click', () => {
        ++locationRequest;
        placeResults.replaceChildren();
        setLocation({ lat: Number(place.lat), lon: Number(place.lon) }, place.display_name);
      });
      placeResults.appendChild(button);
    });
  } catch (error) {
    if (request === locationRequest) locationStatus.textContent = error.name === 'TimeoutError' ? 'Place search timed out. Try again or use Near me.' : (error.message || 'Could not find that location.');
  } finally {
    findPlace.disabled = false;
  }
});

nearMe.addEventListener('click', () => {
  const request = ++locationRequest;
  placeResults.replaceChildren();
  if (!navigator.geolocation) {
    locationStatus.textContent = 'Your browser does not support location. Search for a place instead.';
    return;
  }
  locationStatus.textContent = 'Waiting for your location…';
  nearMe.disabled = true;
  navigator.geolocation.getCurrentPosition(position => {
    nearMe.disabled = false;
    if (request !== locationRequest) return;
    setLocation({ lat: position.coords.latitude, lon: position.coords.longitude }, 'your location');
  }, error => {
    nearMe.disabled = false;
    if (request !== locationRequest) return;
    locationStatus.textContent = error.code === 1 ? 'Location permission was denied. Allow location in your browser settings or search for a place.' : 'Your location could not be found. Try again or search for a place.';
  }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
});

document.getElementById('radius').addEventListener('change', () => {
  if (locationOrigin) focusLocation();
  render();
});
function clearLocation() {
  ++locationRequest;
  locationOrigin = null;
  if (searchCircle) map.removeLayer(searchCircle);
  searchCircle = null;
  if (originMarker) map.removeLayer(originMarker);
  originMarker = null;
  locationStatus.textContent = '';
  placeResults.replaceChildren();
  document.getElementById('clear-location').hidden = true;
  map.setView([54, -2.5], 6);
  render();
}
document.getElementById('clear-location').addEventListener('click', clearLocation);
