/* 目視検査と、動きの確認。
     node test/shots.js
   出力は dist/shots/

   簡易サーバを立てて http で見る。 */
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
  /* 作品と実測は games.html にある。トップ（index.html）は自己紹介。 */
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
    if (c.rank !== 0) fail('外したはずのランキング枠が出ている');
    if (Math.abs(ratio - bar.v) > 0.02) fail('棒の幅が値と合っていない');
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


  /* --------------------------------------------- 携帯でタブが出ているか
     以前ここは display:none で畳んでいた（同じページ内へのリンクだった頃の名残）。
     いまタブはページの切り替えそのものなので、畳むと他のページへ行けなくなる。
     横あふれが0でも「見えている」ことにはならないので、1枚ずつ位置を見る。 */
  {
    console.log('── 携帯でのタブ');
    for (const w of [430, 390, 375, 360, 320]) {
      const ctx = await newContext({ viewport: { width: w, height: 760 },
        deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(350);
      const tabs = await page.evaluate(() => {
        const nav = document.querySelector('.masthead__nav');
        if (!nav) return null;
        return [...nav.querySelectorAll('a')].map(a => {
          const r = a.getBoundingClientRect();
          return { t: a.textContent, ok: r.width > 0 && r.height > 0
            && r.right <= innerWidth + 0.5 && r.left >= -0.5 };
        });
      });
      console.log(`   ${w}px → ` +
        (tabs ? tabs.map(x => (x.ok ? '✅' : '❌') + x.t).join(' ') : 'nav が無い'));
      if (!tabs || tabs.length !== 3) fail(`${w}px でタブが3枚出ていない`);
      else {
        const ng = tabs.filter(x => !x.ok);
        if (ng.length) fail(`${w}px でタブが見えない: ${ng.map(x => x.t).join('/')}`);
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
    if (!/About\/Board games\/Economy/.test(en.nav)) fail('天のタブが英語になっていない');
    if (en.overflow > 1) fail('横スクロールが出ている');
    await ctx.close();
  }

  await browser.close();
  srv.close();
  console.log(bad ? `\n❌ ${bad} 件` : '\n✅ すべて通過');
  process.exit(bad ? 1 : 0);
})();
