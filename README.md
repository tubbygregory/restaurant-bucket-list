# Restaurant Bucket List

Buildless Leaflet map hosted on GitHub Pages. Restaurant and branch data loads live from the Google Sheet’s `Map Data` tab, with a browser-local cached fallback.

## Development

Run `python3 -m http.server 8000` from this directory. No build or package installation is required. Run `node --test tests/app.test.cjs` (Node 24) for regression checks of the inline application script. These tests use map and DOM doubles; they do not verify external services or Leaflet rendering.

Browser checks require access to docs.google.com, nominatim.openstreetmap.org and OpenStreetMap tile servers. Leaflet and marker clustering are pinned local assets. Check live loading, search, priority filtering, refresh, popups and mobile layout. Missing or invalid coordinates remain in the data and are reported in the result count.

Pull requests run regression checks. Pushes to `main` run checks and deploy the static app, scripts, manifest, service worker, icons, map libraries and `.nojekyll` using `.github/workflows/pages.yml`. The site supports the `/restaurant-bucket-list/` repository subpath. `netlify.toml` is legacy configuration; do not use Netlify for deployment.

## Nearby restaurants

Open “Find restaurants near a location”, submit a town/city/postcode and choose a result, or tap “Near me” and grant browser location permission. Pick a 5–50 mile radius. The map respects restaurant search and priority filters; the results list shows up to 30 nearest matches. Distances are straight line, not travel distance. Records without valid coordinates remain counted but cannot be tested for proximity. Clear location restores the full map.

Place search uses the free public OpenStreetMap Nominatim service, only on submission, with per-session query caching and at least one second between requests. Keep attribution and avoid autocomplete or bulk lookup. This is suitable for this personal site; significant traffic would require revisiting the provider. Device coordinates are used in memory for the current session and are not sent to the geocoder or stored by this app. The map still requests tiles for its visible area.

## Install and offline use

Android browsers can offer “Install app”; use the app’s install button when offered or the browser menu. On iPhone/iPad, open in Safari, choose Share → Add to Home Screen. The manifest has a standalone display, normal/maskable icons, and a repository-relative start URL and scope.

The service worker caches the app shell and local map libraries. After an online visit, cached restaurant data can be used offline; live spreadsheet updates, place search and map tiles need a connection. Browser storage eviction can remove offline data. Location permission is optional. Bump `sw.js`’s cache version when changing cached app assets; close existing tabs/windows to let a waiting update activate. Installation and OS integration should also be checked on real target phones.

Run `node tests/browser.cjs` with Playwright/Chromium installed and the repository served at `http://127.0.0.1:8001/restaurant-bucket-list/` (serve `/workspace` on port 8001). `APP_URL` and `CHROMIUM_PATH` can override those defaults. These browser checks use fixtures and include actual service-worker offline reloads; they do not validate live geocoding, spreadsheet permissions or real phone installation.
