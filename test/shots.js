/* 目視検査。ページを実際に開いて、崩れと取りこぼしを見る。
     node test/shots.js
   出力は dist/shots/ */
'use strict';

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const URL = 'file://' + path.join(__dirname, '..', 'index.html');
const OUT = path.join(__dirname, '..', 'dist', 'shots');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PB_CHROME || undefined });
  let bad = 0;

  for (const view of [
    { name: 'desktop-light', w: 1280, h: 1000, scheme: 'light' },
    { name: 'desktop-dark', w: 1280, h: 1000, scheme: 'dark' },
    { name: 'mobile-light', w: 390, h: 844, scheme: 'light' }
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: view.w, height: view.h },
      colorScheme: view.scheme,
      deviceScaleFactor: 2
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));

    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    // 棒を全部伸ばしきってから撮る
    await page.evaluate(() => document.querySelectorAll('.scale').forEach(n => n.classList.add('is-read')));
    await page.waitForTimeout(900);

    await page.screenshot({ path: path.join(OUT, view.name + '.png'), fullPage: true });

    /* 横スクロールが出ていないか */
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    /* 中身が組めているか */
    const counts = await page.evaluate(() => ({
      works: document.querySelectorAll('.work').length,
      bars: document.querySelectorAll('.srow__bar').length,
      steps: document.querySelectorAll('.step').length,
      tenets: document.querySelectorAll('.tenet').length,
      wire: document.querySelectorAll('.wire svg').length
    }));
    /* 棒の実幅が値と合っているか（先頭の作品の1行目） */
    const bar = await page.evaluate(() => {
      const b = document.querySelector('.srow__bar');
      const t = b.parentElement;
      return { bar: b.getBoundingClientRect().width, track: t.getBoundingClientRect().width, v: b.style.getPropertyValue('--v') };
    });
    const ratio = bar.bar / bar.track;

    console.log(`── ${view.name}`);
    console.log(`   横あふれ ${overflow}px / 作品 ${counts.works} / 棒 ${counts.bars} / 段階 ${counts.steps} / 作法 ${counts.tenets} / 構成図 ${counts.wire}`);
    console.log(`   棒幅の比 ${ratio.toFixed(3)} (--v=${bar.v})`);
    if (errs.length) { console.log('   ❌ コンソール:', errs.slice(0, 3)); bad++; }
    if (overflow > 1) { console.log('   ❌ 横スクロールが出ている'); bad++; }
    if (counts.works !== 3 || counts.steps !== 4 || counts.tenets !== 4 || counts.wire !== 1) {
      console.log('   ❌ 組めていない要素がある'); bad++;
    }
    if (Math.abs(ratio - parseFloat(bar.v)) > 0.02) { console.log('   ❌ 棒の幅が値と合っていない'); bad++; }

    await ctx.close();
  }

  /* 英語に切り替えても崩れないか */
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.click('#lang');
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelectorAll('.scale').forEach(n => n.classList.add('is-read')));
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, 'desktop-en.png'), fullPage: true });
  const en = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    title: document.querySelector('.cover__title').textContent.trim(),
    firstWork: document.querySelector('.work__title').textContent.trim(),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
  console.log('── english');
  console.log('  ', JSON.stringify(en));
  if (en.lang !== 'en' || !/Measure/.test(en.title)) { console.log('   ❌ 英語に切り替わっていない'); bad++; }
  if (en.overflow > 1) { console.log('   ❌ 横スクロールが出ている'); bad++; }
  await ctx.close();

  await browser.close();
  console.log(bad ? `\n❌ ${bad} 件` : '\n✅ すべて通過');
  process.exit(bad ? 1 : 0);
})();
