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

## Filters and restaurant cards

Cuisine, price, city/location, neighbourhood and priority filters combine with search and any nearby radius. Options come from the current spreadsheet/cache, including “Not specified” for empty fields. Cuisine choices split slash-separated labels, so Japanese also matches Japanese / Ramen. Price uses the sheet’s exact categories; ££ and £££ remain distinct. Neighbourhood choices follow the selected city. Refresh preserves valid selections; Clear filters also clears the nearby origin and search.

Explore restaurants initially shows 30 matches; Load more adds the next 30 until every match is available. Choose name, priority, price or nearest ordering (nearest requires a chosen location). Unmapped records follow the mapped records in nearby mode. All records remain searchable and filterable; cards retain website and Google Maps links, including entries without valid map coordinates. The app opens on a full-height map. Use Find → Filters → Results, then select a restaurant to return to its marker. Map, Find, Results and More are always available in bottom navigation. Controls use their own full-height view, and selections survive step changes and browser Back. Installation, refresh and spreadsheet access live under More.

Installed apps show an Update app button when a new service worker is waiting. Click it to activate and reload; an ordinary first install does not force a reload. Automated accessibility checks can be included in browser tests with `AXE_PATH=/path/to/axe.min.js node tests/browser.cjs`. See `AUDIT.md` for audit scope, evidence and remaining limitations.

Navigation state uses URL fragments under the existing repository path. `navigation.js` manages the visible view, heading focus and map resizing; the service worker caches it and normalises navigation fragments for offline reload. The app cache is now v4. Navigation tests check that the map occupies more than 65% of each tested viewport, with controls entirely off the map screen.

## Personal collection and discovery

Open Details & save on a restaurant card, or View restaurant details in a map popup. Details bring together the sheet’s cuisine, price, address/location, journey and booking information plus stored venue/Maps links. Save Favourite, Want to go / Visited, a 1–5 rating and a note up to 2,000 characters. Filter the collection from Filters. These values are kept in `restaurantBucketMap.personal.v1` in this browser’s localStorage, separate from the restaurant cache. There is no account, device sync or server upload. Clearing site data or changing browser/device loses access. Storage errors are reported; corrupt stored data is preserved rather than overwritten. Branch identity uses name, city, area and the stored Maps link because the sheet has no stable row IDs; changing those identity fields can disconnect an existing personal entry.

Pick somewhere for me chooses from the current matches; Pick another avoids repeating the last choice when alternatives exist. With a nearby radius or map-area filter, it uses only records with valid coordinates. No availability or opening-hours claims are made.

Search this map area captures the visible map bounds and respects other filters. It replaces the nearby radius, supports wrapped/antimeridian views, and keeps unlocatable records browsable and explicitly counted. Clear map area removes it; choosing a new nearby location replaces it. No map movement triggers automatic searches or geocoding.

Share these filters creates a link containing text/category filters and sorting. Personal collection filters, notes, ratings and favourites are omitted. Nearby centre/map area are excluded by default; explicitly checking Include location puts those coordinates into the shared URL. Restaurant links identify a public spreadsheet record and never contain personal metadata. Links read the current live sheet when opened; changed or removed records/filters are reported. Share and Copy buttons use browser APIs with manual-copy fallback. Sharing does not send a message until the user uses their browser’s sharing UI.

Run `node tests/features-browser.cjs` in addition to the navigation browser tests for personal persistence, shuffle, sorting, all-results pagination, recipient privacy, shared deep links, visible-area search and offline details. Use the same APP_URL, CHROMIUM_PATH and optional AXE_PATH settings as the other browser suite.
