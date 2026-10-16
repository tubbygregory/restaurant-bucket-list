# Restaurant Bucket List

Buildless Leaflet map hosted on GitHub Pages. Restaurant and branch data loads live from the Google Sheet’s `Map Data` tab, with a browser-local cached fallback.

## Development

Run `python3 -m http.server 8000` from this directory. No build or package installation is required. Run `node --test tests/app.test.cjs` (Node 24) for regression checks of the inline application script. These tests use map and DOM doubles; they do not verify external services or Leaflet rendering.

Browser checks require access to unpkg.com, docs.google.com and OpenStreetMap tile servers. Check live loading, search, priority filtering, refresh, popups and mobile layout. Missing or invalid coordinates remain in the data and are reported in the result count.

Pull requests run regression checks. Pushes to `main` run checks and deploy only `index.html` and `.nojekyll` using `.github/workflows/pages.yml`. The site supports the `/restaurant-bucket-list/` repository subpath. `netlify.toml` is legacy configuration; do not use Netlify for deployment.
