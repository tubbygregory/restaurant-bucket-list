# Application audit — 16 October 2026

Scope: spreadsheet parsing and cached fallback; text/cuisine/price/city/area/priority filters; nearby discovery; marker clusters, popups and URLs; desktop/mobile layout and accessibility; installed-app cache updates; and GitHub Pages artifact/subpath compatibility. No spreadsheet records, sharing settings or hosting providers were changed.

## Fixed

- Added composable filters derived from real sheet values. Kept currency symbols significant, matched slash-separated cuisine components, linked city/area options, preserved valid selections on refresh and added clear/empty states.
- Added browsable restaurant cards with venue links, including records without coordinates. Displayed the result count and the 30-card limit explicitly; nearby results use distance order with unmapped entries last.
- Replaced the overlapping desktop panel with a separate sidebar; refined spacing, typography, colour, focus indicators, touch controls and clusters. Mobile filters expand on demand. Added reduced-motion handling, an attributed-link underline and map resize observation.
- Preserved non-Latin text in search. Rejected credential-bearing external URLs and used a prototype-free object for parsed spreadsheet columns. Spreadsheet HTML remains escaped and URLs remain limited to HTTP(S).
- Kept loading feedback during filtering/refresh. Added an explicit installed-app update action and first-install guard. Bumped the app cache to v2.
- Updated tiles to the provider’s canonical `https://tile.openstreetmap.org/{z}/{x}/{y}.png` endpoint and made the browser referrer policy explicit. Browser caching remains intact; no offline/prefetch tile cache was added.
- Scoped Pages/OIDC write permissions to deployment, restricted deployment to main and added syntax checks for external scripts to PR validation.

## Evidence

- Live Google Visualization response: 1,155 records; 1,096 with valid coordinates and 59 without them. Individual branch records remain intact. All stored Maps links use HTTP(S). 26 website values are not HTTP(S), so the app omits those website links rather than making them executable.
- Eleven Node regression tests cover data parsing, coordinates, popup safety, cached fallback, refresh races, international search, combined filters/empty categories and app-update behaviour.
- Chromium at 1280×800, 390×844 and 667×375 checks combined filters, dependent areas, place selection, simulated geolocation, popups, layout, manifest and actual offline reload. Axe-core 4.10.3 checks selected WCAG 2 A/AA and 2.1 A/AA rules with controls/cards expanded. These are automated checks, not accessibility certification.
- An actual browser upgrade from the previous v1 service worker to v2 verifies an explicit update prompt, activation/reload and old-cache cleanup without a first-install reload.
- Visual checks use both fixture data and the live spreadsheet response. The cloud browser does not trust the environment HTTPS proxy; live spreadsheet visual checks use TLS-verified curl responses bridged into the browser. Direct native browser live HTTPS is not claimed as verified. Generic curl requests returned blocked tile images; an identified audit client with the site referrer returned a normal tile from the previous subdomain endpoint, consistent with the [provider policy](https://operations.osmfoundation.org/policies/tiles/). The canonical tile host is still denied by the cloud proxy; its required domain was saved in the environment draft. Direct canonical-host rendering remains unverified here.
- PR checks and public deployment verification are recorded on the associated GitHub pull request and Pages workflow.

## Remaining limits and separate improvements

- The 59 unmapped records need coordinate corrections in the source spreadsheet before they can participate in distance checks or appear as markers. They remain browsable and counted; no locations were invented.
- Real iPhone/Android installation, VoiceOver/TalkBack and physical-device GPS accuracy still need device testing. Browser dimensions and simulated GPS do not establish those outcomes.
- Fresh spreadsheet data, public Nominatim place search and map tiles need a connection. Offline data depends on a prior online visit and retained browser storage. Public geocoding remains intended for this personal site, not bulk traffic.
- Multi-select filter chips, viewport-driven searching and pagination beyond the first 30 cards are potential follow-up improvements. Current text and category filters can narrow the complete record set.
