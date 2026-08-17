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
      if (!tabs || tabs.length !== 4) fail(`${w}px でタブが4枚出ていない`);
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


  /* ----------------------------------------------- おすすめ（recommend）
     見張るのは4つ。

     1. 閲覧者のブラウザから BGG へ1本も出ないこと。ここが破れると
        申請文（docs/bgg-api-application.md）で BGG に約束した形が崩れる
     2. どのカードにも取得日と評価人数が付いていること
     3. 初心者に重すぎるものが先頭に来ないこと。それができないなら
        このページを置く意味がない
     4. 合わないところを黙って伏せないこと

     数値は data/bgg-picks.js を差し替えて固定する（経済の表と同じやり方）。
     リポジトリのスナップショットが空でも、中身まで検査できる。 */
  {
    const FIX = "'use strict';window.PB=window.PB||{};window.PB.BGG_PICKS=" + JSON.stringify({
      fetchedAt: '2026-08-10',
      source: 'boardgamegeek.com',
      games: {
        'Patchwork': {
          id: 163412, name: 'Patchwork', year: 2014, minPlayers: 2, maxPlayers: 2,
          minTime: 15, maxTime: 30, time: 30, minAge: 8, weight: 1.62, rating: 7.61,
          bayes: 7.42, ratings: 102000, rank: 76,
          poll: { '1': [1, 6, 380], '2': [588, 18, 2] },
          categories: ['Abstract Strategy', 'Puzzle'], mechanics: ['Tile Placement']
        },
        'Azul': {
          id: 230802, name: 'Azul', year: 2017, minPlayers: 2, maxPlayers: 4,
          minTime: 30, maxTime: 45, time: 45, minAge: 8, weight: 1.77, rating: 7.75,
          bayes: 7.58, ratings: 118000, rank: 60,
          poll: { '2': [400, 150, 20], '4': [200, 300, 40] },
          categories: ['Abstract Strategy'], mechanics: ['Tile Placement']
        },
        'Codenames': {
          id: 178900, name: 'Codenames', year: 2015, minPlayers: 2, maxPlayers: 8,
          minTime: 15, maxTime: 15, time: 15, minAge: 14, weight: 1.29, rating: 7.55,
          bayes: 7.42, ratings: 92000, rank: 90,
          /* 2人は投票でほぼ否定されている。注意書きが出るはず */
          poll: { '2': [10, 60, 300], '6': [520, 80, 10] },
          categories: ['Party Game', 'Word Game'], mechanics: ['Team-Based Game']
        },
        'Brass: Birmingham': {
          id: 224517, name: 'Brass: Birmingham', year: 2018, minPlayers: 2, maxPlayers: 4,
          minTime: 60, maxTime: 120, time: 120, minAge: 14, weight: 3.91, rating: 8.6,
          bayes: 8.41, ratings: 45000, rank: 1,
          poll: { '2': [120, 300, 60], '3': [400, 120, 20] },
          categories: ['Economic'], mechanics: ['Network and Route Building']
        }
      }
    }) + ';';

    const ctx = await newContext({ viewport: { width: 1280, height: 1200 }, deviceScaleFactor: 2 });
    await ctx.route(u => u.pathname.endsWith('/data/bgg-picks.js'), r =>
      r.fulfill({ status: 200, contentType: 'text/javascript', body: FIX }));

    /* BGG 宛ての通信を数える。0 でなければならない */
    let toBgg = 0;
    await ctx.route(u => /boardgamegeek\.com|geekdo\.com/.test(u.hostname), r => {
      toBgg++;
      return r.abort();
    });

    const page = await ctx.newPage();
    await page.goto(URL + 'recommend.html', { waitUntil: 'load' });
    await page.waitForSelector('.rec__opt');

    const answer = async label => {
      await page.locator('.rec__opt', { hasText: label }).first().click();
      await page.waitForTimeout(60);
    };
    /* 2人 / 〜30分 / ほぼ初めて / パズル・箱庭 / ふたりで */
    await answer('2人');
    await answer('〜30分');
    await answer('ほぼ初めて');
    await answer('パズル・箱庭');
    await page.locator('.rec__nav .lnk').nth(1).click();   // 複数選択のページは「次へ」で進む
    await page.waitForTimeout(60);
    await answer('ふたりで');
    await page.waitForSelector('#rec-out .rec__card');

    const got = await page.evaluate(() => ({
      cards: [...document.querySelectorAll('#rec-out .rec__card')].map(el => ({
        name: el.querySelector('.rec__name').firstChild.textContent.trim(),
        score: parseInt(el.querySelector('.rec__match b').textContent, 10),
        warn: [...el.querySelectorAll('.rec__warn p')].map(p => p.textContent),
        bgg: !!el.querySelector('.bgg'),
        ratings: !!el.querySelector('.bgg__n'),
        asOf: (el.querySelector('.bgg__d') || {}).textContent || ''
      })),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    }));

    console.log('── おすすめ');
    console.log('   ' + got.cards.map(c => c.name + ' ' + c.score).join(' / '));
    console.log('   BGG への通信 ' + toBgg + ' 本');

    if (toBgg !== 0) fail('閲覧者のブラウザから BGG へ ' + toBgg + ' 本出ている（0 でなければならない）');
    if (!got.cards.length) fail('おすすめが1件も出ていない');
    if (got.cards.some(c => !c.bgg)) fail('BGG の行が無いカードがある');
    if (got.cards.some(c => !c.ratings)) fail('評価人数の無いカードがある');
    if (got.cards.some(c => !/2026-08-10/.test(c.asOf))) fail('取得日の無いカードがある');
    if (got.overflow > 1) fail('横スクロールが出ている');

    /* 初心者向けの並びになっているか。BGG 総合1位でも、重ければ先頭に来ない */
    const top = got.cards[0];
    if (top.name !== 'パッチワーク') fail('先頭が軽い作品でない（' + top.name + '）');
    const brass = got.cards.find(c => /ブラス/.test(c.name));
    if (!brass) fail('ブラスがカードに出ていない');
    else {
      if (brass.score >= top.score) fail('重量級が軽い作品より上に来ている');
      if (!brass.warn.some(w => /ルール説明/.test(w))) fail('重い作品に説明の注意書きが出ていない');
      if (!brass.warn.some(w => /長め/.test(w))) fail('時間が合わないことを書いていない');
    }
    /* BGG の投票が否定している人数は、そう言うこと */
    const cn = got.cards.find(c => /コードネーム/.test(c.name));
    if (cn && !cn.warn.some(w => /推奨されていません/.test(w))) {
      fail('BGG の投票が推奨していない人数なのに、そう書いていない');
    }

    await page.screenshot({ path: path.join(OUT, 'recommend.png'), fullPage: true });
    await ctx.close();
  }

  /* おすすめ ── まだ取得していないとき。
     空の結果を黙って出さず、取っていないと言うこと（経済の表と同じ方針）。 */
  {
    const ctx = await newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.route(u => u.pathname.endsWith('/data/bgg-picks.js'), r =>
      r.fulfill({ status: 200, contentType: 'text/javascript',
        body: "'use strict';window.PB=window.PB||{};window.PB.BGG_PICKS={\"fetchedAt\":null,\"source\":\"boardgamegeek.com\",\"games\":{}};" }));
    const page = await ctx.newPage();
    await page.goto(URL + 'recommend.html', { waitUntil: 'load' });
    await page.waitForSelector('.rec__opt');
    for (const l of ['3〜4人', '30〜60分', 'ほぼ初めて', 'わいわい']) {
      await page.locator('.rec__opt', { hasText: l }).first().click();
      await page.waitForTimeout(50);
    }
    await page.locator('.rec__nav .lnk').nth(1).click();
    await page.waitForTimeout(50);
    await page.locator('.rec__opt', { hasText: '友人' }).first().click();
    await page.waitForTimeout(250);

    const none = await page.evaluate(() => {
      const n = document.querySelector('.rec__none');
      return { shown: !!n, cards: document.querySelectorAll('.rec__card').length,
               text: n ? n.textContent : '' };
    });
    console.log('── おすすめ（取得前）');
    console.log('   ' + (none.shown ? '「まだ取得していない」と出る' : '何も出ない'));
    if (!none.shown) fail('スナップショットが空のとき、取っていないと言っていない');
    if (none.cards) fail('データが無いのにカードが出ている');
    if (!/npm run bgg/.test(none.text)) fail('埋め方（npm run bgg）が書かれていない');
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
    if (!/About\/Board games\/Picks\/Economy/.test(en.nav)) fail('天のタブが英語になっていない');
    if (en.overflow > 1) fail('横スクロールが出ている');
    await ctx.close();
  }

  await browser.close();
  srv.close();
  console.log(bad ? `\n❌ ${bad} 件` : '\n✅ すべて通過');
  process.exit(bad ? 1 : 0);
})();
