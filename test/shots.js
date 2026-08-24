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
  /* 既定は黒。白は選んだときだけなので、白の面は localStorage に
     入れてから開く（端末の設定では白にならない）。 */
  for (const view of [
    { name: 'desktop-dark', w: 1280, h: 1000, pick: null },
    { name: 'desktop-light', w: 1280, h: 1000, pick: 'light' },
    { name: 'mobile-dark', w: 390, h: 844, pick: null }
  ]) {
    const ctx = await newContext({
      viewport: { width: view.w, height: view.h },
      /* わざと「明るい設定の端末」にしておく。それでも既定が黒であること */
      colorScheme: 'light', deviceScaleFactor: 2
    });
    if (view.pick) {
      await ctx.addInitScript(`try { localStorage.setItem('pb-theme', '${view.pick}'); } catch (e) {}`);
    }
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));

    await page.goto(GAMES, { waitUntil: 'load' });
    await page.waitForTimeout(300);

    /* 端末が明るい設定でも、選んでいなければ黒で出ること */
    const paper = await page.evaluate(() => ({
      bg: getComputedStyle(document.body).backgroundColor,
      attr: document.documentElement.getAttribute('data-theme'),
      /* 幅のトークンが両方の地で生きていること（片方に寄せると崩れる） */
      w: getComputedStyle(document.documentElement).getPropertyValue('--sheet-w').trim()
    }));
    const wantBlack = view.pick !== 'light';
    if ((paper.bg === 'rgb(0, 0, 0)') !== wantBlack) {
      fail(`${view.name}: 地の色が想定と違う（${paper.bg} / 選択=${paper.attr}）`);
    }
    if (paper.w !== '64rem') fail(`${view.name}: --sheet-w が効いていない（${paper.w || '空'}）`);
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
      rank: document.querySelectorAll('.rank').length,
      bgg: document.querySelectorAll('.bgg').length,
      err: document.querySelectorAll('.srow__err').length,
      wantGames: window.PB.WORKS.length,
      wantBars: window.PB.WORKS.reduce((n, w) => n + w.plate.rows.length, 0),
      wantErr: window.PB.WORKS.reduce(
        (n, w) => n + w.plate.rows.filter(r => r.ci != null).length, 0),
      /* 段階（ROADMAP）と作り（PRINCIPLES）は本人が外した。
         data も受け皿も無いので、数える対象そのものが無い。 */
    }));
    const bar = await page.evaluate(() => {
      const b = document.querySelector('.srow__bar'), t = b.parentElement;
      return { w: b.getBoundingClientRect().width, t: t.getBoundingClientRect().width, v: +b.style.getPropertyValue('--v') };
    });
    const ratio = bar.w / bar.t;

    console.log(`── ${view.name}`);
    console.log(`   横あふれ ${overflow}px / ゲーム ${c.games} / 遊ぶ ${c.play} / 強さ ${c.chips} / 棒 ${c.bars} / BGG ${c.bgg} / ひげ ${c.err}`);
    console.log(`   棒幅の比 ${ratio.toFixed(3)} (--v=${bar.v})`);
    if (errs.length) fail('コンソール: ' + errs.slice(0, 3).join(' | '));
    if (overflow > 1) fail('横スクロールが出ている');
    if (c.games !== c.wantGames || c.chips !== c.wantGames || c.play !== c.wantGames
      || c.bars !== c.wantBars) {
      fail(`組めていない要素がある（ゲーム ${c.games}/${c.wantGames}・遊ぶ ${c.play}/${c.wantGames}`
        + `・強さ ${c.chips}/${c.wantGames}・棒 ${c.bars}/${c.wantBars}）`);
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
    /* 奥付の「このサイトについて」列は本人が外した（d73bf3a）。
       計測の状態表示と「止める」ボタンも一緒に消えている。
       仕組みそのものは生きているので、ここでは仕組みを見る。
       表示が無いことは落とさずに報告だけする ── 出すかどうかは本人の判断。 */
    const shown = p => p.evaluate(() => {
      const h = document.getElementById('privacy-state');
      return h ? h.textContent : null;
    });

    /* 1. 測定IDが無ければ、外部へ1本も出さない */
    {
      const { ctx, page, hits } = await open({ id: '' });
      const st = await state(page);
      const said = await shown(page);
      console.log('   測定IDなし →', st, '/ 要求', hits.length, '/ 奥付', said === null ? '表示なし' : JSON.stringify(said));
      if (st !== 'unset') fail('測定IDが無いのに unset になっていない');
      if (hits.length) fail('測定IDが無いのに外部を読みに行った');
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

      /* 画面のボタンは無くなったので、仕組みを直に呼んで止める */
      await page.evaluate(() => PB.analytics.set(false));
      await page.waitForTimeout(150);
      const after = await page.evaluate(() => ({
        st: PB.analytics.state(),
        off: window['ga-disable-' + PB.analytics.id] === true,
        txt: (document.getElementById('privacy-state') || {}).textContent || '（表示なし）'
      }));
      console.log('   止める →', JSON.stringify(after));
      if (after.st !== 'off' || !after.off) fail('「止める」を押しても送信が止まっていない');
      if (after.txt !== '（表示なし）' && !/止めています/.test(after.txt)) {
        fail('止めたことが奥付に出ていない');
      }

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
      await page.evaluate(() => PB.analytics.set(true));
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
      /* 本人が奥付の「このサイトについて」列を外した（d73bf3a）ので、
         いまは告知そのものが無い。嘘が書いてあるより無いほうがまし、
         とは言えないので、落としはしないが毎回出す。 */
      if (!/Google アナリティクス/.test(ja) || !/Google Analytics/.test(en)) {
        console.log('   ⚠️  GA は動いているが、奥付に告知も「止める」も無い');
        console.log('      戻すなら buildFoot()。出さない判断ならこの行は無視でよい');
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
      /* 枚数は site.js の PAGES から取る。ここに数を直書きすると、
         ページを1枚足すたびに検査のほうが落ちる。 */
      const got = await page.evaluate(() => {
        const nav = document.querySelector('.masthead__nav');
        if (!nav) return null;
        return {
          want: (window.PB && window.PB.PAGES) ? window.PB.PAGES.length : null,
          tabs: [...nav.querySelectorAll('a')].map(a => {
            const r = a.getBoundingClientRect();
            return { t: a.textContent, ok: r.width > 0 && r.height > 0
              && r.right <= innerWidth + 0.5 && r.left >= -0.5 };
          })
        };
      });
      const tabs = got && got.tabs;
      const want = got && got.want;
      console.log(`   ${w}px → ` +
        (tabs ? tabs.map(x => (x.ok ? '✅' : '❌') + x.t).join(' ') : 'nav が無い'));
      if (!want) fail(`${w}px で PB.PAGES が読めない`);
      else if (!tabs || tabs.length !== want) {
        fail(`${w}px でタブが${want}枚出ていない（${tabs ? tabs.length : 0}枚）`);
      }
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
    if (bgg.n !== 2) fail(`BGG の行が2作ぶん出ていない（${bgg.n}）`);
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

  /* --------------------------------- 経済の表：次回公表の近さで色を付ける */
  /* 日付は data/releases.js に入っているが、あれは毎日 Actions が
     書き換える。実物に固定の日付でぶら下がると、更新のたびに検査が
     落ちる（実際に落ちた）。見本を差し込んで、日付を止めて見る。 */
  {
    const FIX = `window.PB = window.PB || {};
      window.PB.RELEASES = { asOf: '2026-08-06', from: 'test', fromEn: 'test', byId: {
        fedfunds: [{ on: '2026-09-17', note: 'a' }],
        cpi:      [{ on: '2026-08-12', note: 'b' }, { on: '2026-09-16', note: 'b2' }],
        unemp:    [{ on: '2026-08-07', note: 'c' }, { on: '2026-09-04', note: 'c2' }],
        pce:      [{ on: '2026-08-28', note: 'd' }],
        umich:    [{ on: '2026-08-14', note: 'e' }],
        beige:    [{ on: '2026-09-03', note: 'f' }],
        usmb:     [{ on: '2026-08-07', note: 'g' }],
        jpcpi:    [{ on: '2026-08-21', note: 'h' }],
        jpcgpi:   [{ on: '2026-08-12', note: 'i' }],
        jpmb:     [{ on: '2026-09-02', note: 'j' }]
      } };`;

    for (const [now, want] of [
      /* 見本の先頭。08-07 に2件あるので、印は2つ付く */
      ['2026-08-06', { next: ['2026-08-07', '2026-08-07'], lit: 10, dry: 0 }],
      /* 2週間後。日付が変わるだけで起点はひとりでに繰り上がる */
      ['2026-08-20', { next: ['2026-08-21'], lit: 7, dry: 3 }],
      /* 見本を追い越したところ。黙って消えるのではなく、無いと書く */
      ['2026-10-01', { next: [], lit: 0, dry: 10 }]
    ]) {
      const ctx = await newContext({ viewport: { width: 1280, height: 1200 } });
      await ctx.route(u => u.pathname.endsWith('/data/releases.js'), r =>
        r.fulfill({ status: 200, contentType: 'text/javascript', body: FIX }));
      await ctx.addInitScript(`{
        const F = new Date('${now}T09:00:00').getTime(), R = Date;
        Date = class extends R { constructor(...a) { super(...(a.length ? a : [F])); }
                                 static now() { return F; } };
        Date.parse = R.parse; Date.UTC = R.UTC;
      }`);
      const page = await ctx.newPage();
      await page.goto(URL + 'macro.html', { waitUntil: 'load' });
      await page.waitForFunction(() => document.querySelectorAll('.grid__r').length > 0);

      const got = await page.evaluate(() => ({
        rows: [...document.querySelectorAll('.grid tbody tr')].map(tr => {
          const c = tr.querySelector('.grid__r');
          const h = c.style.getPropertyValue('--heat');
          return {
            date: c.querySelector('.grid__date').textContent,
            heat: h === '' ? null : parseFloat(h),
            next: c.classList.contains('is-next'),
            dry: c.classList.contains('is-dry'),
            alpha: parseFloat(getComputedStyle(c, '::before').opacity)
          };
        }),
        warn: !!document.querySelector('.grid__warn')
      }));
      const rows = got.rows;
      const lit = rows.filter(r => r.heat != null);
      const nextDates = rows.filter(r => r.next).map(r => r.date).sort();
      console.log(`── 経済の表・次回公表の近さ（今日 = ${now}）`);
      console.log('   色付き', lit.length, '/ 印', nextDates.join(',') || '（なし）',
                  '/ 予定なし', rows.filter(r => r.dry).length,
                  '/ 注意書き', got.warn ? 'あり' : 'なし');

      /* 日次で出るものは複数ある（金利まわり）。1つ残らず色を持たないこと */
      const daily = rows.filter(r => /毎営業日/.test(r.date));
      if (!daily.length) fail('毎営業日の行が見つからない');
      if (daily.some(r => r.heat != null || r.alpha > 0)) fail('毎営業日にも色が付いている');
      if (daily.some(r => r.dry)) fail('毎営業日の行が「予定なし」になっている');

      if (lit.length !== want.lit) fail(`色付きの数が合わない（${lit.length} / 期待 ${want.lit}）`);
      if (rows.filter(r => r.dry).length !== want.dry) fail('「予定なし」の数が合わない');
      if (rows.some(r => r.dry && (r.heat != null || r.alpha > 0))) fail('予定なしの行に色が付いている');
      if (got.warn !== (want.dry > 0)) fail('足りないことの注意書きが出ていない／余計に出ている');
      if (nextDates.join(',') !== want.next.join(',')) fail('いちばん近い公表の印がずれている');

      const byDate = [...lit].sort((a, b) => (a.date < b.date ? -1 : 1));
      for (let i = 1; i < byDate.length; i++) {
        if (byDate[i].date === byDate[i - 1].date) {
          if (byDate[i].heat !== byDate[i - 1].heat) fail('同じ公表日なのに濃さが違う');
        } else if (byDate[i].heat >= byDate[i - 1].heat) fail('先の日付のほうが濃い');
      }
      if (byDate.length && byDate[byDate.length - 1].alpha <= 0) fail('いちばん遠い公表の色が消えている');
      if (byDate.length && byDate[0].heat !== 1) fail('いちばん近い公表が最大の濃さでない');
      await ctx.close();
    }
  }

  /* ------------------------------------------- 自己紹介（トップ）の中身 */
  /* data/profile.js は履歴書から起こしてある。載せてよいものだけが
     出ていること、特に連絡先の類が漏れていないことを毎回見る。 */
  {
    const ctx = await newContext({ viewport: { width: 1280, height: 1400 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.rsc__row').length > 0);
    await page.screenshot({ path: path.join(OUT, 'home-profile.png'), fullPage: true });

    const p = await page.evaluate(() => ({
      bands: [...document.querySelectorAll('.band__t')].map(b => b.textContent.trim()),
      intro: document.querySelectorAll('#profile-intro .lead').length,
      cv: document.querySelectorAll('.cv__row').length,
      groups: [...document.querySelectorAll('.rsc__gt')].map(g => g.textContent.trim()),
      /* 名乗りの下の写真。読めていること、代替文があること、
         寸法が入っていること（無いと読み終わった瞬間に本文が飛ぶ） */
      photo: (function () {
        const i = document.querySelector('.shot__i');
        if (!i) return null;
        return { ok: i.complete && i.naturalWidth > 0, alt: i.alt.length,
                 sized: !!(i.getAttribute('width') && i.getAttribute('height')) };
      })(),
      rows: document.querySelectorAll('.rsc__row').length,
      /* 空 url の行がリンクとして出ていないこと */
      dead: [...document.querySelectorAll('.rsc__t--go, .links__a')]
        .filter(a => !a.getAttribute('href')).length,
      links: [...document.querySelectorAll('.links__a')].map(a => a.textContent.trim()),
      blank: document.querySelectorAll('.blank').length,
      /* 履歴書には載っているが、公開してはいけないもの。
         値そのものはここに書かない（書けばこの検査ごと漏れる）。
         形で見る ── 電話番号・メール・郵便番号・生年月日。 */
      leak: [
        ['電話番号らしきもの', /(^|[^\d])0\d{9,10}([^\d]|$)/],
        ['メールアドレス',     /[\w.+-]+@[\w-]+\.[\w.]{2,}/],
        ['郵便番号',           /(^|[^\d])\d{3}-\d{4}([^\d]|$)/],
        ['生年月日',           /19\d{2}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日/]
      ].filter(([, re]) => re.test(document.body.innerText)).map(([name]) => name),
      /* 社名は出さない。個々の名前をここに並べるとこの検査ごと世に出るので、
         法人格の表記が職務経歴に現れていないかで見る。 */
      corp: /株式会社|有限会社|（株）|\(株\)|\b(Inc|Ltd|LLC|Corp)\b/
        .test((document.getElementById('profile-career') || {}).innerText || ''),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    }));
    /* 上の網が本当に掛かるか、作り物で確かめる。
       素通りしているだけの検査は、無いのと同じなので。 */
    const caught = await page.evaluate(() => [
      /(^|[^\d])0\d{9,10}([^\d]|$)/.test('連絡先 09012345678 まで'),
      /[\w.+-]+@[\w-]+\.[\w.]{2,}/.test('name@example.com'),
      /(^|[^\d])\d{3}-\d{4}([^\d]|$)/.test('〒100-0001 東京都'),
      /19\d{2}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日/.test('1990 年 1 月 1 日生'),
      /株式会社|有限会社|（株）|\(株\)|\b(Inc|Ltd|LLC|Corp)\b/.test('例 株式会社')
    ]);

    console.log('── 自己紹介');
    console.log('  ', JSON.stringify(p));
    console.log('   漏れ検知の網:', caught.map(c => c ? '効' : '×').join(''));
    if (caught.some(c => !c)) fail('漏れ検知の網が効いていない（作り物を捕まえられない）');
    if (errs.length) fail('JS が転んでいる: ' + errs[0]);
    if (p.bands.join('/') !== '自己紹介/職務経歴/研究業績') fail('見出しが揃っていない');
    if (p.intro < 1) fail('自己紹介が出ていない');
    if (!p.photo) fail('名乗りの下の写真が出ていない');
    else {
      if (!p.photo.ok) fail('写真が読めていない（パスかファイルを確かめる）');
      if (!p.photo.alt) fail('写真に代替文が無い');
      if (!p.photo.sized) fail('写真に寸法が入っていない（読み込み後に本文がずれる）');
    }
    if (p.cv < 6) fail('職務経歴の行が足りない');
    if (p.groups.length < 3 || p.rows < 8) fail('研究業績が出ていない');
    if (p.dead) fail('行き先のないリンクが出ている');
    if (p.blank) fail('「まだ書いていません」が残っている');
    if (p.leak.length) fail('連絡先などが漏れている: ' + p.leak.join(', '));
    if (p.corp) fail('職務経歴に社名が出ている');
    if (p.overflow > 1) fail('横スクロールが出ている');
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
    if (!/About\/Board games\/Economy\/Market sentiment/.test(en.nav)) fail('天のタブが英語になっていない');
    if (en.overflow > 1) fail('横スクロールが出ている');
    await ctx.close();
  }


  /* ------------------------------------------------ 市場センチメント
     数字は AWS 側から来るので、リポジトリの中には無い。
     配信を差し替えて、(a) 配備前の断り書き (b) 数字が来たときの画面、
     の両方を通す。見本は検査の中だけに存在する。 */
  {
    /* 見本は「いま」から作る。ページは取得時刻ではなく現在時刻で再構成するので、
       固定の日付を置くと窓から外れて空になる。

       仕掛けは2群。半減期ちょうど6時間ぶん離してあるので、答えが手で出る:
         A  1分前   −0.5 × 12件   重み k
         B  6時間1分前  +0.1 × 12件   重み k/2   （k は約分で消える）
       いま       = (12k(−.5) + 6k(.1)) / (12k + 6k) = −0.30
       単純平均    = (−0.5 + 0.1) / 2                = −0.20
       1時間前     = A がまだ無いので B だけ         = +0.10 → 前比 −0.40 */
    const MIN = 60e3;
    const av = (msAgo, sec) => {
      const d = new Date(Date.now() - msAgo);
      const p = (n, w) => String(n).padStart(w || 2, '0');
      return p(d.getUTCFullYear(), 4) + p(d.getUTCMonth() + 1) + p(d.getUTCDate())
        + 'T' + p(d.getUTCHours()) + p(d.getUTCMinutes()) + (sec ? p(d.getUTCSeconds()) : '');
    };
    const win = [];
    for (let i = 0; i < 12; i++) win.push({ t: av(1 * MIN, true), s: -0.5, r: 1 });
    for (let i = 0; i < 12; i++) win.push({ t: av(361 * MIN, true), s: 0.1, r: 1 });

    const FIX = {
      schema_version: 2,
      updated_at: av(1 * MIN),
      next_update_at: av(-59 * MIN),
      current: -0.30, label: 'Somewhat-Bearish', raw_mean: -0.20, n_articles: 24,
      top_tickers: [{ s: 'NVDA', n: 9 }],
      /* 集計側の値。ページはこれと自分の再構成を突き合わせて差を出す。
         照合は表示のグリッドではなく**この時刻そのもの**で行うので、刻みに依らない。
         この時刻には B しか窓に入らないため、どちらも +0.10 になるはず */
      series: [
        { t: av(120 * MIN), v: 0.1, u: 0.1 },
        { t: av(60 * MIN), v: 0.1, u: 0.1 }
      ],
      params: { half_life_hours: 6, window_hours: 24, step_min: 60,
                use_relevance: true, update_interval_seconds: 3600 },
      window: win,
      top_articles: [
        { title: 'Jobless claims rise more than expected', url: 'https://example.com/a',
          source: 'wsj.com', t: av(1 * MIN, true), score: -0.52 },
        { title: 'Tech megacaps lead broad rally into the close', url: 'https://example.com/b',
          source: 'bloomberg.com', t: av(75 * MIN, true), score: 0.61 }
      ]
    };

    /* (a) 配備前 ── endpoint が空。数字を出さず、そう書けているか。
       本物の data/sentiment.js は配備済みでURLが入っているので、
       ここは空の設定を差し込んで確かめる（本番の設定に依存させない）。 */
    {
      const ctx = await newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      await page.route(u => u.pathname.endsWith('/data/sentiment.js'), r => r.fulfill({
        status: 200, contentType: 'text/javascript',
        body: `window.PB = window.PB || {};
               window.PB.SENTIMENT = { endpoint: '',
                 index: { id: 'SPX', ja: 'S&P 500', en: 'S&P 500' } };`
      }));
      await page.goto(URL + 'sentiment.html', { waitUntil: 'load' });
      await page.waitForTimeout(300);
      const blank = await page.evaluate(() => ({
        blank: !!document.querySelector('#sentiment .blank'),
        big: !!document.querySelector('.sent__big'),
        tag: (document.getElementById('sent-when') || {}).textContent
      }));
      console.log('── 市場センチメント（配備前）');
      console.log('  ', JSON.stringify(blank));
      if (!blank.blank) fail('配備前の断り書きが出ていない');
      if (blank.big) fail('数字が無いのに数字を出している');
      if (!/未配備/.test(blank.tag)) fail(`未配備と書けていない（${blank.tag}）`);
      await ctx.close();
    }

    /* (b) 数字が来たとき */
    {
      const ctx = await newContext({ viewport: { width: 1280, height: 1200 }, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      await page.route(u => u.pathname.endsWith('/data/sentiment.js'), r => r.fulfill({
        status: 200, contentType: 'text/javascript',
        body: `window.PB = window.PB || {};
               window.PB.SENTIMENT = {
                 endpoint: '/fixture-sentiment.json',
                 index: { id: 'SPX', ja: 'S&P 500', en: 'S&P 500' },
                 provider: { ja: 'Alpha Vantage（記事とスコア）', en: 'Alpha Vantage (articles and scores)' },
                 method: { ja: '半減期6時間の加重平均です。', en: 'Time-decayed mean, 6-hour half-life.' },
                 caveat: { ja: '相場の予測ではありません。', en: 'Not a forecast.' }
               };`
      }));
      await page.route(u => u.pathname.endsWith('/fixture-sentiment.json'), r => r.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify(FIX)
      }));
      await page.goto(URL + 'sentiment.html', { waitUntil: 'load' });
      await page.waitForFunction(() => !!document.querySelector('.sent__big'));

      const got = await page.evaluate(() => ({
        big: document.querySelector('.sent__big').textContent,
        label: document.querySelector('.sent__label').textContent,
        plates: [...document.querySelectorAll('.sent__v')].map(n => n.textContent),
        rows: document.querySelectorAll('.sent__a').length,
        first: document.querySelector('.sent__as').textContent,
        href: document.querySelector('.sent__at a').getAttribute('href'),
        paths: document.querySelectorAll('.sent__fig path').length,
        keys: document.querySelectorAll('.sent__legend .sent__lk').length,
        foot: (document.querySelector('.gauge__src') || {}).textContent,
        tabs: document.querySelectorAll('.masthead__nav a').length,
        here: (document.querySelector('.masthead__nav a.is-here') || {}).textContent,
        idx: (document.getElementById('sent-index') || {}).textContent,
        how: (document.querySelector('.sent__how') || {}).textContent,
        caveat: (document.querySelector('.sent__caveat') || {}).textContent,
        note: (document.querySelector('.grid__foot') || {}).textContent,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
      }));
      console.log('── 市場センチメント（見本）');
      console.log('  ', JSON.stringify(got));
      // 符号は必ず付ける。−0.30 と 0.30 を見間違えないため
      if (got.big !== '−0.30') fail(`いまの値が符号つきで出ていない（${got.big}）`);
      if (got.label !== 'やや弱気') fail('語が出ていない ── 色だけに意味を持たせない');
      // 前比・件数・単純平均。値は上のコメントの手計算どおりになるはず
      if (got.plates.join('/') !== '−0.40/24/−0.20') fail(`前比・件数・単純平均が合わない（${got.plates}）`);
      if (got.rows !== 2) fail(`記事が2件出ていない（${got.rows}）`);
      if (got.first !== '−0.52') fail('記事のスコアが符号つきで出ていない');
      if (!/^https:\/\//.test(got.href)) fail('記事のリンクが http(s) でない');
      if (got.paths < 3) fail('図（面・主系列・対照の破線）が3本そろっていない');
      // 線が2種類ある以上、凡例が無いと破線が何なのか分からない
      if (got.keys !== 2) fail(`凡例が2つ出ていない（${got.keys}）`);
      if (!/60分刻み/.test(got.foot)) fail('60分刻みで再構成したと書けていない');
      // 再構成が集計側とずれていないか。仕掛け上ぴったり合うはず
      const gap = (got.foot.match(/最大差\s*([\d.]+)/) || [])[1];
      if (gap == null) fail('集計側との照合が出ていない');
      else if (Number(gap) > 0.01) fail(`再構成が集計側とずれている（最大差 ${gap}）`);
      if (got.tabs !== 4) fail('天のタブが4枚出ていない');
      if (got.here !== '市場センチメント') fail('いま開いている耳に印が付いていない');
      if (got.idx !== 'S&P 500') fail('どの指数か出ていない');
      // 出どころと読み取り方は、無ければ数字だけが独り歩きする
      if (!got.how) fail('算出方法の説明が出ていない');
      if (!got.caveat) fail('読み取り方の注意が出ていない');
      // 記事一覧は最後の取得ぶんだけ。上の数字の全根拠だと読まれると誤る
      if (!/全部ではありません/.test(got.note)) fail('記事一覧が一部だという断りが無い');
      if (got.overflow > 1) fail('横スクロールが出ている');

      await page.screenshot({ path: path.join(OUT, 'sentiment.png'), fullPage: true });
      await ctx.close();
    }
  }

  await browser.close();
  srv.close();
  console.log(bad ? `\n❌ ${bad} 件` : '\n✅ すべて通過');
  process.exit(bad ? 1 : 0);
})();
