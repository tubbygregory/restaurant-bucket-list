// Run after starting `python3 -m http.server 8001 --bind 127.0.0.1` in /workspace.
// Requires Playwright and Chromium. Tests use fixture spreadsheet/place responses; no live services.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.APP_URL || 'http://127.0.0.1:8001/restaurant-bucket-list/';
const table = {
  cols: ['Name', 'City', 'Priority', 'Latitude', 'Longitude', 'Google Maps', 'Cuisine', 'Price Range', 'Area'].map(label => ({ label })),
  rows: [
    ['Near venue', 'London', 'High', 51.5, -0.1, 'https://maps.google.com/?q=near', 'Japanese / Ramen', '££', 'Soho'],
    ['Far venue', 'York', 'Low', 53.96, -1.08, 'https://maps.google.com/?q=far', 'Italian', '£££', 'Centre'],
    ['Unmapped venue', 'London', 'High', '', '', 'https://maps.google.com/?q=unmapped', 'Japanese', '££', 'Soho']
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
      await page.route('https://tile.openstreetmap.org/**', route => route.abort());
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
      assert.equal(await page.locator('#workspace').isVisible(), false);
      const checkMap = async () => {
        const box = await page.locator('#map').boundingBox();
        assert.ok(box.height > viewport.height * .65, `Map must use most of the screen: ${box.height}`);
        assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= viewport.width);
      };
      const auditView = async () => {
        if (!process.env.AXE_PATH) return;
        await page.addScriptTag({ path: process.env.AXE_PATH });
        const audit = await page.evaluate(async () => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
        assert.deepEqual(audit.violations.map(({ id, nodes }) => ({ id, count: nodes.length })), []);
      };
      await checkMap();
      await auditView();
      await page.screenshot({ path: `/tmp/restaurant-audit/navigation-map-${viewport.width}.png` });
      await page.locator('.header-find').click();
      assert.equal(await page.locator('#map').isVisible(), false);
      await page.locator('#place').fill('London');
      await page.locator('#find-place').click();
      await page.getByRole('button', { name: 'London, England', exact: true }).click();
      await page.locator('#near-me').click();
      await page.waitForFunction(() => document.querySelector('#location-status').textContent.includes('Near your location'));
      await auditView();
      await page.screenshot({ path: `/tmp/restaurant-audit/navigation-find-${viewport.width}.png` });
      await page.getByRole('button', { name: 'Next: choose filters →' }).click();
      await page.locator('#cuisine').selectOption({ label: 'Japanese' });
      await page.locator('#price').selectOption({ label: '££' });
      await page.locator('#city').selectOption({ label: 'London' });
      await page.locator('#area').selectOption({ label: 'Soho' });
      await auditView();
      await page.screenshot({ path: `/tmp/restaurant-audit/navigation-filters-${viewport.width}.png` });
      await page.getByRole('button', { name: 'Show restaurants →' }).click();
      assert.equal(await page.locator('#nearby-list li').count(), 2);
      await page.locator('#view-back').click();
      assert.equal(await page.locator('#price').inputValue(), JSON.stringify('££'));
      await page.goBack();
      assert.equal(await page.locator('#view-results').isVisible(), true);
      await auditView();
      await page.getByRole('button', { name: 'Near venue · 0.0 miles' }).click();
      assert.equal(await page.locator('#workspace').isVisible(), false);
      await checkMap();
      assert.equal(await page.locator('.leaflet-popup-content a').getAttribute('href'), 'https://maps.google.com/?q=near');
      await page.locator('.bottom-nav [data-view="find"]').click();
      await page.locator('#clear-location').click();
      await page.getByRole('button', { name: 'Next: choose filters →' }).click();
      await page.locator('#city').selectOption({ label: 'York' });
      assert.equal(await page.locator('#area').inputValue(), '');
      await page.getByRole('button', { name: 'Show restaurants →' }).click();
      assert.equal(await page.locator('#empty-state').isVisible(), true);
      await page.getByRole('button', { name: 'Edit filters' }).click();
      await page.locator('#reset-filters').click();
      await page.getByRole('button', { name: 'Show restaurants →' }).click();
      assert.equal(await page.locator('#nearby-list li').count(), 3);
      await page.locator('.bottom-nav [data-view="more"]').click();
      await page.getByText('Install this app', { exact: true }).click();
      assert.equal(await page.locator('#install-help').isVisible(), true);
      await auditView();
      await page.locator('.bottom-nav [data-view="map"]').click();
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
      console.log(`PASS ${viewport.width}×${viewport.height}: step navigation, retained filters, browser Back, nearby, map space, accessibility, offline reload`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
