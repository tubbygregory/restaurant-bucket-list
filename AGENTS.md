# Restaurant Bucket List

Buildless static Leaflet map. Production: https://tubbygregory.github.io/restaurant-bucket-list/ (HTTP 200 and map application source verified on 2026-10-16).

## Source and deployment
- `index.html` contains the application, styling and client-side data loader.
- `.github/workflows/pages.yml` validates inline JavaScript and deploys only `index.html` and `.nojekyll` to GitHub Pages after pushes to `main` or a manual workflow dispatch.
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
