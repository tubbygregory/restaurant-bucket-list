// Run after starting `python3 -m http.server 8001 --bind 127.0.0.1` in /workspace.
// Requires Playwright and Chromium. Tests use fixture spreadsheet/place responses; no live services.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.APP_URL || 'http://127.0.0.1:8001/restaurant-bucket-list/';
const table = {
  cols: ['Name', 'City', 'Priority', 'Latitude', 'Longitude', 'Google Maps'].map(label => ({ label })),
  rows: [
    ['Near venue', 'London', 'High', 51.5, -0.1, 'https://maps.google.com/?q=near'],
    ['Far venue', 'York', 'Low', 53.96, -1.08, 'https://maps.google.com/?q=far'],
    ['Unmapped venue', 'London', 'High', '', '', 'https://maps.google.com/?q=unmapped']
  ].map(values => ({ c: values.map(v => ({ v })) }))
};
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 667, height: 375 }]) {
      const context = await browser.newContext({ viewport, permissions: ['geolocation'], geolocation: { latitude: 51.5, longitude: -0.1 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      let offline = false;
      await page.route('https://*.tile.openstreetmap.org/**', route => route.abort());
      await page.route('https://docs.google.com/**', route => {
        if (offline) return route.abort();
        const callback = new URL(route.request().url()).searchParams.get('tqx').split('responseHandler:')[1];
        return route.fulfill({ contentType: 'application/javascript', body: `${callback}(${JSON.stringify({ table })})` });
      });
      await page.route('https://nominatim.openstreetmap.org/**', route => {
        assert.equal(new URL(route.request().url()).searchParams.get('q'), 'London');
        return route.fulfill({ json: [{ display_name: 'London, England', lat: '51.5', lon: '-0.1' }] });
      });
      await page.goto(base);
      await page.waitForFunction(() => document.querySelector('#status').textContent.includes('live sheet loaded'));
      const cdp = await context.newCDPSession(page);
      const manifest = await cdp.send('Page.getAppManifest');
      assert.equal(manifest.errors.length, 0);
      assert.equal(JSON.parse(manifest.data).display, 'standalone');
      await page.locator('#location-controls').evaluate(node => node.open = true);
      await page.locator('#place').fill('London');
      await page.locator('#find-place').click();
      await page.getByRole('button', { name: 'London, England', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#location-status').textContent.includes('Near London'));
      assert.equal(await page.locator('#nearby-list li').count(), 1);
      assert.match(await page.locator('#status').innerText(), /1 marker shown/);
      await page.locator('#nearby-results').evaluate(node => node.open = true);
      await page.getByRole('button', { name: 'Near venue · 0.0 miles' }).click();
      assert.equal(await page.locator('.leaflet-popup-content a').getAttribute('href'), 'https://maps.google.com/?q=near');
      await page.locator('#clear-location').click();
      assert.match(await page.locator('#status').innerText(), /2 markers shown/);
      await page.locator('#near-me').click();
      await page.waitForFunction(() => document.querySelector('#location-status').textContent.includes('Near your location'));
      assert.equal(await page.locator('#nearby-list li').count(), 1);
      await page.locator('#search').fill('absent');
      assert.match(await page.locator('#nearby-list').innerText(), /No mapped restaurants/);
      await page.locator('#search').fill('');
      const layout = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, map: document.querySelector('#map').getBoundingClientRect().toJSON(), panel: document.querySelector('.panel').getBoundingClientRect().toJSON() }));
      assert.ok(layout.width <= viewport.width);
      assert.ok(layout.map.height >= viewport.height * .4);
      if (viewport.width <= 600) assert.ok(layout.map.top >= layout.panel.bottom);
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.reload();
      await page.waitForFunction(() => navigator.serviceWorker.controller);
      await page.waitForFunction(() => document.querySelector('#status').textContent.includes('live sheet loaded'));
      offline = true;
      await context.setOffline(true);
      await page.reload();
      await page.waitForFunction(() => document.querySelector('#status').textContent.includes('cached'));
      assert.match(await page.locator('#status').innerText(), /2\/3 rows mapped/);
      assert.deepEqual(errors, []);
      console.log(`PASS ${viewport.width}×${viewport.height}: place search, near me, popup, layout, manifest, offline reload`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
