// Performance audit for the player: opens each page in Chrome (cache off) WITHOUT clicking anything and reports
// requests, our JS files, media requests/reloads, third-party calls, CLS and FCP/LCP.
//   npm run perf        -> request counts (no throttling)
//   npm run perf:slow   -> timings on a throttled mobile-like connection (slow 4G, 4x CPU)
// Options: BASE=http://site.local  PAGES=slug1,slug2   (defaults: this local site's perf-* test pages)
// Run it before and after a change on a production build (npm run build), not on the dev build from npm start.
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', '..', 'node_modules', 'playwright-core'));
const BASE = process.env.BASE || 'http://free-plugins-dev.local';
const PAGES = (process.env.PAGES || 'perf-parent,perf-youtube,perf-vimeo,perf-audio,perf-playlist,perf-five-videos,perf-shortcode,perf-captions,perf-no-video').split(',');
const THROTTLE = process.argv[2] === 'throttle';
const KB = (b) => Math.round(b / 1024);
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const rows = [];
  for (const p of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    if (THROTTLE) {
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }
    const req = new Map();
    const errors = [];
    cdp.on('Network.requestWillBeSent', (e) => req.set(e.requestId, { url: e.request.url, type: e.type, bytes: 0, state: 'pending', post: e.request.postData || '' }));
    cdp.on('Network.dataReceived', (e) => { const r = req.get(e.requestId); if (r) r.bytes += e.encodedDataLength || 0; });
    cdp.on('Network.loadingFinished', (e) => { const r = req.get(e.requestId); if (r) { r.state = 'ok'; if (e.encodedDataLength) r.bytes = Math.max(r.bytes, e.encodedDataLength); } });
    cdp.on('Network.loadingFailed', (e) => { const r = req.get(e.requestId); if (r) r.state = 'canceled'; });
    page.on('pageerror', (e) => errors.push(e.message.slice(0, 90)));
    await page.addInitScript(() => {
      window.__loads = 0; window.__cls = 0; window.__lcp = 0; window.__long = 0; window.__plyr = 0;
      const o = HTMLMediaElement.prototype.load;
      HTMLMediaElement.prototype.load = function () { window.__loads++; return o.apply(this, arguments); };
      let P;
      Object.defineProperty(window, 'Plyr', { configurable: true, get() { return P; }, set(v) { P = new Proxy(v, { construct(t, a, n) { window.__plyr++; return Reflect.construct(t, a, n); } }); } });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long += Math.max(0, e.duration - 50); }).observe({ type: 'longtask', buffered: true });
    });
    await page.goto(BASE + '/' + p + '/', { waitUntil: 'load', timeout: 120000 });
    await page.waitForTimeout(THROTTLE ? 8000 : 5000);
    const m = await page.evaluate(() => {
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      return { fcp: fcp ? Math.round(fcp.startTime) : null, lcp: Math.round(window.__lcp), cls: +window.__cls.toFixed(3), tbt: Math.round(window.__long), mediaLoads: window.__loads, plyrCreated: window.__plyr, plyrOnPage: document.querySelectorAll('.plyr').length, headScripts: document.head.querySelectorAll('script[src]').length };
    });
    const all = [...req.values()].filter((r) => !r.url.startsWith('data:') && !r.url.startsWith('blob:'));
    const host = (u) => { try { return new URL(u).host; } catch { return ''; } };
    const site = host(BASE);
    const ours = all.filter((r) => r.url.includes('/plugins/html5-video-player/'));
    const ourJs = ours.filter((r) => r.type === 'Script');
    const ourCss = ours.filter((r) => r.type === 'Stylesheet');
    const coreDeps = all.filter((r) => /\/wp-includes\/js\/.*(react(-dom)?|jquery(-migrate)?|underscore|wp-util|i18n|hooks)\.min\.js/.test(r.url));
    const media = all.filter((r) => r.type === 'Media');
    const ajax = all.filter((r) => r.url.includes('admin-ajax.php') || r.url.includes('/wp-json/h5vp'));
    const ajaxNames = ajax.map((r) => (r.post.match(/action=([^&]+)/) || [, r.url.split('/wp-json/')[1] || '?'])[1]);
    const third = [...new Set(all.map((r) => host(r.url)).filter((h) => h && h !== site))];
    rows.push({
      page: p,
      requests: `${all.length} (${KB(all.reduce((a, r) => a + r.bytes, 0))}KB)`,
      ourJs: `${ourJs.length} files / ${KB(ourJs.reduce((a, r) => a + r.bytes, 0))}KB  [${ourJs.map((r) => r.url.split('/').pop().split('?')[0]).join(', ')}]`,
      ourCss: ourCss.length,
      coreJsForUs: `${coreDeps.length} [${coreDeps.map((r) => r.url.split('/').pop().split('?')[0].replace('.min.js', '')).join(',')}]`,
      media: `${media.length} req / ${KB(media.reduce((a, r) => a + r.bytes, 0))}KB (${media.filter((r) => r.state === 'canceled').length} canceled)`,
      ajax: `${ajax.length} [${ajaxNames.join(', ')}]`,
      thirdParty: `${all.filter((r) => host(r.url) !== site).length} req from ${third.length} domains ${third.join(' ')}`.slice(0, 170),
      ...m,
      errors: errors.slice(0, 2).join(' | '),
    });
    await ctx.close();
  }
  await browser.close();
  for (const r of rows) {
    console.log('\n### ' + r.page);
    for (const [k, v] of Object.entries(r)) if (k !== 'page') console.log('  ' + k.padEnd(12) + ' ' + v);
  }
})().catch((e) => { console.error(e); process.exit(1); });
