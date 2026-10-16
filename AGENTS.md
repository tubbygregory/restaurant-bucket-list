# Restaurant Bucket List

Buildless static Leaflet map. Production: https://tubbygregory.github.io/restaurant-bucket-list/ (HTTP 200 and map application source verified on 2026-10-16).

## Source and deployment
- `index.html` contains the application, styling and client-side data loader.
- `.github/workflows/pages.yml` validates inline JavaScript and deploys `index.html`, location/install scripts, manifest, service worker, icons, vendored map assets and `.nojekyll` to GitHub Pages after pushes to `main` or a manual workflow dispatch.
- GitHub Pages is the production hosting target. The user enabled deployment after authorizing public repository visibility. Preserve GitHub Actions as the Pages source.
- Netlify is the legacy host. Do not reconnect it or treat it as the deployment target. Do not delete the legacy site without a user request.
- Do not commit secrets or credentials.

## Restaurant data
- Google Drive file ID: `18W5-PKVhFFDG4yvtG6pMZOXP_86XxnHjc4GsgIRrg3A`.
- The map reads the `Map Data` tab live using Google Visualization JSONP, with browser-local cached fallback.
- Preserve the spreadsheet connection, branch-level restaurant records, coordinates and Google Maps links.
- Update data via connected Google Drive tools; code changes belong in this repository.

## Validation
- Check inline JavaScript syntax after code changes.
- Verify live data loading, search, priority filters, refresh and marker popup links when browser access is available.
- Check mobile layout for changes affecting controls or map coverage.

## Location and installation
- `location.js` handles explicit Nominatim place searches and permission-based device geolocation. Do not add autocomplete/background geocoding or send device coordinates to a geocoder. Preserve attribution, submitted-query caching and rate limiting.
- Nearby filtering uses straight-line miles, preserves existing text/priority filters and reports unmapped records. Never invent coordinates.
- `manifest.webmanifest`, `install.js`, `sw.js` and `icons/` support installation. All paths and service-worker scope must work under `/restaurant-bucket-list/`.
- Map libraries are pinned local distribution files in `vendor/`, with licenses. Bump the cache version in `sw.js` whenever app-shell assets change. Do not cache spreadsheet JSONP, geocoding responses or tiles in the service worker.
- Run `node --test tests/*.test.cjs`. With Playwright/Chromium available, serve `/workspace` on port 8001 and run `node tests/browser.cjs` from the checkout. The browser tests use fixture data and verify place search, geolocation, layout, manifest and offline reload; distinguish them from live-service checks.

## Filters and visual layout
- Filter options derive from spreadsheet/cache values. Preserve price currency symbols in comparisons; cuisine filters match slash-separated components. City changes update neighbourhood options. Preserve valid selections on refresh.
- Restaurant cards include unmapped records and saved links. Do not hide or discard those entries because they cannot be placed on the map.
- The sidebar is separate from the map on desktop, with expandable filters on mobile. Keep keyboard focus visible, reduced-motion support and map resize observation when changing layout.
- PR jobs have read-only permissions; only main-branch deployment gets Pages/OIDC write permissions. Include external script syntax checks and regression tests in validation.
