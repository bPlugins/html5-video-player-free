// Functional regression checks for the performance changes. Usage: BASE=http://site.local node functest.cjs
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', '..', 'node_modules', 'playwright-core'));
const BASE = process.env.BASE || 'http://free-plugins-dev.local';
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
  const newPage = async () => {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    page.__errors = [];
    page.on('pageerror', (e) => page.__errors.push(e.message.slice(0, 120)));
    return page;
  };

  // 1. Captions: block subtitle + shortcode caption
  {
    const page = await newPage();
    await page.goto(`${BASE}/perf-captions/`, { waitUntil: 'load' });
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(2500);
    const info = await page.evaluate(() => [...document.querySelectorAll('video')].map((v) => ({
      tracks: v.querySelectorAll('track').length,
      textTracks: v.textTracks.length,
      captionsButton: !!v.closest('.plyr')?.querySelector('[data-plyr="captions"]'),
    })));
    check('captions: both players mounted', info.length === 2, JSON.stringify(info));
    check('captions: each <video> has exactly 1 track (no duplicates)', info.every((i) => i.tracks === 1 && i.textTracks === 1), JSON.stringify(info));
    check('captions: Plyr shows a captions button', info.every((i) => i.captionsButton), JSON.stringify(info));
    // play the first and see the caption text rendered by Plyr
    await page.mouse.wheel(0, -3000);
    await page.waitForTimeout(500);
    await page.locator('.plyr__control--overlaid').first().click();
    await page.waitForTimeout(2500);
    const capText = await page.evaluate(() => document.querySelector('.plyr__captions')?.textContent || '');
    check('captions: caption text displayed while playing', capText.includes('H5VP caption test line'), JSON.stringify(capText));
    check('captions: no JS errors', page.__errors.length === 0, page.__errors.join(' | '));
    await page.context().close();
  }

  // 2. Lazy mount: five videos, scroll to the end
  {
    const page = await newPage();
    await page.goto(`${BASE}/perf-five-videos/`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const before = await page.evaluate(() => document.querySelectorAll('.plyr').length);
    for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 600); await page.waitForTimeout(250); }
    await page.waitForTimeout(1500);
    const after = await page.evaluate(() => document.querySelectorAll('.plyr').length);
    check('lazy: only on-screen players mount on load', before === 1, `before scroll: ${before}`);
    check('lazy: all players mount after scrolling', after === 5, `after scroll: ${after}`);
    await page.locator('.plyr__control--overlaid').last().click();
    await page.waitForTimeout(2500);
    const lastPlaying = await page.evaluate(() => { const v = [...document.querySelectorAll('video')].pop(); return v && !v.paused && v.currentTime > 0.5; });
    check('lazy: last player plays after scroll', lastPlaying);
    check('lazy: no JS errors', page.__errors.length === 0, page.__errors.join(' | '));
    await page.context().close();
  }

  // 3. Keyboard: focus the YouTube placeholder and press Enter
  {
    const page = await newPage();
    await page.goto(`${BASE}/perf-youtube/`, { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await page.locator('.h5vp-placeholder').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);
    const playing = await page.evaluate(() => !!document.querySelector('.plyr--youtube.plyr--playing'));
    check('keyboard: Enter on YouTube placeholder starts playback', playing);
    await page.context().close();
  }

  // 4. Playlist: durations appear, switching items works
  {
    const page = await newPage();
    await page.goto(`${BASE}/perf-playlist/`, { waitUntil: 'load' });
    // Durations of off-screen items are only probed once they scroll into view.
    await page.locator('.h5vp_playlist_item').last().scrollIntoViewIfNeeded();
    await page.waitForTimeout(4000);
    const durations = await page.evaluate(() => [...document.querySelectorAll('.h5vp_playlist_badge--duration')].map((e) => e.textContent));
    check('playlist: duration badges filled in (after scrolling the list into view)', durations.length === 3, JSON.stringify(durations));
    const firstSrc = await page.evaluate(() => document.querySelector('.h5vp_playlist video')?.currentSrc || '');
    await page.locator('.h5vp_playlist_item').nth(1).click();
    await page.waitForTimeout(3000);
    const state = await page.evaluate(() => { const v = document.querySelector('.h5vp_playlist video'); return { src: v?.currentSrc || '', playing: v ? !v.paused : false, active: document.querySelector('.h5vp_playlist_item.active')?.getAttribute('data-index') }; });
    check('playlist: clicking item 2 switches source and plays', state.src && state.src !== firstSrc && state.playing && state.active === '1', JSON.stringify({ firstSrc: firstSrc.split('/').pop(), ...state, src: state.src.split('/').pop() }));
    check('playlist: no JS errors', page.__errors.length === 0, page.__errors.join(' | '));
    await page.context().close();
  }

  // 5. Old cached HTML (no placeholder) still mounts
  {
    const page = await newPage();
    // Simulate HTML cached before this version: strip each placeholder as the parser inserts it.
    await page.addInitScript(() => {
      new MutationObserver((records) => records.forEach((r) => r.addedNodes.forEach((n) => {
        if (n.nodeType === 1 && n.classList.contains('h5vp-placeholder')) n.remove();
      }))).observe(document, { childList: true, subtree: true });
    });
    await page.goto(`${BASE}/perf-parent/`, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const mounted = await page.evaluate(() => ({ plyr: document.querySelectorAll('.plyr').length, placeholders: document.querySelectorAll('.h5vp-placeholder').length }));
    check('old cached markup (no placeholder) still mounts the player', mounted.plyr === 1 && mounted.placeholders === 0, JSON.stringify(mounted));
    await page.context().close();
  }

  // 6. Audio: CPU while playing
  {
    const page = await newPage();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    await page.goto(`${BASE}/perf-audio/`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const a = document.querySelector('audio'); a.muted = true; return a.play(); });
    await page.waitForTimeout(500);
    const get = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
    const a = await get(); await page.waitForTimeout(5000); const z = await get();
    const progress = await page.evaluate(() => document.querySelector('.h5vp-progress-played')?.style.width || 'n/a');
    check('audio: layouts during 5s playback', true, `layouts=${z.LayoutCount - a.LayoutCount}, scriptMs=${Math.round((z.ScriptDuration - a.ScriptDuration) * 1000)}, bar width=${progress}`);
    await page.context().close();
  }

  await browser.close();
  for (const r of results) console.log((r.ok ? 'PASS' : 'FAIL').padEnd(5), r.name, r.detail ? '  ' + r.detail : '');
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`);
})().catch((e) => { console.error(e); process.exit(1); });
