# Restaurant Bucket List

Buildless static Leaflet map. The user has requested migration away from Netlify to GitHub Pages.

## Source and deployment
- `index.html` contains the application, styling and client-side data loader.
- `.github/workflows/pages.yml` validates inline JavaScript and deploys only `index.html` and `.nojekyll` to GitHub Pages after pushes to `main` or a manual workflow dispatch.
- Repository Settings > Pages must have Source set to GitHub Actions. This has not yet been verified enabled.
- The repository was created private. Free accounts require a public repository for Pages; private repository Pages requires an eligible paid plan. Do not change visibility without user approval.
- Netlify is the legacy host. Do not reconnect it or treat it as the deployment target. Leave it available until GitHub Pages deployment is verified.
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
