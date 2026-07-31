/* 目視検査と、アカウントまわりの動作確認。
     node test/shots.js
   出力は dist/shots/

   file:// では localStorage が拒否されるので、簡易サーバを立てて http で見る。 */
'use strict';

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'shots');

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(fs.readFileSync(file));
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { srv, port } = await serve();
  const URL = `http://127.0.0.1:${port}/`;
  const browser = await chromium.launch({ executablePath: process.env.PB_CHROME || undefined });
  let bad = 0;
  const fail = m => { console.log('   ❌ ' + m); bad++; };

  /* ---------------------------------------------------- 見た目 3面 */
  for (const view of [
    { name: 'desktop-light', w: 1280, h: 1000, scheme: 'light' },
    { name: 'desktop-dark', w: 1280, h: 1000, scheme: 'dark' },
    { name: 'mobile-light', w: 390, h: 844, scheme: 'light' }
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: view.w, height: view.h },
      colorScheme: view.scheme, deviceScaleFactor: 2
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));

    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    // 畳んである「作りの話」を開いて、中身も撮る
    await page.evaluate(() => {
      document.querySelectorAll('.game__more').forEach(d => { d.open = true; });
      document.querySelectorAll('.scale').forEach(n => n.classList.add('is-read'));
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, view.name + '.png'), fullPage: true });

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const c = await page.evaluate(() => ({
      games: document.querySelectorAll('.game').length,
      play: document.querySelectorAll('.game .btn--go').length,
      chips: document.querySelectorAll('.chip__bar').length,
      bars: document.querySelectorAll('.srow__bar').length,
      steps: document.querySelectorAll('.step').length,
      tenets: document.querySelectorAll('.tenet').length,
      invite: document.querySelectorAll('.invite').length,
      rank: document.querySelectorAll('.rank').length
    }));
    const bar = await page.evaluate(() => {
      const b = document.querySelector('.srow__bar'), t = b.parentElement;
      return { w: b.getBoundingClientRect().width, t: t.getBoundingClientRect().width, v: +b.style.getPropertyValue('--v') };
    });
    const ratio = bar.w / bar.t;

    console.log(`── ${view.name}`);
    console.log(`   横あふれ ${overflow}px / ゲーム ${c.games} / 遊ぶ ${c.play} / 強さ ${c.chips} / 棒 ${c.bars} / 段階 ${c.steps} / 作り ${c.tenets}`);
    console.log(`   棒幅の比 ${ratio.toFixed(3)} (--v=${bar.v})`);
    if (errs.length) fail('コンソール: ' + errs.slice(0, 3).join(' | '));
    if (overflow > 1) fail('横スクロールが出ている');
    if (c.games !== 3 || c.chips !== 3 || c.steps !== 4 || c.tenets !== 4) fail('組めていない要素がある');
    if (c.invite !== 1 || c.rank !== 1) fail('未ログインの勧誘またはランキング枠が出ていない');
    if (Math.abs(ratio - bar.v) > 0.02) fail('棒の幅が値と合っていない');
    await ctx.close();
  }

  /* ------------------------------------------------------- アカウント */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto(URL, { waitUntil: 'load' });

    console.log('── アカウント');

    // 開く
    await page.click('[data-auth-open="signin"]');
    await page.waitForTimeout(200);
    if (!(await page.evaluate(() => document.getElementById('auth-modal').open))) fail('ログイン画面が開かない');

    // ログイン欄では「表示名」が出ていないこと（hidden がクラスに負けやすい）
    const vis = sel => page.evaluate(s => {
      const n = document.querySelector(s);
      return !!(n && n.getClientRects().length);
    }, sel);
    if (await vis('[data-only="signup"]')) fail('ログイン欄に新規登録用の項目が出ている');
    await page.screenshot({ path: path.join(OUT, 'auth-signin.png') });

    await page.click('.tab[data-tab="signup"]');
    await page.waitForTimeout(150);
    if (!(await vis('[data-only="signup"]'))) fail('新規登録欄に表示名が出ていない');
    await page.click('.tab[data-tab="signin"]');
    await page.waitForTimeout(150);

    // 短すぎるパスワードは弾かれるか
    await page.click('.tab[data-tab="signup"]');
    await page.fill('#f-handle', 'tester');
    await page.fill('#f-display', '試験 太郎');
    await page.fill('#f-pass', 'short');
    await page.click('#auth-submit');
    await page.waitForTimeout(300);
    let err = await page.textContent('#auth-err');
    console.log('   短いパスワード →', JSON.stringify(err));
    if (!err || !/8/.test(err)) fail('短いパスワードが素通りした');
    await page.screenshot({ path: path.join(OUT, 'auth-error.png') });

    // 不正なハンドル名
    await page.fill('#f-handle', 'AB');
    await page.fill('#f-pass', 'correct-horse');
    await page.click('#auth-submit');
    await page.waitForTimeout(300);
    err = await page.textContent('#auth-err');
    console.log('   短いハンドル名 →', JSON.stringify(err));
    if (!err) fail('不正なハンドル名が素通りした');

    // 登録できるか
    await page.fill('#f-handle', 'tester');
    await page.fill('#f-pass', 'correct-horse');
    await page.click('#auth-submit');
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => ({
      open: document.getElementById('auth-modal').open,
      who: document.querySelector('.who__n') ? document.querySelector('.who__n').textContent : null,
      panel: document.querySelectorAll('.me').length,
      stats: document.querySelectorAll('.stat').length,
      empty: !!document.querySelector('.me__empty')
    }));
    console.log('   登録後 →', JSON.stringify(after));
    if (after.open) fail('登録後にログイン画面が閉じていない');
    if (after.who !== '試験 太郎') fail('表示名がヘッダーに出ていない');
    if (after.panel !== 1 || after.stats !== 4) fail('マイページが出ていない');
    if (!after.empty) fail('記録が空である旨が出ていない');
    await page.screenshot({ path: path.join(OUT, 'account.png'), fullPage: true });

    // 同じ名前で二重登録できないこと
    await page.evaluate(() => PB.auth.signOut());
    await page.waitForTimeout(200);
    await page.click('[data-auth-open="signin"]');
    await page.click('.tab[data-tab="signup"]');
    await page.fill('#f-handle', 'tester');
    await page.fill('#f-pass', 'correct-horse');
    await page.click('#auth-submit');
    await page.waitForTimeout(500);
    err = await page.textContent('#auth-err');
    console.log('   二重登録 →', JSON.stringify(err));
    if (!err) fail('同じハンドル名で二重に登録できてしまった');

    // 間違ったパスワードで入れないこと
    await page.click('.tab[data-tab="signin"]');
    await page.fill('#f-handle', 'tester');
    await page.fill('#f-pass', 'wrong-password');
    await page.click('#auth-submit');
    await page.waitForTimeout(500);
    err = await page.textContent('#auth-err');
    console.log('   誤ったパスワード →', JSON.stringify(err));
    if (!err) fail('誤ったパスワードで入れてしまった');

    // 正しいパスワードで入れること
    await page.fill('#f-pass', 'correct-horse');
    await page.click('#auth-submit');
    await page.waitForTimeout(600);
    const back = await page.evaluate(() => document.querySelector('.who__n') && document.querySelector('.who__n').textContent);
    console.log('   再ログイン →', JSON.stringify(back));
    if (back !== '試験 太郎') fail('再ログインできない');

    // 再読み込みしても入ったままか
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    const kept = await page.evaluate(() => document.querySelector('.who__n') && document.querySelector('.who__n').textContent);
    console.log('   再読み込み後 →', JSON.stringify(kept));
    if (kept !== '試験 太郎') fail('再読み込みでログインが切れた');

    // ログアウト
    await page.evaluate(() => PB.auth.signOut());
    await page.waitForTimeout(300);
    const out = await page.evaluate(() => ({
      who: !!document.querySelector('.who__n'),
      invite: !!document.querySelector('.invite')
    }));
    console.log('   ログアウト後 →', JSON.stringify(out));
    if (out.who || !out.invite) fail('ログアウトが画面に反映されていない');

    if (errs.length) fail('例外: ' + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }

  /* ------------------------------------------------------------- 英語 */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.click('#lang');
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      document.querySelectorAll('.game__more').forEach(d => { d.open = true; });
      document.querySelectorAll('.scale').forEach(n => n.classList.add('is-read'));
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, 'desktop-en.png'), fullPage: true });
    const en = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      title: document.querySelector('.cover__title').textContent.trim(),
      first: document.querySelector('.game__title').textContent.trim(),
      play: document.querySelector('.game .btn--go').textContent.trim(),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    }));
    console.log('── 英語');
    console.log('  ', JSON.stringify(en));
    if (en.lang !== 'en' || en.first !== 'Big Shot' || !/Play/.test(en.play)) fail('英語に切り替わっていない');
    if (en.overflow > 1) fail('横スクロールが出ている');
    await ctx.close();
  }

  await browser.close();
  srv.close();
  console.log(bad ? `\n❌ ${bad} 件` : '\n✅ すべて通過');
  process.exit(bad ? 1 : 0);
})();
