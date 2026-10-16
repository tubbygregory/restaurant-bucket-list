const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.APP_URL || 'http://127.0.0.1:8001/restaurant-bucket-list/';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
      const context = await browser.newContext({ viewport, colorScheme: 'light' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route('https://tile.openstreetmap.org/**', r => r.abort());
      await page.route('https://docs.google.com/**', r => {
        const callback = new URL(r.request().url()).searchParams.get('tqx').split('responseHandler:')[1];
        return r.fulfill({ contentType: 'application/javascript', body: `${callback}(${JSON.stringify({ table: { cols: ['Name', 'City', 'Latitude', 'Longitude'].map(label => ({ label })), rows: [{ c: ['Test restaurant', 'London', 51.5, -.1].map(v => ({ v })) }] } })})` });
      });
      await page.goto(base);
      await page.waitForFunction(() => document.querySelector('#status').textContent.includes('live sheet loaded'));
      await page.locator('.bottom-nav [data-view="more"]').click();
      const theme = () => page.locator('html').getAttribute('data-theme');
      assert.equal(await theme(), 'light');
      for (const mode of ['light', 'dark', 'contrast']) {
        await page.selectOption('#colour-mode', mode);
        assert.equal(await theme(), mode);
        await page.emulateMedia({ colorScheme: 'dark', contrast: 'more' });
        assert.equal(await theme(), mode, 'Explicit choices override device settings');
        for (const view of ['more', 'find', 'filters', 'results', 'details', 'map']) {
          await page.evaluate(view => { if (view === 'details') openDetails(data[0]); else if (view === 'map') showRestaurantMap(data[0]); else showView(view); }, view);
          if (view === 'map') await page.waitForFunction(() => { const popup = document.querySelector('.leaflet-popup'); return popup && getComputedStyle(popup).opacity === '1'; });
          if (process.env.AXE_PATH) {
            await page.addScriptTag({ path: process.env.AXE_PATH });
            const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
            assert.deepEqual(violations, [], `${mode} ${view}`);
          }
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        }
        await page.locator('.bottom-nav [data-view="more"]').click();
        await page.reload();
        assert.equal(await theme(), mode, 'Choice survives reload');
      }
      await page.selectOption('#colour-mode', 'device');
      assert.equal(await theme(), 'contrast');
      await page.emulateMedia({ colorScheme: 'dark', contrast: 'no-preference' });
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
      await page.emulateMedia({ colorScheme: 'light' });
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
      await page.evaluate(async () => { await navigator.serviceWorker.ready; });
      await page.reload();
      await context.setOffline(true);
      await page.reload();
      assert.equal(await theme(), 'light');
      assert.equal(await page.locator('#colour-mode').inputValue(), 'device');
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`Colour modes, device changes, persistence, offline and accessibility passed at ${viewport.width}px`);
    }
    const context = await browser.newContext();
    await context.addInitScript(() => { Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new Error('denied'); }; });
    const page = await context.newPage();
    await page.goto(base);
    await page.locator('.bottom-nav [data-view="more"]').click();
    await page.selectOption('#colour-mode', 'dark');
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.match(await page.locator('#colour-mode-status').textContent(), /could not save/);
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
