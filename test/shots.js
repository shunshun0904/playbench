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

  if (url.pathname === '/auth/v1/user') {
    const tok = String(req.headers.authorization || '').replace('Bearer ', '');
    const uid = tok.replace('tok_', '');
    if (!store.profiles[uid]) return json(401, { msg: 'invalid token' });
    return json(200, { id: uid, email: 'me@example.com' });
  }

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
  /* 盤上の中身（作品・記録・アカウント）は games.html に移った。
     トップは名乗りと3つの入口だけなので、検査の入口はこちら。 */
  const GAMES = URL + 'games.html';
  const browser = await chromium.launch({ executablePath: process.env.PB_CHROME || undefined });
  let bad = 0;
  const fail = m => { console.log('   ❌ ' + m); bad++; };

  /* assets/config.js に測定IDが入っている以上、素で開くと gtag.js を取りに行く。
     検査を通信に依存させないため、本物には当てず空で返す。
     解析そのものを見る節では page.route（こちらが優先される）で数えている。 */
  const newContext = async opts => {
    const ctx = await browser.newContext(opts);
    await ctx.route(u => u.hostname === 'www.googletagmanager.com', r =>
      r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    return ctx;
  };

  /* ---------------------------------------------------- 見た目 3面 */
  for (const view of [
    { name: 'desktop-light', w: 1280, h: 1000, scheme: 'light' },
    { name: 'desktop-dark', w: 1280, h: 1000, scheme: 'dark' },
    { name: 'mobile-light', w: 390, h: 844, scheme: 'light' }
  ]) {
    const ctx = await newContext({
      viewport: { width: view.w, height: view.h },
      colorScheme: view.scheme, deviceScaleFactor: 2
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));

    await page.goto(GAMES, { waitUntil: 'load' });
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
      wantErr: window.PB.WORKS.reduce(
        (n, w) => n + w.plate.rows.filter(r => r.ci != null).length, 0),
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
    // data/bgg.js が空のあいだは 0、取ってきたら全作品ぶん。中途半端はおかしい
    if (c.bgg !== 0 && c.bgg !== c.wantGames) fail('BGG の行が一部の作品にしか出ていない');
    if (c.err !== c.wantErr) fail(`信頼区間のひげの数が合わない（${c.err}/${c.wantErr}）`);
    // ランキングの枠は、個人サイト寄せの際に外した（対戦がまだ無いのに枠だけあるのは嘘に近い）
    if (c.invite !== 1) fail('未ログインの勧誘が出ていない');
    if (c.rank !== 0) fail('外したはずのランキング枠が出ている');
    if (Math.abs(ratio - bar.v) > 0.02) fail('棒の幅が値と合っていない');
    await ctx.close();
  }

  /* ------------------------------------- アカウント（この端末だけの版） */
  {
    const ctx = await newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    /* assets/config.js に本番の Supabase 設定が入っていても、ここは
       LocalProvider を見る検査なので、空の設定を先に差し込んで固定する。
       配備先の設定に検査結果が左右されてはいけない。 */
    await page.addInitScript(() => {
      window.PB = { CONFIG: { supabase: { url: '', anonKey: '' } } };
    });
    await page.goto(GAMES, { waitUntil: 'load' });

    console.log('── アカウント（この端末だけ）');
    const kind0 = await page.evaluate(() => PB.auth.kind);
    console.log('   プロバイダ →', kind0);
    if (kind0 !== 'local') fail('LocalProvider に固定できていない');

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
    const ctx = await newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    // 実際の鍵は要らない。宛先だけ模擬サーバに向ける
    await page.addInitScript(u => {
      window.PB = { CONFIG: { supabase: { url: u, anonKey: 'anon-test-key' } } };
    }, URL.replace(/\/$/, ''));
    await page.goto(GAMES, { waitUntil: 'load' });
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

    /* スキーマを流し忘れたときに、生の英語ではなく次の一手が出るか。
       立ち上げで一番つまずくところなので、ここは必ず案内にする。 */
    await page.evaluate(() => {
      PB.auth.signOut();
      document.getElementById('auth-modal').close();   // 前の手順で開いたままなので閉じる
    });
    await page.waitForTimeout(200);
    await page.route('**/rest/v1/profiles**', r => r.fulfill({
      status: 404, contentType: 'application/json',
      body: JSON.stringify({ code: 'PGRST205', message: "Could not find the table 'public.profiles' in the schema cache" })
    }));
    await page.click('[data-auth-open="signin"]');
    await page.click('.tab[data-tab="signup"]');
    await page.fill('#f-email', 'x@example.com');
    await page.fill('#f-handle', 'someone');
    await page.fill('#f-display', 'だれか');
    await page.fill('#f-pass', 'correct-horse');
    await page.click('#auth-submit');
    await page.waitForTimeout(600);
    const e3 = await page.textContent('#auth-err');
    console.log('   テーブル未作成 →', JSON.stringify(e3));
    if (!/schema\.sql/.test(e3 || '')) fail('スキーマ未適用のときに次の一手が出ていない');
    await page.unroute('**/rest/v1/profiles**');

    if (errs.length) fail('例外: ' + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }

  /* --------------------- 確認メールのリンクから戻ってきたとき（模擬） */
  {
    const ctx = await newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await ctx.newPage();
    await page.addInitScript(u => {
      window.PB = { CONFIG: { supabase: { url: u, anonKey: 'anon-test-key' } } };
    }, URL.replace(/\/$/, ''));

    console.log('── 確認リンクからの着地（模擬）');

    // まず登録して、模擬サーバ側に利用者を作る
    await page.goto(GAMES, { waitUntil: 'load' });
    await page.click('[data-auth-open="signin"]');
    await page.click('.tab[data-tab="signup"]');
    await page.fill('#f-email', 'land@example.com');
    await page.fill('#f-handle', 'lander');
    await page.fill('#f-display', '着地 花子');
    await page.fill('#f-pass', 'correct-horse');
    await page.click('#auth-submit');
    await page.waitForTimeout(600);
    const uid = await page.evaluate(() => PB.auth.user() && PB.auth.user().id);
    await page.evaluate(() => { PB.auth.signOut(); localStorage.clear(); });
    await page.goto('about:blank');   // hash だけの遷移は再読み込みされないので、一度離れる

    // ログアウト状態で、Supabase が返すのと同じ形の hash を付けて開く
    await page.goto(GAMES + `#access_token=tok_${uid}&refresh_token=ref_${uid}`
      + '&expires_in=3600&token_type=bearer&type=signup', { waitUntil: 'load' });
    await page.waitForTimeout(900);
    const landed = await page.evaluate(() => ({
      who: document.querySelector('.who__n') && document.querySelector('.who__n').textContent,
      banner: document.querySelector('.landing__t') && document.querySelector('.landing__t').textContent,
      hash: location.hash
    }));
    console.log('   ', JSON.stringify(landed));
    if (landed.who !== '着地 花子') fail('確認リンクから戻ってもログインが完了していない');
    if (!landed.banner || !/確認/.test(landed.banner)) fail('着地の知らせが出ていない');
    if (landed.hash !== '') fail('URL に認証情報が残っている');

    // 期限切れリンクの場合
    await page.evaluate(() => { PB.auth.signOut(); localStorage.clear(); });
    await page.goto('about:blank');
    await page.goto(GAMES + '#error=access_denied&error_code=otp_expired'
      + '&error_description=Email+link+is+invalid+or+has+expired', { waitUntil: 'load' });
    await page.waitForTimeout(700);
    const expired = await page.evaluate(() => ({
      banner: document.querySelector('.landing--bad .landing__t') && document.querySelector('.landing--bad .landing__t').textContent,
      hash: location.hash
    }));
    console.log('   期限切れ →', JSON.stringify(expired));
    if (!expired.banner || !/有効期限/.test(expired.banner)) fail('期限切れリンクの案内が出ていない');
    if (expired.hash !== '') fail('URL に誤り情報が残っている');
    await ctx.close();
  }

  /* ------------------------------- 配備時の設定が効いているか（通信なし） */
  {
    const ctx = await newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await ctx.newPage();
    await page.goto(GAMES, { waitUntil: 'load' });   // 設定を差し込まず、素のまま
    const cfg = await page.evaluate(() => {
      const c = (PB.CONFIG && PB.CONFIG.supabase) || {};
      let ref = null, role = null;
      if (c.anonKey) {
        try {
          const p = JSON.parse(atob(c.anonKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
          ref = p.ref; role = p.role;
        } catch (e) { /* 解けなければ null のまま */ }
      }
      return { kind: PB.auth.kind, url: c.url, ref: ref, role: role,
               urlRef: (c.url || '').replace('https://', '').split('.')[0],
               ga: PB.analytics.id, gaState: PB.analytics.state() };
    });
    console.log('── 配備時の設定');
    console.log('   プロバイダ →', cfg.kind, '/ role →', cfg.role, '/ 参照 →', cfg.ref);
    console.log('   測定ID →', JSON.stringify(cfg.ga), '/', cfg.gaState);
    /* 測定IDは6か所（ここ＋ゲーム5作）に同じものが入っている。
       形が崩れていたら、ゲーム側と食い違っている可能性が高い */
    if (cfg.ga && !/^G-[A-Z0-9]{6,}$/.test(cfg.ga)) fail('測定IDが GA4 の形になっていない');
    if (cfg.url) {
      if (cfg.kind !== 'supabase') fail('設定が入っているのに Supabase に切り替わっていない');
      if (cfg.role !== 'anon') fail('anon 以外の鍵が置かれている（service_role は絶対に置かない）');
      if (cfg.ref !== cfg.urlRef) fail('URL と鍵のプロジェクトが食い違っている');
    } else {
      console.log('   （未設定。この端末だけの版で動く）');
      if (cfg.kind !== 'local') fail('未設定なのに local になっていない');
    }
    await ctx.close();
  }

  /* --------------------------------------------- アクセス解析（GA・通信なし）
     本物の googletagmanager には当てない。要求だけ数えて空で返す。
     見たいのは「どういう条件で読みに行くか」であって、GA の中身ではない。 */
  {
    console.log('── アクセス解析');
    const ID = 'G-TEST000000';

    async function open(opt) {
      opt = opt || {};
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      const hits = [];
      await page.route(u => u.hostname === 'www.googletagmanager.com', r => {
        hits.push(r.request().url());
        r.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
      });
      if (opt.dnt) {
        await page.addInitScript(() => {
          Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });
        });
      }
      await page.addInitScript(id => {
        window.PB = { CONFIG: { supabase: { url: '', anonKey: '' }, analytics: { measurementId: id } } };
      }, 'id' in opt ? opt.id : ID);
      await page.goto(GAMES, { waitUntil: 'load' });
      await page.waitForTimeout(350);
      return { ctx, page, hits };
    }
    const state = p => p.evaluate(() => PB.analytics.state());

    /* 1. 測定IDが無ければ、外部へ1本も出さない */
    {
      const { ctx, page, hits } = await open({ id: '' });
      const st = await state(page);
      const said = await page.textContent('#privacy-state');
      console.log('   測定IDなし →', st, '/ 要求', hits.length, '/', JSON.stringify(said));
      if (st !== 'unset') fail('測定IDが無いのに unset になっていない');
      if (hits.length) fail('測定IDが無いのに外部を読みに行った');
      if (!/計測していません/.test(said)) fail('計測していないことが奥付に出ていない');
      await ctx.close();
    }

    /* 2. 測定IDがあれば読みに行く。押せばその場で止まり、次に開いても入らない */
    {
      const { ctx, page, hits } = await open();
      const st = await state(page);
      console.log('   測定IDあり →', st, '/', hits[0]);
      if (st !== 'on') fail('測定IDを入れても on にならない');
      if (hits.length !== 1 || hits[0].indexOf(ID) < 0) fail('gtag.js を測定ID付きで読みに行っていない');
      if (!(await page.evaluate(() => (window.dataLayer || [])
        .some(a => a[0] === 'config' && a[1] === PB.analytics.id)))) {
        fail('gtag config が測定IDで積まれていない');
      }

      await page.click('#privacy-state .lnk');
      await page.waitForTimeout(150);
      const after = await page.evaluate(() => ({
        st: PB.analytics.state(),
        off: window['ga-disable-' + PB.analytics.id] === true,
        txt: document.getElementById('privacy-state').textContent
      }));
      console.log('   止める →', JSON.stringify(after));
      if (after.st !== 'off' || !after.off) fail('「止める」を押しても送信が止まっていない');
      if (!/止めています/.test(after.txt)) fail('止めたことが奥付に出ていない');

      hits.length = 0;
      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(350);
      console.log('   止めたまま再読込 →', await state(page), '/ 要求', hits.length);
      if (hits.length) fail('止めたのに次の読み込みでまた読みに行った');
      if (await state(page) !== 'off') fail('止めた設定が残っていない');
      await ctx.close();
    }

    /* 3. 追跡拒否を出しているブラウザには読み込まない。本人が許せば入る */
    {
      const { ctx, page, hits } = await open({ dnt: true });
      console.log('   DNT あり →', await state(page), '/ 要求', hits.length);
      if (await state(page) !== 'dnt') fail('DNT を無視している');
      if (hits.length) fail('DNT を出しているのに読みに行った');
      await page.click('#privacy-state .lnk');
      await page.waitForTimeout(400);
      console.log('   それでも許可 →', await state(page), '/ 要求', hits.length);
      if (await state(page) !== 'on' || !hits.length) fail('本人が許可しても入らない');
      await ctx.close();
    }

    /* 4. 奥付が「何も追跡せず」と言い続けていないこと */
    {
      const { ctx, page } = await open();
      const foot = () => page.evaluate(() => document.querySelector('.colophon').textContent);
      const ja = await foot();
      await page.click('#lang');
      await page.waitForTimeout(300);
      const en = await foot();
      if (/何も追跡せず/.test(ja)) fail('奥付が「何も追跡せず」と言ったまま');
      if (/nothing is tracked/i.test(en)) fail('英語の奥付が nothing is tracked のまま');
      if (!/Google アナリティクス/.test(ja) || !/Google Analytics/.test(en)) {
        fail('何で計測しているかが奥付に出ていない');
      }
      await ctx.close();
    }
  }


  /* ------------------------------------------ BGG の行（見本を差し込んで確認）
     data/bgg.js は空のまま置いてある。空だと画面には何も出ないので、
     取ってきたあとにきちんと出るかを、ここで確かめておく。
     配信そのものを差し替えるので、本物の読み込み経路をそのまま通る。
     見本は検査の中だけに存在し、リポジトリの数字には触れない。 */
  {
    const ctx = await newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.route(u => u.pathname.endsWith('/data/bgg.js'), r => r.fulfill({
      status: 200, contentType: 'text/javascript',
      body: `window.PB = window.PB || {};
             window.PB.BGG = { fetchedAt: '2026-08-06', source: 'boardgamegeek.com', games: {
               highsociety: { id: 220,  weight: 1.62, rating: 6.98, ratings: 12345 },
               bigshot:     { id: 1746, weight: 2.00, rating: 6.40, ratings: 678 },
               acquire:     { id: 5,    weight: 2.50, rating: 7.30, ratings: 34567 }
             } };`
    }));
    await page.goto(GAMES, { waitUntil: 'load' });
    await page.waitForTimeout(400);

    const bgg = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.bgg')];
      if (!rows.length) return { n: 0 };
      const first = rows[0];
      return {
        n: rows.length,
        meters: first.querySelectorAll('.bgg__m').length,
        vals: [...first.querySelectorAll('.bgg__v')].map(n => n.textContent),
        widths: [...first.querySelectorAll('.bgg__b')].map(n => n.style.width),
        people: (first.querySelector('.bgg__n') || {}).textContent,
        href: first.querySelector('.bgg__a').getAttribute('href'),
        when: (first.querySelector('.bgg__d') || {}).textContent
      };
    });
    console.log('── BGG の行（見本）');
    console.log('  ', JSON.stringify(bgg));
    if (bgg.n !== 3) fail(`BGG の行が3作ぶん出ていない（${bgg.n}）`);
    else {
      if (bgg.meters !== 2) fail('重さと評価の2本が出ていない');
      if (bgg.vals[0] !== '1.62 / 5' || bgg.vals[1] !== '6.98 / 10') fail('値の出し方が合わない: ' + bgg.vals);
      /* 重さは5点満点、評価は10点満点。棒の長さがその割合になっているか。
         style.width は丸めて返ってくるので、文字列ではなく数として比べる */
      const pct = s => parseFloat(s);
      if (Math.abs(pct(bgg.widths[0]) - 1.62 / 5 * 100) > 0.05) fail('重さの棒が満点5に対する割合でない: ' + bgg.widths[0]);
      if (Math.abs(pct(bgg.widths[1]) - 6.98 / 10 * 100) > 0.05) fail('評価の棒が満点10に対する割合でない: ' + bgg.widths[1]);
      if (!/12,345/.test(bgg.people || '')) fail('評価人数が出ていない');
      if (bgg.href !== 'https://boardgamegeek.com/boardgame/220') fail('BGG への行き先が合わない');
      if (!/2026-08-06/.test(bgg.when || '')) fail('取得日が添えられていない');
      await page.evaluate(() => {
        document.querySelectorAll('.scale').forEach(n => n.classList.add('is-read'));
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, 'bgg-sample.png'), fullPage: true });
    }
    await ctx.close();
  }

  /* ------------------------------------------------------------- 英語 */
  {
    const ctx = await newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(GAMES, { waitUntil: 'load' });
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
      head: document.querySelector('.band__t').textContent.trim(),
      nav: [...document.querySelectorAll('.masthead__nav a')].map(a => a.textContent).join('/'),
      first: document.querySelector('.game__title').textContent.trim(),
      play: document.querySelector('.game .btn--go').textContent.trim(),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    }));
    console.log('── 英語');
    console.log('  ', JSON.stringify(en));
    // 収録は3作。先頭はハイソサエティ
    if (en.lang !== 'en' || en.first !== 'High Society' || !/Play/.test(en.play)) fail('英語に切り替わっていない');
    if (!/About\/Macro\/Board games/.test(en.nav)) fail('天のナビが英語になっていない');
    if (en.overflow > 1) fail('横スクロールが出ている');
    await ctx.close();
  }

  await browser.close();
  srv.close();
  console.log(bad ? `\n❌ ${bad} 件` : '\n✅ すべて通過');
  process.exit(bad ? 1 : 0);
})();
