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

/* Supabase の受け答えを真似る。SupabaseProvider が投げる要求の形と、
   返ってきた誤りの扱いを、本物につながなくても確かめられるようにする。 */
function mockSupabase(req, res, body) {
  const url = new URL(req.url, 'http://x');
  const json = (code, o) => {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(o === undefined ? '' : JSON.stringify(o));
  };
  const store = mockSupabase.store || (mockSupabase.store = { users: {}, profiles: {} });
  const session = uid => ({
    access_token: 'tok_' + uid, refresh_token: 'ref_' + uid,
    expires_in: 3600, token_type: 'bearer', user: { id: uid }
  });

  if (url.pathname === '/auth/v1/signup') {
    const b = JSON.parse(body);
    if (store.users[b.email]) return json(400, { msg: 'User already registered' });
    const uid = 'uid-' + Object.keys(store.users).length;
    store.users[b.email] = { id: uid, password: b.password };
    const d = b.data || {};
    store.profiles[uid] = {
      id: uid, handle: d.handle, display: d.display || d.handle,
      played: 0, won: 0, by_game: {}, created_at: new Date().toISOString()
    };
    return json(200, session(uid));
  }

  if (url.pathname === '/auth/v1/token') {
    const b = JSON.parse(body);
    if (url.searchParams.get('grant_type') === 'refresh_token') {
      const uid = String(b.refresh_token).replace('ref_', '');
      return json(200, session(uid));
    }
    const u = store.users[b.email];
    if (!u || u.password !== b.password) return json(400, { error_description: 'Invalid login credentials' });
    return json(200, session(u.id));
  }

  if (url.pathname === '/auth/v1/logout') return json(204);

  if (url.pathname === '/rest/v1/profiles') {
    const eq = k => {
      const v = url.searchParams.get(k);
      return v ? v.replace(/^eq\./, '') : null;
    };
    if (req.method === 'GET') {
      const id = eq('id'), handle = eq('handle');
      const rows = Object.values(store.profiles).filter(p =>
        (id ? p.id === id : true) && (handle ? p.handle === handle : true));
      return json(200, rows);
    }
    if (req.method === 'PATCH') {
      const id = eq('id'), b = JSON.parse(body);
      if (!store.profiles[id]) return json(404, { message: 'not found' });
      Object.assign(store.profiles[id], b);
      return json(200, [store.profiles[id]]);
    }
  }
  return json(404, { message: 'no such endpoint' });
}

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);

      if (p.startsWith('/auth/v1/') || p.startsWith('/rest/v1/')) {
        let body = '';
        req.on('data', c => { body += c; });
        req.on('end', () => mockSupabase(req, res, body));
        return;
      }

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
    /* 期待値は目録から取る。作品を増やしてもこの検査は直さなくてよい */
    const c = await page.evaluate(() => ({
      games: document.querySelectorAll('.game').length,
      play: document.querySelectorAll('.game .btn--go').length,
      chips: document.querySelectorAll('.chip__bar').length,
      bars: document.querySelectorAll('.srow__bar').length,
      steps: document.querySelectorAll('.step').length,
      tenets: document.querySelectorAll('.tenet').length,
      invite: document.querySelectorAll('.invite').length,
      rank: document.querySelectorAll('.rank').length,
      bgg: document.querySelectorAll('.bgg').length,
      err: document.querySelectorAll('.srow__err').length,
      wantGames: window.PB.WORKS.length,
      wantBars: window.PB.WORKS.reduce((n, w) => n + w.plate.rows.length, 0),
      wantSteps: window.PB.ROADMAP.length,
      wantTenets: window.PB.PRINCIPLES.length
    }));
    const bar = await page.evaluate(() => {
      const b = document.querySelector('.srow__bar'), t = b.parentElement;
      return { w: b.getBoundingClientRect().width, t: t.getBoundingClientRect().width, v: +b.style.getPropertyValue('--v') };
    });
    const ratio = bar.w / bar.t;

    console.log(`── ${view.name}`);
    console.log(`   横あふれ ${overflow}px / ゲーム ${c.games} / 遊ぶ ${c.play} / 強さ ${c.chips} / 棒 ${c.bars} / BGG ${c.bgg} / ひげ ${c.err} / 段階 ${c.steps} / 作り ${c.tenets}`);
    console.log(`   棒幅の比 ${ratio.toFixed(3)} (--v=${bar.v})`);
    if (errs.length) fail('コンソール: ' + errs.slice(0, 3).join(' | '));
    if (overflow > 1) fail('横スクロールが出ている');
    if (c.games !== c.wantGames || c.chips !== c.wantGames || c.play !== c.wantGames
      || c.bars !== c.wantBars || c.steps !== c.wantSteps || c.tenets !== c.wantTenets) {
      fail(`組めていない要素がある（ゲーム ${c.games}/${c.wantGames}・遊ぶ ${c.play}/${c.wantGames}`
        + `・強さ ${c.chips}/${c.wantGames}・棒 ${c.bars}/${c.wantBars}`
        + `・段階 ${c.steps}/${c.wantSteps}・作り ${c.tenets}/${c.wantTenets}）`);
    }
    // data/bgg.js が空のあいだは 0、CI が取ってきたら 4。中途半端はおかしい
    if (c.bgg !== 0 && c.bgg !== 4) fail('BGG の行が一部の作品にしか出ていない');
    if (c.err !== 5) fail('信頼区間のひげが出ていない（インペリアルの5行）');
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
    if (await vis('[data-field="display"]')) fail('ログイン欄に新規登録用の項目が出ている');
    await page.screenshot({ path: path.join(OUT, 'auth-signin.png') });

    await page.click('.tab[data-tab="signup"]');
    await page.waitForTimeout(150);
    if (!(await vis('[data-field="display"]'))) fail('新規登録欄に表示名が出ていない');
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

  /* --------------------------------------------- Supabase（模擬サーバ） */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    // 実際の鍵は要らない。宛先だけ模擬サーバに向ける
    await page.addInitScript(u => {
      window.PB = { CONFIG: { supabase: { url: u, anonKey: 'anon-test-key' } } };
    }, URL.replace(/\/$/, ''));
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(300);

    console.log('── Supabase（模擬）');
    const kind = await page.evaluate(() => PB.auth.kind);
    console.log('   プロバイダ →', kind);
    if (kind !== 'supabase') fail('Supabase プロバイダに切り替わっていない');

    // ログイン欄はメール＋パスワードだけ（ハンドル名は出ない）
    await page.click('[data-auth-open="signin"]');
    await page.waitForTimeout(200);
    const shown = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-field]'))
        .filter(n => n.getClientRects().length).map(n => n.dataset.field));
    console.log('   ログイン欄 →', JSON.stringify(shown));
    if (shown.join() !== 'email,pass') fail('ログイン欄がメール＋パスワードになっていない');

    // 新規登録
    await page.click('.tab[data-tab="signup"]');
    await page.waitForTimeout(150);
    const shown2 = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-field]'))
        .filter(n => n.getClientRects().length).map(n => n.dataset.field));
    console.log('   新規登録欄 →', JSON.stringify(shown2));
    if (shown2.join() !== 'email,handle,display,pass') fail('新規登録欄が揃っていない');

    await page.fill('#f-email', 'me@example.com');
    await page.fill('#f-handle', 'shun');
    await page.fill('#f-display', 'しゅん');
    await page.fill('#f-pass', 'correct-horse');
    await page.click('#auth-submit');
    await page.waitForTimeout(700);
    let who = await page.evaluate(() => document.querySelector('.who__n') && document.querySelector('.who__n').textContent);
    const where = await page.evaluate(() => document.querySelector('.me__where') && document.querySelector('.me__where').textContent);
    console.log('   登録後 →', JSON.stringify(who), JSON.stringify(where));
    if (who !== 'しゅん') fail('Supabase 経由で登録できていない');
    if (where !== 'Supabase') fail('接続先の表示が Supabase になっていない');
    await page.screenshot({ path: path.join(OUT, 'account-supabase.png'), fullPage: true });

    // 表示名の変更が PATCH で通るか
    await page.fill('#me-display', 'シュン改');
    await page.click('.me__form button[type="submit"]');
    await page.waitForTimeout(600);
    who = await page.evaluate(() => document.querySelector('.who__n') && document.querySelector('.who__n').textContent);
    console.log('   表示名の変更 →', JSON.stringify(who));
    if (who !== 'シュン改') fail('表示名の変更がサーバーに反映されていない');

    // 退会はできない旨が出るか
    page.on('dialog', d => d.accept());
    await page.click('.btn--danger');
    await page.waitForTimeout(400);
    const delMsg = await page.evaluate(() => {
      const n = document.querySelector('.me__msg--bad');
      return n && n.getClientRects().length ? n.textContent : null;
    });
    console.log('   退会 →', JSON.stringify(delMsg));
    if (!delMsg || !/Supabase/.test(delMsg)) fail('退会できない旨が伝わっていない');

    // ログアウト → 誤ったパスワードで入れないこと
    await page.evaluate(() => PB.auth.signOut());
    await page.waitForTimeout(300);
    await page.click('[data-auth-open="signin"]');
    await page.fill('#f-email', 'me@example.com');
    await page.fill('#f-pass', 'wrong-password');
    await page.click('#auth-submit');
    await page.waitForTimeout(600);
    const e1 = await page.textContent('#auth-err');
    console.log('   誤ったパスワード →', JSON.stringify(e1));
    if (!/違います/.test(e1 || '')) fail('Supabase の誤りが訳されていない');

    // 正しいパスワード → 再読み込みしても保持されるか
    await page.fill('#f-pass', 'correct-horse');
    await page.click('#auth-submit');
    await page.waitForTimeout(700);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(700);
    const kept = await page.evaluate(() => document.querySelector('.who__n') && document.querySelector('.who__n').textContent);
    console.log('   再読み込み後 →', JSON.stringify(kept));
    if (kept !== 'シュン改') fail('Supabase のセッションが再読み込みで切れた');

    // 使われているハンドル名は弾かれるか
    await page.evaluate(() => PB.auth.signOut());
    await page.waitForTimeout(300);
    await page.click('[data-auth-open="signin"]');
    await page.click('.tab[data-tab="signup"]');
    await page.fill('#f-email', 'other@example.com');
    await page.fill('#f-handle', 'shun');
    await page.fill('#f-display', '別人');
    await page.fill('#f-pass', 'correct-horse');
    await page.click('#auth-submit');
    await page.waitForTimeout(600);
    const e2 = await page.textContent('#auth-err');
    console.log('   使用済みハンドル名 →', JSON.stringify(e2));
    if (!/すでに使われて/.test(e2 || '')) fail('ハンドル名の重複が弾かれていない');

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
