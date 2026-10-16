# Restaurant Bucket List

This is a buildless static Leaflet map. Production: https://gregrestaurantbucketlist.netlify.app/.

## Source and deployment
- `index.html` contains the application, styling and client-side data loader.
- `netlify.toml` publishes the repository root. No dependency installation or build is required.
- Preserve the existing Netlify site and URL. Production deploys should use `main` once connected.
- Do not commit secrets or credentials.

## Restaurant data
- Google Drive file ID: `18W5-PKVhFFDG4yvtG6pMZOXP_86XxnHjc4GsgIRrg3A`.
- The map reads the `Map Data` tab live using Google Visualization JSONP, with browser-local cached fallback.
- Preserve the spreadsheet connection, branch-level restaurant records, coordinates and Google Maps links.
- Update data via the connected Google Drive tools; code changes belong in this repository.

## Validation
- Check inline JavaScript syntax after code changes.
- Verify live data loading, search, priority filters, refresh and marker popup links when browser access is available.
- Check mobile layout for changes affecting controls or map coverage.
