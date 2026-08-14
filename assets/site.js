/* ==========================================================================
   PLAYBENCH ─ 画面の組み立て

   ゲームは data/works.js から組む。ゲームを増やすときにこのファイルは触らない。
   図版もアバターも外部画像を持たず、その場で SVG を生成する。
   ========================================================================== */
'use strict';

(function () {
  var PB = window.PB;
  var lang = 'ja';

  /* ---------------------------------------------------------------- 小物 */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function pick(o, key) {
    if (lang === 'en') { var k = key + 'En'; if (o[k]) return o[k]; }
    return o[key];
  }
  function fmt(v) {
    var s = v.toFixed(3);
    return v < 1 ? s.slice(1) : s;
  }
  var T = {
    ja: {
      play: '遊ぶ', soon: '準備中', repo: '実装を見る', opponent: '相手',
      players: '人数', genre: '分類', designer: '作者',
      strength: '相手の強さ', parity: '互角', detail: 'この相手をどう作ったか',
      plate: '実測', remark: '注記', fig: '図', planned: '未実装',
      noRank: 'まだ対戦が行われていません。エージェント機能ができると、ここに並びます。',
      measOn: 'この端末では計測しています', measOff: 'この端末では計測を止めています',
      measDnt: 'ブラウザが追跡拒否（DNT）を出しているので、計測していません',
      measUnset: '測定IDを入れていないので、いまは何も計測していません',
      measStop: '止める', measAllow: '許可する', measAnyway: 'それでも許可する'
    },
    en: {
      play: 'Play', soon: 'Coming soon', repo: 'Source', opponent: 'Opponents',
      players: 'Players', genre: 'Type', designer: 'Designer',
      strength: 'How strong', parity: 'parity', detail: 'How this opponent was built',
      plate: 'Measured', remark: 'Note', fig: 'Fig.', planned: 'planned',
      noRank: 'No matches yet. Once agents arrive, they will be ranked here.',
      measOn: 'Measuring on this device', measOff: 'Measurement is off on this device',
      measDnt: 'Your browser asks not to be tracked, so nothing is measured',
      measUnset: 'No measurement ID is set, so nothing is being measured',
      measStop: 'Stop', measAllow: 'Allow', measAnyway: 'Allow anyway'
    }
  };
  function t(k) { return T[lang][k]; }

  /* --------------------------------------------------------------- 図版 */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svg(w, h) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    s.setAttribute('role', 'img');
    return s;
  }
  function sh(parent, tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    parent.appendChild(n);
    return n;
  }

  /* 街区図 ── ビッグショット */
  function figBlocks() {
    var s = svg(100, 100), ink = 'currentColor';
    var cells = [[8,8],[38,8],[68,8],[8,38],[38,38],[68,38],[8,68],[38,68],[68,68]];
    cells.forEach(function (c, i) {
      var x = c[0], y = c[1], w = 24, h = 24, park = (i === 4);
      sh(s, 'rect', {
        x: x, y: y, width: w, height: h,
        fill: park ? 'none' : 'currentColor', 'fill-opacity': park ? 0 : .05,
        stroke: ink, 'stroke-width': .85, 'stroke-opacity': .8
      });
      if (park) {
        sh(s, 'path', {
          d: 'M' + x + ' ' + (y + 16) + ' Q' + (x + 12) + ' ' + (y + 4) + ' ' + (x + 24) + ' ' + (y + 10),
          fill: 'none', stroke: ink, 'stroke-width': .6, 'stroke-opacity': .4
        });
        [[6,6],[17,8],[11,18],[19,17]].forEach(function (p) {
          sh(s, 'circle', { cx: x + p[0], cy: y + p[1], r: 2.1, fill: ink, 'fill-opacity': .3 });
        });
      } else {
        var n = 2 + (i % 4);
        for (var j = 1; j < n; j++) {
          sh(s, 'line', { x1: x + (w / n) * j, y1: y, x2: x + (w / n) * j, y2: y + h,
            stroke: ink, 'stroke-width': .4, 'stroke-opacity': .42 });
        }
        sh(s, 'line', { x1: x, y1: y + h * .62, x2: x + w, y2: y + h * .62,
          stroke: ink, 'stroke-width': .4, 'stroke-opacity': .42 });
      }
    });
    [32, 62].forEach(function (v) {
      sh(s, 'line', { x1: v + 2, y1: 4, x2: v + 2, y2: 96, stroke: ink, 'stroke-width': .5, 'stroke-opacity': .35, 'stroke-dasharray': '3 3' });
      sh(s, 'line', { x1: 4, y1: v + 2, x2: 96, y2: v + 2, stroke: ink, 'stroke-width': .5, 'stroke-opacity': .35, 'stroke-dasharray': '3 3' });
    });
    return s;
  }

  /* 盤面 ── アクワイア */
  function figGrid() {
    var s = svg(100, 100), ink = 'currentColor';
    var cols = 12, rows = 9, pad = 6;
    var cw = (100 - pad * 2) / cols, ch = (100 - pad * 2 - 8) / rows;
    var A = ['2,2','3,2','3,3','4,3','4,2','5,2'], B = ['7,5','8,5','8,6','9,6','7,6'];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var key = c + ',' + r, inA = A.indexOf(key) >= 0, inB = B.indexOf(key) >= 0;
      sh(s, 'rect', {
        x: pad + c * cw + .5, y: pad + 4 + r * ch + .5,
        width: cw - 1.4, height: ch - 1.4,
        fill: (inA || inB) ? ink : 'none',
        'fill-opacity': inA ? .6 : (inB ? .32 : 0),
        stroke: ink, 'stroke-width': .35, 'stroke-opacity': (inA || inB) ? .72 : .34
      });
    }
    return s;
  }

  /* 競り札 ── ハイソサエティ */
  function figCards() {
    var s = svg(100, 100), ink = 'currentColor';
    [{ x:12,y:26,rot:-8,op:.06 }, { x:26,y:20,rot:-1,op:.10 }, { x:40,y:25,rot:7,op:.16 }]
    .forEach(function (d, i) {
      var g = sh(s, 'g', { transform: 'rotate(' + d.rot + ' ' + (d.x + 24) + ' ' + (d.y + 26) + ')' });
      sh(g, 'rect', { x: d.x, y: d.y, width: 34, height: 48, rx: 2,
        fill: ink, 'fill-opacity': d.op, stroke: ink, 'stroke-width': .7, 'stroke-opacity': .72 });
      sh(g, 'rect', { x: d.x + 4, y: d.y + 4, width: 26, height: 40, rx: 1,
        fill: 'none', stroke: ink, 'stroke-width': .4, 'stroke-opacity': .42 });
      if (i === 2) [[0,0],[1,0],[0,1],[1,1],[.5,.5]].forEach(function (p) {
        sh(g, 'circle', { cx: d.x + 12 + p[0] * 11, cy: d.y + 16 + p[1] * 11, r: 1.9, fill: ink, 'fill-opacity': .45 });
      });
    });
    return s;
  }

  /* ロンデル ── インペリアル */
  function figRondel() {
    var s = svg(100, 100), ink = 'currentColor';
    var cx = 50, cy = 50, R = 40, r = 13, n = 8;
    var pt = function (rad, ang) { return [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)]; };
    /* 8つの扇形。時計回りに一周する */
    for (var i = 0; i < n; i++) {
      var a0 = (i * 360 / n - 90 - 180 / n) * Math.PI / 180;
      var a1 = ((i + 1) * 360 / n - 90 - 180 / n) * Math.PI / 180;
      var o0 = pt(R, a0), o1 = pt(R, a1), i1 = pt(r, a1), i0 = pt(r, a0);
      sh(s, 'path', {
        d: 'M' + o0[0].toFixed(2) + ' ' + o0[1].toFixed(2) +
           ' A' + R + ' ' + R + ' 0 0 1 ' + o1[0].toFixed(2) + ' ' + o1[1].toFixed(2) +
           ' L' + i1[0].toFixed(2) + ' ' + i1[1].toFixed(2) +
           ' A' + r + ' ' + r + ' 0 0 0 ' + i0[0].toFixed(2) + ' ' + i0[1].toFixed(2) + ' Z',
        fill: ink, 'fill-opacity': (i % 2 ? .05 : .12),
        stroke: ink, 'stroke-width': .55, 'stroke-opacity': .7
      });
    }
    sh(s, 'circle', { cx: cx, cy: cy, r: r, fill: 'none', stroke: ink, 'stroke-width': .7, 'stroke-opacity': .75 });
    /* 国のマーカー。3国が別々のマスに止まっている */
    [[1, 27], [3, 33], [6, 30]].forEach(function (d) {
      var ang = (d[0] * 360 / n - 90) * Math.PI / 180;
      var c = pt(d[1], ang);
      sh(s, 'rect', {
        x: c[0] - 3.4, y: c[1] - 3.4, width: 6.8, height: 6.8, rx: 1,
        fill: ink, 'fill-opacity': .55, stroke: ink, 'stroke-width': .5, 'stroke-opacity': .8
      });
    });
    /* 進む向き（時計回り）を示す破線 */
    sh(s, 'path', {
      d: 'M' + (cx + 46) + ' ' + (cy - 6) + ' A46 46 0 0 1 ' + (cx + 41) + ' ' + (cy + 16),
      fill: 'none', stroke: ink, 'stroke-width': .5, 'stroke-opacity': .4, 'stroke-dasharray': '3 3'
    });
    return s;
  }

  /* 火星の区画図 ── ミッション・レッドプラネット */
  function figMars() {
    var s = svg(100, 100), ink = 'currentColor';
    var cx = 48, cy = 54, R = 40, r = 17, n = 7;
    var pt = function (rad, ang) { return [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)]; };
    /* 外周7エリア */
    for (var i = 0; i < n; i++) {
      var a0 = (i * 360 / n - 90 - 180 / n) * Math.PI / 180;
      var a1 = ((i + 1) * 360 / n - 90 - 180 / n) * Math.PI / 180;
      var o0 = pt(R, a0), o1 = pt(R, a1), i1 = pt(r, a1), i0 = pt(r, a0);
      sh(s, 'path', {
        d: 'M' + o0[0].toFixed(2) + ' ' + o0[1].toFixed(2) +
           ' A' + R + ' ' + R + ' 0 0 1 ' + o1[0].toFixed(2) + ' ' + o1[1].toFixed(2) +
           ' L' + i1[0].toFixed(2) + ' ' + i1[1].toFixed(2) +
           ' A' + r + ' ' + r + ' 0 0 0 ' + i0[0].toFixed(2) + ' ' + i0[1].toFixed(2) + ' Z',
        fill: ink, 'fill-opacity': (i % 2 ? .05 : .11),
        stroke: ink, 'stroke-width': .55, 'stroke-opacity': .7
      });
    }
    /* 中央2エリア。水平線で上下に割れている */
    sh(s, 'path', {
      d: 'M' + (cx - r) + ' ' + cy + ' A' + r + ' ' + r + ' 0 0 1 ' + (cx + r) + ' ' + cy + ' Z',
      fill: ink, 'fill-opacity': .17, stroke: ink, 'stroke-width': .55, 'stroke-opacity': .75
    });
    sh(s, 'path', {
      d: 'M' + (cx + r) + ' ' + cy + ' A' + r + ' ' + r + ' 0 0 1 ' + (cx - r) + ' ' + cy + ' Z',
      fill: ink, 'fill-opacity': .09, stroke: ink, 'stroke-width': .55, 'stroke-opacity': .75
    });
    /* 着陸した宇宙飛行士。多数派を争っている区画にだけ置く */
    [[28, 30], [33, 30], [62, 33], [67, 33], [71.5, 33], [45.5, 44], [50.5, 44]]
      .forEach(function (p) {
        sh(s, 'circle', { cx: p[0], cy: p[1], r: 2, fill: ink, 'fill-opacity': .55 });
      });
    /* 衛星フォボス。どのエリアにも隣接しない */
    sh(s, 'circle', {
      cx: 88, cy: 12, r: 8,
      fill: ink, 'fill-opacity': .1, stroke: ink, 'stroke-width': .5, 'stroke-opacity': .6
    });
    sh(s, 'circle', { cx: 88, cy: 12, r: 2, fill: ink, 'fill-opacity': .5 });
    return s;
  }

  var FIGS = {
    blocks: figBlocks, grid: figGrid, cards: figCards, rondel: figRondel, mars: figMars
  };

  /* ------------------------------------------------------------ BGG */
  /* 他人が付けた数字。こちらの実測とは別物なので、色も置き場所も分ける。
     data/bgg.js が無い、あるいはその作品の項が無ければ、黙って何も出さない。 */
  function bggRow(w) {
    var all = PB.BGG;
    if (!all || !all.games) return null;
    var g = all.games[w.id];
    if (!g || (g.weight == null && g.rating == null)) return null;

    var box = el('div', 'bgg');
    box.appendChild(el('span', 'bgg__k', 'BGG'));

    function meter(label, v, max) {
      if (v == null) return;
      var unit = el('div', 'bgg__m');
      unit.appendChild(el('span', 'bgg__ml', label));
      var track = el('div', 'bgg__t');
      var bar = el('div', 'bgg__b');
      bar.style.width = (v / max * 100) + '%';
      track.appendChild(bar);
      unit.appendChild(track);
      unit.appendChild(el('span', 'bgg__v num', v.toFixed(2) + ' / ' + max));
      box.appendChild(unit);
    }
    meter(lang === 'en' ? 'Weight' : '重さ', g.weight, 5);
    meter(lang === 'en' ? 'Rating' : '評価', g.rating, 10);

    var tail = el('div', 'bgg__tail');
    if (g.ratings) {
      tail.appendChild(el('span', 'bgg__n num',
        g.ratings.toLocaleString(lang === 'en' ? 'en' : 'ja') +
        (lang === 'en' ? ' ratings' : '人が評価')));
    }
    var a = el('a', 'bgg__a', (lang === 'en' ? 'on BGG' : 'BGG で見る') + ' \u2197');
    a.href = 'https://boardgamegeek.com/boardgame/' + g.id;
    a.rel = 'noopener';
    a.target = '_blank';
    tail.appendChild(a);
    if (all.fetchedAt) {
      tail.appendChild(el('span', 'bgg__d num',
        (lang === 'en' ? 'as of ' : '') + all.fetchedAt + (lang === 'en' ? '' : ' 時点')));
    }
    box.appendChild(tail);
    return box;
  }

  /* アバター。ハンドル名から決まる、左右対称の升目模様 */
  /* ------------------------------------------------------- 実測プレート */
  function buildPlate(p) {
    var fig = el('figure', 'plate');

    var cap = el('figcaption', 'cell__k');
    cap.appendChild(el('span', 'tag tag--ink', t('plate') + ' ── ' + pick(p, 'caption')));
    cap.appendChild(el('span', 'plate__note', pick(p, 'note')));
    fig.appendChild(cap);

    var baseV = p.baseline == null ? .25 : p.baseline;
    var scale = el('div', 'scale');
    scale.style.setProperty('--base', baseV);

    p.rows.forEach(function (r) {
      var row = el('div', 'srow' + (r.lead ? ' srow--lead' : ''));
      row.appendChild(el('div', 'srow__l', pick(r, 'label')));
      var track = el('div', 'srow__track');
      var bar = el('div', 'srow__bar');
      bar.style.setProperty('--v', r.v);
      track.appendChild(bar);

      /* 信頼区間があれば棒の先にひげを立てる。
         その棒がどれだけ揺れうるかは、値そのものと同じだけ意味がある。 */
      if (r.ci) {
        var lo = Math.max(0, r.v - r.ci), hi = Math.min(1, r.v + r.ci);
        var err = el('div', 'srow__err');
        err.style.left = lo * 100 + '%';
        err.style.width = (hi - lo) * 100 + '%';
        err.title = fmt(r.v) + ' \u00b1' + fmt(r.ci);
        track.appendChild(err);
      }
      row.appendChild(track);

      var val = el('div', 'srow__v', fmt(r.v));
      if (r.ci) val.appendChild(el('span', 'srow__ci', '\u00b1' + fmt(r.ci)));
      row.appendChild(val);
      scale.appendChild(row);
    });

    var axis = el('div', 'axis');
    var at = el('div', 'axis__t');
    [
      { at: 0, label: '0', cls: '' },
      { at: baseV * 100, label: t('parity') + ' ' + fmt(baseV), cls: ' axis__tick--base' },
      { at: 100, label: '1.000', cls: ' axis__tick--end' }
    ].forEach(function (k) {
      var tick = el('span', 'axis__tick' + k.cls, k.label);
      tick.style.left = k.at + '%';
      at.appendChild(tick);
    });
    axis.appendChild(at);
    scale.appendChild(axis);
    scale.appendChild(el('div', 'scale__base'));

    fig.appendChild(scale);
    return fig;
  }

  /* 一行版。カードの表に出す「相手の強さ」 */
  function strengthChip(w) {
    var p = w.plate, baseV = p.baseline == null ? .25 : p.baseline;
    var row = null;
    p.rows.forEach(function (r) { if (r.lead && !row) row = r; });
    if (!row) row = p.rows[0];

    var chip = el('div', 'chip');
    chip.appendChild(el('span', 'chip__k', t('strength')));

    var track = el('div', 'chip__track');
    track.style.setProperty('--base', baseV * 100 + '%');
    var bar = el('div', 'chip__bar');
    bar.style.setProperty('--v', row.v);
    track.appendChild(bar);
    chip.appendChild(track);

    chip.appendChild(el('span', 'chip__v num', fmt(row.v)));
    chip.appendChild(el('span', 'chip__n', pick(row, 'label')));
    return chip;
  }

  /* --------------------------------------------------------------- ゲーム */
  function buildGame(w) {
    var art = el('article', 'game');
    art.id = w.id;

    /* ── 表：遊ぶための情報だけ ── */
    var top = el('div', 'game__top');

    var figWrap = el('div', 'game__fig');
    var s = (FIGS[w.figure] || figGrid)();
    s.setAttribute('aria-label', pick(w, 'title'));
    figWrap.appendChild(s);
    top.appendChild(figWrap);

    var head = el('div', 'game__head');

    head.appendChild(el('h3', 'game__title', pick(w, 'title')));

    var meta = el('p', 'game__meta');
    [pick(w, 'players'), pick(w, 'genre'), pick(w, 'designer')].forEach(function (m, i) {
      if (i) meta.appendChild(el('span', 'game__dot', '·'));
      meta.appendChild(el('span', null, m));
    });
    head.appendChild(meta);

    head.appendChild(el('p', 'game__hook', pick(w, 'hook')));
    var bgg = bggRow(w);
    if (bgg) head.appendChild(bgg);
    head.appendChild(strengthChip(w));

    var acts = el('div', 'game__acts');
    if (w.play) {
      var a = el('a', 'btn btn--go', '▶ ' + t('play'));
      a.href = w.play;
      acts.appendChild(a);
    } else {
      var off = el('span', 'btn btn--off', t('soon'));
      off.title = pick(w, 'playNote') || '';
      acts.appendChild(off);
    }
    var rp = el('a', 'btn', t('repo'));
    rp.href = w.repo; rp.rel = 'noopener';
    acts.appendChild(rp);

    var opp = el('span', 'game__opp');
    opp.appendChild(el('b', null, t('opponent')));
    opp.appendChild(el('span', null, pick(w, 'opponents')));
    acts.appendChild(opp);

    head.appendChild(acts);
    top.appendChild(head);
    art.appendChild(top);

    /* ── 裏：作りの話。畳んでおく ── */
    var det = el('details', 'game__more');
    var sum = el('summary', 'game__sum', t('detail'));
    det.appendChild(sum);

    var body = el('div', 'game__body cells');
    var c1 = el('div', 'cell');
    c1.appendChild(el('h4', 'cell__t', pick(w, 'method')));
    c1.appendChild(el('p', 'cell__p', pick(w, 'methodBody')));
    if (w.remark) {
      var rm = el('p', 'cell__p cell__p--rm');
      rm.appendChild(el('b', null, t('remark') + '　'));
      rm.appendChild(el('span', null, pick(w, 'remark')));
      c1.appendChild(rm);
    }
    body.appendChild(c1);

    var c2 = el('div', 'cell');
    c2.appendChild(buildPlate(w.plate));
    body.appendChild(c2);

    det.appendChild(body);
    det.addEventListener('toggle', function () {
      if (det.open) watchPlates(det);
    });
    art.appendChild(det);

    return art;
  }

  /* ----------------------------------------------------------- ランキング */
  function buildRanking() {
    var host = document.getElementById('ranking-panel');
    if (!host) return;
    host.textContent = '';

    var box = el('div', 'rank');
    var head = el('div', 'rank__row rank__row--head');
    [
      lang === 'en' ? '#' : '順',
      lang === 'en' ? 'Agent' : 'エージェント',
      lang === 'en' ? 'Owner' : '作者',
      lang === 'en' ? 'Game' : 'ゲーム',
      lang === 'en' ? 'Rating' : 'レート',
      lang === 'en' ? 'Games' : '対戦数'
    ].forEach(function (h) { head.appendChild(el('span', null, h)); });
    box.appendChild(head);

    var empty = el('div', 'rank__empty');
    empty.appendChild(el('p', null, t('noRank')));
    box.appendChild(empty);
    host.appendChild(box);

    host.appendChild(buildWire());
  }

  function buildWire() {
    var box = el('div', 'wire');
    var s = svg(640, 132);
    s.setAttribute('aria-label', lang === 'en'
      ? 'Agents arrive as pull requests, run in CI, and results are committed back as JSON.'
      : 'エージェントはPRで届き、CIで対戦し、結果はJSONとしてコミットされる。');
    var ink = 'currentColor';
    var boxes = lang === 'en'
      ? ['Agent (JS)', 'Pull request', 'GitHub Actions\nseeded matches', 'results.json\ncommitted', 'This page']
      : ['エージェント\n(JS 1ファイル)', 'Pull Request', 'GitHub Actions\nシード固定で対戦', 'results.json\nをコミット', 'このページ'];

    var w = 108, h = 54, gap = 25, y = 22;
    boxes.forEach(function (label, i) {
      var x = i * (w + gap) + 6, accent = (i === 2);
      sh(s, 'rect', { x: x, y: y, width: w, height: h,
        fill: ink, 'fill-opacity': accent ? .07 : .03,
        stroke: ink, 'stroke-width': accent ? 1.1 : .8, 'stroke-opacity': accent ? .7 : .45 });
      label.split('\n').forEach(function (line, li, arr) {
        var tx = sh(s, 'text', {
          x: x + w / 2, y: y + h / 2 + (li - (arr.length - 1) / 2) * 13 + 4,
          'text-anchor': 'middle', fill: ink,
          'font-size': arr.length > 1 ? 10 : 11, 'fill-opacity': li === 0 ? .85 : .6 });
        tx.textContent = line;
      });
      if (i < boxes.length - 1) {
        var ax = x + w + 4;
        sh(s, 'line', { x1: ax, y1: y + h / 2, x2: ax + gap - 8, y2: y + h / 2, stroke: ink, 'stroke-width': .8, 'stroke-opacity': .5 });
        sh(s, 'path', { d: 'M' + (ax + gap - 8) + ' ' + (y + h / 2) + ' l-4 -3 v6 z', fill: ink, 'fill-opacity': .5 });
      }
    });
    var cap = sh(s, 'text', { x: 6, y: 116, fill: ink, 'font-size': 10, 'fill-opacity': .55 });
    cap.textContent = lang === 'en'
      ? 'No server. Every row can be reproduced from its seed and its run log.'
      : 'サーバーを持たない。順位表のどの行も、シードと実行ログから再現できる。';
    box.appendChild(s);
    return box;
  }

  /* ------------------------------------------- 計測しているかどうか（奥付）
     方針は index.html に書いてある。ここに出すのは「いまこの端末で
     実際に計測しているか」と、その場で止める手段。書いてあることと
     していることが食い違わないよう、状態から文言を作る。 */
  function buildPrivacyState() {
    var host = document.getElementById('privacy-state');
    var a = PB.analytics;
    if (!host || !a) return;

    var st = a.state();
    host.textContent = '';
    host.className = 'pstate' + (st === 'on' ? ' pstate--on' : '');

    var dot = el('span', 'pstate__d');
    dot.setAttribute('aria-hidden', 'true');
    host.appendChild(dot);
    host.appendChild(el('span', null,
      st === 'on' ? t('measOn')
        : st === 'off' ? t('measOff')
        : st === 'dnt' ? t('measDnt')
        : t('measUnset')));

    if (st === 'unset') return;        // 押せる意味がない

    var b = el('button', 'lnk',
      st === 'on' ? t('measStop') : st === 'dnt' ? t('measAnyway') : t('measAllow'));
    b.type = 'button';
    b.addEventListener('click', function () {
      a.set(st !== 'on');
      buildPrivacyState();
    });
    host.appendChild(b);
  }

  /* ------------------------------------------------------------- 棒の伸び */
  var io = null;
  function watchPlates(root) {
    var nodes = root.querySelectorAll('.scale:not(.is-read)');
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(nodes, function (n) { n.classList.add('is-read'); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-read'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: .15 });
    }
    Array.prototype.forEach.call(nodes, function (n) { io.observe(n); });
  }

  /* ═══════════════════════════════════════════════════ 全ページ共通の天地
     5ページあるので、天と地は HTML に写さず、ここから組む。
     文言を直す場所が1つで済む。 */
  var PAGES = [
    { file: 'index.html',     ja: '自己紹介',         en: 'About' },
    { file: 'games.html',     ja: 'ボードゲーム',     en: 'Board games' },
    { file: 'macro.html',     ja: '経済',             en: 'Economy' },
    { file: 'sentiment.html', ja: '市場センチメント', en: 'Market sentiment' }
  ];
  function here() {
    var f = (location.pathname.split('/').pop() || '').split('?')[0];
    return f === '' ? 'index.html' : f;
  }
  function who() {
    var p = PB.PROFILE && PB.PROFILE.name;
    return (p && p.fill && pick2(p)) || '';   // 名乗りが無ければ、何も出さない
  }
  /* {fill, ja, en} を言語で選ぶ。埋まっていなければ null */
  function pick2(o) {
    if (!o || !o.fill) return null;
    var v = (lang === 'en' && o.en) ? o.en : o.ja;
    return v || null;
  }

  function buildHead() {
    var host = document.getElementById('head');
    if (!host) return;
    host.textContent = '';
    var box = el('div', 'sheet masthead__in');

    /* 3枚の見出し。図面の袋に挿す索引タブのつもりで、いま開いている1枚だけ
       地の色を持たせ、天井に朱の線を引く。 */
    var nav = el('nav', 'masthead__nav');
    nav.setAttribute('aria-label', lang === 'en' ? 'Sections' : 'ページ');
    var cur = here();
    PAGES.forEach(function (p) {
      var a = el('a', p.file === cur ? 'is-here' : null, lang === 'en' ? p.en : p.ja);
      a.href = p.file;
      if (p.file === cur) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    });
    box.appendChild(nav);

    var tools = el('div', 'masthead__tools');
    var lb = el('button', 'ctl'); lb.type = 'button'; lb.id = 'lang';
    var tb = el('button', 'ctl'); tb.type = 'button'; tb.id = 'theme';
    tools.appendChild(lb);
    tools.appendChild(tb);
    box.appendChild(tools);
    host.appendChild(box);
  }

  function buildFoot() {
    var host = document.getElementById('foot');
    if (!host) return;
    host.textContent = '';
    var en = lang === 'en';

    function col(title, paras) {
      var d = el('div');
      d.appendChild(el('p', 'colophon__t', title));
      paras.forEach(function (p) { d.appendChild(p); });
      return d;
    }

    
    host.appendChild(col(en ? 'Rights' : '権利について', [
      el('p', null, en
        ? 'High Society is a game by Reiner Knizia; Acquire by Sid Sackson. The implementations here are unofficial fan work made for study, containing no trademarks and no original artwork.'
        : 'High Society はライナー・クニツィア、Acquire はシド・サクソンによるゲームです。'
          + 'ここの実装はいずれも学習目的の非公式なファンメイドで、'
          + '商標もアートワークも含みません。'),
      el('p', null, en
        ? 'Macro figures come from Alpha Vantage; the market-sentiment page reads news articles '
          + 'via APITube and scores them itself. Nothing here is investment advice.'
        : '経済指標の数字は Alpha Vantage、市場センチメントの記事は APITube から取り、'
          + 'スコアはこちらで付けています。いずれも投資助言ではありません。')
    ]));

  }

  /* トップ（＝自己紹介）の名乗りと、その下の写真。
     中身は buildProfile が組む */
  function buildHello() {
    var n = document.getElementById('hello-name');
    if (n) n.textContent = who();

    var host = document.getElementById('hello-photo');
    if (!host) return;
    host.textContent = '';
    var p = PB.PROFILE && PB.PROFILE.photo;
    if (!p || !p.fill || !p.src) return;

    var fig = el('figure', 'shot');
    var img = document.createElement('img');
    img.className = 'shot__i';
    img.src = p.src;
    img.alt = pick(p, 'alt') || '';
    /* 先に寸法を渡しておく。無いと、読み終わった瞬間に下の文章が飛ぶ */
    if (p.w) img.width = p.w;
    if (p.h) img.height = p.h;
    img.loading = 'lazy';
    img.decoding = 'async';
    fig.appendChild(img);

    var cap = pick(p, 'cap');
    if (cap) fig.appendChild(el('figcaption', 'shot__c', cap));
    host.appendChild(fig);
  }

  /* ═══════════════════════════════════════════════════ 自己紹介・職務経歴 */
  function notYet() {
    return el('p', 'blank', lang === 'en'
      ? 'Not written yet. It lives in data/profile.js.'
      : 'まだ書いていません。中身は data/profile.js にあります。');
  }

  function buildProfile() {
    var pr = PB.PROFILE;
    var intro = document.getElementById('profile-intro');
    if (!intro || !pr) return;

    /* ---- 自己紹介 */
    intro.textContent = '';
    var line = pick2(pr.tagline);
    if (line) intro.appendChild(el('p', 'hello__tag', line));
    var paras = (pr.intro && pr.intro.fill)
      ? ((lang === 'en' && pr.intro.en && pr.intro.en.length) ? pr.intro.en : pr.intro.ja)
      : null;
    if (paras && paras.length) paras.forEach(function (s) { intro.appendChild(el('p', 'lead', s)); });
    else intro.appendChild(notYet());

    /* url の入っていない行は出さない。押せないリンクは置かない */
    if (pr.links && pr.links.fill) {
      var live = pr.links.rows.filter(function (r) { return r.url; });
      if (live.length) {
        var ul = el('div', 'links');
        live.forEach(function (r) {
          var a = el('a', 'links__a', r.label);
          a.href = r.url; a.rel = 'noopener';
          ul.appendChild(a);
        });
        intro.appendChild(ul);
      }
    }

    /* ---- 職務経歴 */
    var car = document.getElementById('profile-career');
    car.textContent = '';
    if (pr.career && pr.career.fill && pr.career.rows.length) {
      var list = el('div', 'cv');
      pr.career.rows.forEach(function (r) {
        var row = el('div', 'cv__row');
        var when = el('div', 'cv__when');
        when.appendChild(el('span', 'num', r.from));
        when.appendChild(el('span', 'cv__dash', '─'));
        when.appendChild(el('span', 'num', r.to || (lang === 'en' ? 'now' : '現在')));
        row.appendChild(when);
        var body = el('div', 'cv__body');
        body.appendChild(el('h3', 'cv__org', pick(r, 'org')));
        if (r.role) body.appendChild(el('p', 'cv__role', pick(r, 'role')));
        if (r.body) body.appendChild(el('p', 'cv__b', pick(r, 'body')));
        row.appendChild(body);
        list.appendChild(row);
      });
      car.appendChild(list);
    } else car.appendChild(notYet());

    /* ---- 研究業績 */
    var rs = document.getElementById('profile-research');
    if (!rs) return;
    rs.textContent = '';
    if (pr.research && pr.research.fill && pr.research.groups.length) {
      pr.research.groups.forEach(function (grp) {
        var g = el('section', 'rsc');
        g.appendChild(el('h3', 'rsc__gt', pick(grp, 'label')));
        grp.rows.forEach(function (r) {
          var row = el('div', 'rsc__row');

          var k = el('div', 'rsc__k');
          k.appendChild(el('span', 'tag tag--ink', pick(r, 'kind')));
          row.appendChild(k);

          var b = el('div', 'rsc__b');
          /* url があるときだけリンクにする。無いものは文字のまま置く */
          if (r.url) {
            var a = el('a', 'rsc__t rsc__t--go', pick(r, 'title'));
            a.href = r.url; a.rel = 'noopener';
            b.appendChild(a);
          } else {
            b.appendChild(el('p', 'rsc__t', pick(r, 'title')));
          }
          var note = pick(r, 'note');
          if (note) b.appendChild(el('p', 'rsc__n', note));
          row.appendChild(b);

          g.appendChild(row);
        });
        rs.appendChild(g);
      });
    } else rs.appendChild(notYet());
  }


  /* ═════════════════════════════════════════════════════ マクロ経済指標 */
  /* 月次の系列を折れ線で。外部ライブラリは使わず、その場で SVG を作る。 */
  function sparkline(series, unit) {
    var v = series.v.filter(function (x) { return x != null; });
    if (v.length < 2) return null;

    var W = 640, H = 150, PADL = 34, PADR = 44, PADB = 18, PADT = 8;
    var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
    if (hi === lo) { hi += 1; lo -= 1; }
    var pad = (hi - lo) * .08; hi += pad; lo -= pad;

    var n = series.v.length;
    var x = function (i) { return PADL + (W - PADL - PADR) * (n === 1 ? 0 : i / (n - 1)); };
    var y = function (val) { return PADT + (H - PADT - PADB) * (1 - (val - lo) / (hi - lo)); };

    var s = svg(W, H), ink = 'currentColor';
    s.setAttribute('class', 'spark');

    /* 目盛は上下2本だけ。図面の罫のつもりで薄く */
    [hi - pad, lo + pad].forEach(function (val) {
      sh(s, 'line', { x1: PADL, y1: y(val), x2: W - PADR, y2: y(val),
        stroke: ink, 'stroke-width': .5, 'stroke-opacity': .25, 'stroke-dasharray': '3 3' });
      var tx = sh(s, 'text', { x: PADL - 5, y: y(val) + 3.5, 'text-anchor': 'end',
        fill: ink, 'font-size': 9, 'fill-opacity': .55 });
      tx.textContent = val.toFixed(1);
    });

    var d = '', started = false;
    series.v.forEach(function (val, i) {
      if (val == null) { started = false; return; }      // 欠測はつながない
      d += (started ? ' L' : ' M') + x(i).toFixed(1) + ' ' + y(val).toFixed(1);
      started = true;
    });
    sh(s, 'path', { d: d.trim(), fill: 'none', stroke: ink, 'stroke-width': 1.2,
      'stroke-opacity': .75, 'stroke-linejoin': 'round' });

    /* 直近の値を朱で置く。ここだけが「いまの数字」 */
    var lastI = -1;
    for (var i = series.v.length - 1; i >= 0; i--) if (series.v[i] != null) { lastI = i; break; }
    if (lastI >= 0) {
      var lv = series.v[lastI];
      sh(s, 'circle', { cx: x(lastI), cy: y(lv), r: 2.6, fill: 'var(--vermilion)' });
      var lab = sh(s, 'text', { x: Math.min(x(lastI) + 6, W - 4), y: y(lv) + 3.5,
        fill: 'var(--vermilion)', 'font-size': 11, 'font-weight': 600 });
      lab.textContent = lv.toFixed(2) + (unit || '');
    }

    /* 横軸は端の年だけ。細かい目盛は要らない */
    [[0, series.from], [n - 1, monthAt(series.from, n - 1)]].forEach(function (p, k) {
      var tx = sh(s, 'text', { x: k === 0 ? PADL : W - PADR, y: H - 4,
        'text-anchor': k === 0 ? 'start' : 'end', fill: ink, 'font-size': 9, 'fill-opacity': .55 });
      tx.textContent = p[1];
    });
    return s;
  }

  function monthAt(from, k) {
    var a = from.split('-'), m = (+a[1] - 1) + k;
    return (+a[0] + Math.floor(m / 12)) + '-' + String(m % 12 + 1).padStart(2, '0');
  }

  /* 見ている人の「今日」。UTC ではなく手元の暦で取る。
     公表日は YYYY-MM-DD なので、同じ形にして文字列のまま比べられる。 */
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }

  /* その指標の「次の公表」。data/releases.js に入っている予定のうち、
     今日以降で最初の1件。過ぎたものは自動的に飛ばされるので、
     予定が残っているかぎり、日付が変わるだけで次に繰り上がる。
     見つからなければ null（＝予定が尽きている）。 */
  function nextRelease(ind, now) {
    if (!ind.release || ind.release.daily) return null;
    var rows = (PB.RELEASES && PB.RELEASES.byId && PB.RELEASES.byId[ind.id]) || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].on >= now) return rows[i];
    }
    return null;
  }

  /* 次回公表の近さを返す（1 がいちばん近い）。
     ─ 日次で出るもの（daily）は持たない。「次の1日」が無いので。
     ─ 予定が尽きているものも持たない。無いものは無いと出す。

     濃さは日数の差ではなく順位で決める。公表が固まる月半ばでも、
     間があく月末でも、同じ幅で読めるように。
     順位は日付ごとに振る。同じ日に出るものは同じ濃さにしたい。
     いちばん遠いものも薄く残す。0 にすると、上の2つ（対象外）と
     見分けがつかなくなるので。 */
  var HEAT_FAINT = .15;

  function releaseHeat(inds) {
    var now = today();
    var next = {}, days = [];

    inds.forEach(function (ind) {
      var r = nextRelease(ind, now);
      if (!r) return;
      next[ind.id] = r;
      if (days.indexOf(r.on) < 0) days.push(r.on);
    });
    days.sort();

    var heat = {};
    Object.keys(next).forEach(function (id) {
      var k = days.indexOf(next[id].on);
      var far = days.length < 2 ? 0 : k / (days.length - 1);   /* 0=近い 1=遠い */
      heat[id] = 1 - far * (1 - HEAT_FAINT);
    });
    return { heat: heat, next: next, now: now, first: days[0] || '', days: days.length };
  }

  /* 一覧表。下のカードと同じ中身だが、横に並べたほうが一望できる。
     何を見ているか・どこが出しているか・いつ出るか、を1行で。 */
  function buildMacroTable() {
    var host = document.getElementById('macro-table');
    if (!host || !PB.INDICATORS) return;
    host.textContent = '';
    var en = lang === 'en';
    var M = PB.MACRO || { series: {} };

    var tbl = el('table', 'grid');
    var head = el('tr');
    [en ? 'Indicator' : '項目', en ? 'Published by' : '出典元',
     en ? 'Source' : 'リンク', en ? 'Latest data' : '直近データ',
     en ? 'Next release' : '次回公表'].forEach(function (h) {
      head.appendChild(el('th', null, h));
    });
    var thead = el('thead'); thead.appendChild(head); tbl.appendChild(thead);

    var hot = releaseHeat(PB.INDICATORS);

    var body = el('tbody');
    PB.INDICATORS.forEach(function (ind) {
      var tr = el('tr');

      /* 項目 ── 下のカードへ飛ばす */
      var name = el('td', 'grid__n');
      var jump = el('a', null, pick(ind, 'title'));
      jump.href = '#g-' + ind.id;
      name.appendChild(jump);
      tr.appendChild(name);

      tr.appendChild(el('td', 'grid__by', pick(ind, 'by')));

      /* リンク ── 1本目だけ表に出す。残りはカードに全部ある */
      var link = el('td');
      if (ind.sources && ind.sources.length) {
        var s0 = ind.sources[0];
        var a = el('a', 'grid__a', pick(s0, 'label'));
        a.href = s0.url; a.rel = 'noopener'; a.target = '_blank';
        if (s0.pdf) a.appendChild(el('span', 'srcs__pdf', 'PDF'));
        link.appendChild(a);
        if (ind.sources.length > 1) {
          link.appendChild(el('span', 'grid__more',
            en ? '+' + (ind.sources.length - 1) : '他' + (ind.sources.length - 1)));
        }
      }
      tr.appendChild(link);

      /* 直近データ ── 系列を持っているものだけ。持たないものは「—」 */
      var ser = M.series && M.series[ind.id];
      var val = el('td', 'grid__v num');
      if (ser && ser.v.length) {
        var lastI = ser.v.length - 1;
        while (lastI >= 0 && ser.v[lastI] == null) lastI--;
        if (lastI >= 0) {
          val.appendChild(el('span', 'grid__num',
            ser.v[lastI].toFixed(2) + (ind.unit || '')));
          val.appendChild(el('span', 'grid__when', monthAt(ser.from, lastI)));
        }
      } else {
        val.appendChild(el('span', 'grid__dash', '—'));
      }
      tr.appendChild(val);

      /* 次回公表。近いものほど地を濃くする。濃さは CSS 変数で渡して、
         色そのものは CSS 側（＝テーマ）に決めさせる。 */
      var r = ind.release || {};
      var nx = hot.next[ind.id];
      var when = el('td', 'grid__r');
      var h = hot.heat[ind.id];
      if (h != null) {
        when.style.setProperty('--heat', h.toFixed(3));
        /* 同じ日に出るものが複数あれば、その全部に印を付ける */
        if (nx.on === hot.first) when.classList.add('is-next');
      }

      if (r.daily) {
        when.appendChild(el('span', 'grid__date num', pick(r, 'note') || (en ? 'daily' : '毎営業日')));
      } else if (nx) {
        when.appendChild(el('span', 'grid__date num', nx.on));
        if (nx.note) when.appendChild(el('span', 'grid__when', nx.note));
      } else {
        /* 予定が尽きている。無いものは無いと書く。空欄や古い日付でごまかさない */
        when.classList.add('is-dry');
        when.appendChild(el('span', 'grid__date', en ? 'not fetched' : '予定なし'));
        when.appendChild(el('span', 'grid__when', en
          ? 'nothing left in the calendar' : 'カレンダーに先の予定がありません'));
      }
      tr.appendChild(when);

      body.appendChild(tr);
    });
    tbl.appendChild(body);

    var wrap = el('div', 'grid__wrap');
    wrap.appendChild(tbl);
    host.appendChild(wrap);

    /* 脚注。書いてあることが実際と合っている状態を保つ。
       予定が尽きかけているときは、そう言う。黙って色が消えるのがいちばん困る。 */
    var R = PB.RELEASES || {};
    var foot = el('p', 'grid__foot', en
      ? 'Release dates come from my own calendar, read again every day. Last read '
        + (R.asOf || '?') + '.'
      : '公表予定は自分のカレンダーから毎日読み直しています（最後に読んだのは '
        + (R.asOf || '?') + '）。');
    host.appendChild(foot);

    var dry = PB.INDICATORS.filter(function (i) {
      return !(i.release && i.release.daily) && !hot.next[i.id];
    }).length;
    if (dry) {
      host.appendChild(el('p', 'grid__warn', en
        ? dry + ' of these have no future date left in the calendar. '
          + 'Add the next ones there, or the ordering above goes blank.'
        : 'このうち ' + dry + ' 件は、カレンダーに先の予定が残っていません。'
          + 'カレンダー側に足さないと、上の色の順序が出せなくなります。'));
    }
  }

  function buildMacro() {
    var host = document.getElementById('macro');
    if (!host || !PB.INDICATORS) return;
    host.textContent = '';
    var M = PB.MACRO || { series: {} };

    var when = document.getElementById('macro-when');
    if (when) when.textContent = M.fetched
      ? (lang === 'en' ? 'fetched ' + M.fetched : M.fetched + ' 取得')
      : (lang === 'en' ? 'not fetched' : '未取得');

    PB.INDICATORS.forEach(function (ind) {
      var card = el('section', 'gauge');
      card.id = 'g-' + ind.id;

      var head = el('div', 'gauge__head');
      head.appendChild(el('h3', 'gauge__t', pick(ind, 'title')));
      var sub = pick(ind, 'sub');
      if (sub) head.appendChild(el('span', 'gauge__sub', sub));
      card.appendChild(head);

      card.appendChild(el('p', 'gauge__why', pick(ind, 'why')));

      /* 掲載元は図より先に置く。数字より、どこが出しているかのほうが先に要る。
         PDF は別物として印を付ける（開くと落ちてくるので、押す前に分かるように）。 */
      if (ind.sources && ind.sources.length) {
        var box = el('div', 'srcs');
        box.appendChild(el('span', 'srcs__k',
          (lang === 'en' ? 'Published by ' : '掲載元 ') + pick(ind, 'by')));
        var list = el('div', 'srcs__l');
        ind.sources.forEach(function (src) {
          var a = el('a', 'srcs__a' + (src.pdf ? ' srcs__a--pdf' : ''), pick(src, 'label'));
          a.href = src.url;
          a.rel = 'noopener';
          a.target = '_blank';
          if (src.pdf) a.appendChild(el('span', 'srcs__pdf', 'PDF'));
          else a.appendChild(el('span', 'srcs__go', '↗'));
          list.appendChild(a);
        });
        box.appendChild(list);
        card.appendChild(box);
      }

      var s = M.series && M.series[ind.id];
      if (s && s.v && s.v.length) {
        var fig = el('div', 'gauge__fig');
        var g = sparkline(s, ind.unit);
        if (g) fig.appendChild(g);
        card.appendChild(fig);
        card.appendChild(el('p', 'gauge__src', (lang === 'en'
          ? 'Monthly, ' + s.from + ' to ' + monthAt(s.from, s.v.length - 1) + ' · ' + (M.source || '')
          : '月次 ' + s.from + ' 〜 ' + monthAt(s.from, s.v.length - 1) + ' ・ 出どころ ' + (M.source || ''))));
      } else if (ind.fn) {
        /* 取ってこられるのに、まだ取っていない */
        card.appendChild(el('p', 'blank', lang === 'en'
          ? 'Not fetched yet. Run tools/fetch-macro.mjs with an API key.'
          : 'まだ取ってきていません。tools/fetch-macro.mjs を鍵つきで走らせると入ります。'));
      } else {
        /* そもそも系列を持たない。掲載元を見に行く項目 */
        card.appendChild(el('p', 'gauge__only', lang === 'en'
          ? 'No series here — this one is read at the source.'
          : 'ここに図はありません。掲載元で読む項目です。'));
      }
      host.appendChild(card);
    });
  }

  /* ═══════════════════════════════════════════════ 市場センチメント
     ここだけは数字を手元に持たない。5分ごとに AWS 側（Lambda）が集計して
     S3 に置いた JSON を、開いているあいだ読みに行く。
     読めなければ、読めないと書く ── 前の値を残して「今」のふりをさせない。

     色は朱と藍の2つだけ。朱が強気、藍が弱気。ただし色だけで意味を持たせず、
     数値と「やや弱気」などの語を必ず並べる（色が分からなくても読めるように）。 */
  var SENT = { state: 'idle', data: null, err: '', timer: 0, wired: false };
  var SENT_SCHEMA = 1;

  /* 外から来る URL は http/https だけ通す。記事の見出しは textContent で入れる */
  function safeUrl(u) {
    if (!u) return '';
    return /^https?:\/\//i.test(String(u)) ? String(u) : '';
  }
  /* 符号を必ず付ける。−0.05 と 0.05 を見間違えないため */
  function sfmt(v, d) {
    var n = Math.abs(Number(v)).toFixed(d == null ? 2 : d);
    return (Number(v) < 0 ? '−' : '+') + n;
  }
  function sentTone(v) {
    return v > .02 ? 'var(--vermilion)' : v < -.02 ? 'var(--indigo)' : 'var(--ink-mute)';
  }
  /* data/sentiment.js の {ja, en} を言語で選ぶ。
     pick2 は自己紹介用で fill を要求するので、こちらは素の2択 */
  function jaen(o) {
    if (!o) return '';
    return (lang === 'en' && o.en) ? o.en : (o.ja || '');
  }
  /* スコアの出どころ。環境変数の値そのままでは読めないので言い換える */
  function scorerName(k) {
    var en = lang === 'en';
    if (k === 'claude') return en ? 'Claude Haiku 4.5' : 'Claude Haiku 4.5';
    if (k === 'dual') return en ? 'both, side by side' : '両方式を並走';
    if (k === 'passthrough' || k === 'apitube') return en ? 'the news API' : '記事APIの付属スコア';
    return k || '?';
  }
  function clockAt(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString(lang === 'en' ? 'en-GB' : 'ja-JP',
      { hour: '2-digit', minute: '2-digit' });
  }

  function loadSentiment() {
    var conf = PB.SENTIMENT;
    if (!conf || !conf.endpoint) { SENT.state = 'unset'; buildSentiment(); return; }
    SENT.state = SENT.data ? SENT.state : 'loading';
    fetch(conf.endpoint, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (j) {
      if (j.schema_version !== SENT_SCHEMA) throw new Error(lang === 'en'
        ? 'the data format has changed' : 'データの形が変わっています');
      SENT.data = j; SENT.state = 'ok'; SENT.err = '';
    }).catch(function (e) {
      SENT.state = SENT.data ? 'stale' : 'error';
      SENT.err = e.message || String(e);
    }).then(function () {
      buildSentiment();
      var wait = ((SENT.data && SENT.data.meta && SENT.data.meta.update_interval_seconds) || 300) * 1000;
      clearTimeout(SENT.timer);
      SENT.timer = setTimeout(loadSentiment, SENT.state === 'error' ? 60000 : wait);
    });
  }

  /* いまの値。図の前に、数字と語と −1〜+1 の位置で三重に出す */
  function sentimentNow(s, meta) {
    var en = lang === 'en';
    var box = el('div', 'sent__now');

    var head = el('div', 'sent__head');
    var big = el('strong', 'sent__big', sfmt(s.score));
    big.style.color = sentTone(s.score);
    head.appendChild(big);
    head.appendChild(el('span', 'sent__label', s.label));
    box.appendChild(head);

    var plates = el('div', 'sent__plates');
    function plate(k, v, note) {
      var d = el('div', 'sent__plate');
      d.appendChild(el('span', 'sent__k', k));
      d.appendChild(el('span', 'sent__v num', v));
      if (note) d.appendChild(el('span', 'sent__note', note));
      plates.appendChild(d);
    }
    plate(en ? 'vs 5 min ago' : '前回比',
      s.delta == null ? '—' : sfmt(s.delta),
      s.delta == null ? (en ? 'first reading' : '初回') : '');
    plate(en ? 'Articles' : '対象記事', String(s.article_count),
      en ? 'last 24 h' : '直近24時間');
    plate(en ? 'Confidence' : '信頼度', Math.round(s.confidence * 100) + '%',
      en ? 'weight of evidence' : '記事の量と新しさ');
    box.appendChild(plates);

    /* −1〜+1 の帯。中央が0 */
    var half = Math.min(Math.abs(s.score), 1) * 50;
    var track = el('div', 'sent__track');
    var fill = el('div', 'sent__fill');
    fill.style.background = sentTone(s.score);
    if (s.score >= 0) { fill.style.left = '50%'; fill.style.right = (50 - half) + '%'; }
    else { fill.style.left = (50 - half) + '%'; fill.style.right = '50%'; }
    track.appendChild(fill);
    track.appendChild(el('span', 'sent__zero'));
    box.appendChild(track);

    var scale = el('div', 'sent__scale');
    scale.appendChild(el('span', null, en ? '−1.0 bearish' : '−1.0 弱気'));
    scale.appendChild(el('span', 'num', '0'));
    scale.appendChild(el('span', null, en ? 'bullish +1.0' : '強気 +1.0'));
    box.appendChild(scale);

    if (meta && meta.half_life_hours) {
      box.appendChild(el('p', 'sent__meta', en
        ? 'Half-life ' + meta.half_life_hours + ' h · scored by ' + scorerName(meta.scorer)
        : '半減期 ' + meta.half_life_hours + ' 時間 · スコアは' + scorerName(meta.scorer)));
    }
    return box;
  }

  /* 24時間の図。0の線を境に、上は朱、下は藍。面は薄く、線は細く */
  function sentimentFig(series) {
    var pts = (series || []).filter(function (p) { return p && isFinite(p.score); });
    if (pts.length < 2) return null;

    var W = 640, H = 170, PADL = 30, PADR = 12, PADT = 10, PADB = 20;
    var top = 0;
    pts.forEach(function (p) { top = Math.max(top, Math.abs(p.score)); });
    var hi = Math.min(1, Math.max(.2, Math.ceil(top * 10) / 10)), lo = -hi;

    var t0 = Date.parse(pts[0].t), t1 = Date.parse(pts[pts.length - 1].t);
    if (!(t1 > t0)) t1 = t0 + 1;
    var x = function (t) { return PADL + (W - PADL - PADR) * ((Date.parse(t) - t0) / (t1 - t0)); };
    var y = function (v) { return PADT + (H - PADT - PADB) * ((hi - v) / (hi - lo)); };

    var s = svg(W, H), ink = 'currentColor';
    s.setAttribute('class', 'spark sent__fig');
    s.setAttribute('aria-label', lang === 'en'
      ? 'Sentiment over the last 24 hours' : '直近24時間のセンチメントの推移');

    /* 上下の目盛は破線、0だけは実線。0が境目だと分かるように */
    [hi, 0, lo].forEach(function (v) {
      var zero = v === 0;
      sh(s, 'line', { x1: PADL, y1: y(v), x2: W - PADR, y2: y(v), stroke: ink,
        'stroke-width': zero ? .8 : .5, 'stroke-opacity': zero ? .45 : .25,
        'stroke-dasharray': zero ? '' : '3 3' });
      var tx = sh(s, 'text', { x: PADL - 5, y: y(v) + 3.5, 'text-anchor': 'end',
        fill: ink, 'font-size': 9, 'fill-opacity': .55 });
      tx.textContent = v.toFixed(1);
    });

    /* 符号で色を変える。0の高さで硬く切り替える1本のグラデーション */
    var gid = 'sent-sign';
    var defs = sh(s, 'defs', {});
    var lg = sh(defs, 'linearGradient', { id: gid, x1: '0', y1: '0', x2: '0', y2: '1' });
    var cut = ((y(0) - PADT) / (H - PADT - PADB) * 100).toFixed(2) + '%';
    sh(lg, 'stop', { offset: '0%', 'stop-color': 'var(--vermilion)' });
    sh(lg, 'stop', { offset: cut, 'stop-color': 'var(--vermilion)' });
    sh(lg, 'stop', { offset: cut, 'stop-color': 'var(--indigo)' });
    sh(lg, 'stop', { offset: '100%', 'stop-color': 'var(--indigo)' });

    var d = '';
    pts.forEach(function (p, i) {
      d += (i ? ' L' : 'M') + x(p.t).toFixed(1) + ' ' + y(p.score).toFixed(1);
    });
    sh(s, 'path', { d: d + ' L' + x(pts[pts.length - 1].t).toFixed(1) + ' ' + y(0).toFixed(1)
        + ' L' + x(pts[0].t).toFixed(1) + ' ' + y(0).toFixed(1) + ' Z',
      fill: 'url(#' + gid + ')', 'fill-opacity': .13, stroke: 'none' });
    sh(s, 'path', { d: d, fill: 'none', stroke: 'url(#' + gid + ')',
      'stroke-width': 1.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });

    var last = pts[pts.length - 1];
    sh(s, 'circle', { cx: x(last.t), cy: y(last.score), r: 2.6, fill: sentTone(last.score) });

    [[pts[0], 'start'], [pts[pts.length - 1], 'end']].forEach(function (p) {
      var tx = sh(s, 'text', { x: p[1] === 'start' ? PADL : W - PADR, y: H - 5,
        'text-anchor': p[1], fill: ink, 'font-size': 9, 'fill-opacity': .55 });
      tx.textContent = clockAt(p[0].t);
    });
    return s;
  }

  /* 根拠。どの記事がこの値を作ったのか、出どころ付きで並べる。
     出典の無い数字は載せない、というこの site の決まりはここにも効く */
  function sentimentArticles(list) {
    var en = lang === 'en';
    var box = el('div', 'sent__srcs');
    (list || []).forEach(function (a) {
      var row = el('div', 'sent__a');

      var sc = el('span', 'sent__as num', sfmt(a.score));
      sc.style.color = sentTone(a.score);
      row.appendChild(sc);

      var body = el('div');
      var url = safeUrl(a.url);
      var t = el('p', 'sent__at');
      if (url) {
        var link = el('a', null, a.title);
        link.href = url; link.rel = 'noopener'; link.target = '_blank';
        link.appendChild(el('span', 'srcs__go', '↗'));
        t.appendChild(link);
      } else {
        t.textContent = a.title;
      }
      body.appendChild(t);
      body.appendChild(el('p', 'sent__aw',
        a.source + ' · ' + clockAt(a.published_at)
        + ' · ' + (en ? 'weight ' : '重み ') + Number(a.weight).toFixed(2)));
      row.appendChild(body);
      box.appendChild(row);
    });
    return box;
  }

  function buildSentiment() {
    var host = document.getElementById('sentiment');
    if (!host) return;
    var conf = PB.SENTIMENT || {};
    var en = lang === 'en';
    host.textContent = '';

    var when = document.getElementById('sent-when');
    var stamp = document.getElementById('sent-index');
    if (stamp) stamp.textContent = jaen(conf.index);

    if (SENT.state === 'idle' || SENT.state === 'loading') {
      if (when) when.textContent = en ? 'loading' : '読み込み中';
      host.appendChild(el('p', 'blank', en ? 'Fetching…' : '読み込んでいます…'));
      return;
    }
    if (SENT.state === 'unset') {
      if (when) when.textContent = en ? 'not deployed' : '未配備';
      host.appendChild(el('p', 'blank', en
        ? 'Not deployed yet. Once the collector is running on AWS, put its latest.json URL '
          + 'into data/sentiment.js and the figures appear here.'
        : 'まだ配備していません。AWS 側の集計が動きだしたら、その latest.json の URL を '
          + 'data/sentiment.js に書くと、ここに数字が入ります。'));
      return;
    }
    if (SENT.state === 'error') {
      if (when) when.textContent = en ? 'unreachable' : '取得できず';
      host.appendChild(el('p', 'blank', (en
        ? 'Could not read the figures (' : '数字を取得できませんでした（') + SENT.err
        + (en ? '). Retrying shortly.' : '）。しばらくして取り直します。')));
      return;
    }

    var data = SENT.data;
    if (when) {
      when.textContent = (en ? 'as of ' : '') + clockAt(data.generated_at) + (en ? '' : ' 現在')
        + (SENT.state === 'stale' ? (en ? ' · stale' : ' · 更新できず') : '');
    }

    host.appendChild(sentimentNow(data.sentiment, data.meta));

    /* 注意書きは図より先。数字を見る前に読んでほしい */
    var caveat = jaen(conf.caveat);
    if (caveat) host.appendChild(el('p', 'sent__caveat', caveat));

    var fig = sentimentFig(data.series);
    if (fig) {
      var wrap = el('div', 'gauge__fig');
      wrap.appendChild(fig);
      host.appendChild(wrap);
      host.appendChild(el('p', 'gauge__src', (en ? 'Last 24 hours · ' : '直近24時間 · ')
        + (data.series || []).length + (en ? ' points, 5-minute steps' : ' 点・5分刻み')));
    }

    host.appendChild(el('p', 'sent__how', jaen(conf.method)));

    if (data.articles && data.articles.length) {
      host.appendChild(el('h3', 'rsc__gt', en ? 'What moved it' : '根拠となった記事'));
      host.appendChild(sentimentArticles(data.articles));
      host.appendChild(el('p', 'grid__foot', (en
        ? 'Articles via ' : '記事の出どころ ') + jaen(conf.provider)
        + (en ? ' · sorted by how much each moved the number'
              : ' · この値をどれだけ動かしたかの順')));
    }
  }

  /* --------------------------------------------------------------- 描画 */
  function render() {
    buildHead();
    buildFoot();
    buildHello();
    buildProfile();
    buildMacroTable();
    buildMacro();
    buildSentiment();

    var games = document.getElementById('works');
    if (games) {
      games.textContent = '';
      PB.WORKS.forEach(function (w) { games.appendChild(buildGame(w)); });
    }

    var cnt = document.getElementById('games-count');
    if (cnt) cnt.textContent = lang === 'en'
      ? PB.WORKS.length + ' games'
      : '全 ' + PB.WORKS.length + ' 作';



    buildRanking();
    buildPrivacyState();
    watchPlates(document);
  }

  /* ------------------------------------------------------------ 言語切替 */
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-en]').forEach(function (n) {
      if (n.dataset.ja == null) n.dataset.ja = n.innerHTML;
      n.innerHTML = lang === 'en' ? n.dataset.en : n.dataset.ja;
    });
    render();          // 天地ごと組み直す。切替ボタンもここで作り直される
    paintControls();   // なので文字を入れるのは render のあと
  }

  /* 天が組み直されるたびに、2つの切替ボタンの見た目を入れ直す。
     狭い画面では「切り替え先」だけを出す（CSS で .ctl__now を隠す）。 */
  function paintControls() {
    var lb = document.getElementById('lang');
    if (lb) {
      lb.textContent = '';
      lb.appendChild(el('span', 'ctl__now ctl__on', lang === 'en' ? 'EN' : '日本語'));
      lb.appendChild(el('span', 'ctl__now', ' / '));
      lb.appendChild(el('span', null, lang === 'en' ? '日本語' : 'EN'));
      lb.setAttribute('aria-label', lang === 'en' ? 'Switch to Japanese' : '英語に切り替える');
    }
    var tb = document.getElementById('theme');
    if (tb) {
      /* 白と黒の2つだけ。押したら何になるかを出す */
      var next = theme() === 'dark' ? 'light' : 'dark';
      var name = lang === 'en'
        ? (next === 'dark' ? 'Dark' : 'Light')
        : (next === 'dark' ? '黒' : '白');
      tb.textContent = '';
      tb.appendChild(el('span', 'ctl__long', name));
      var short = el('span', 'ctl__short', next === 'dark' ? '●' : '○');
      short.setAttribute('aria-hidden', 'true');
      tb.appendChild(short);
      tb.setAttribute('aria-label', lang === 'en'
        ? 'Switch to ' + name.toLowerCase() : name + 'に切り替える');
    }
  }

  /* いまが白か黒か。既定は黒 ── CSS の素の :root が黒なので、
     属性が無いときは黒が出ている。ここもそれに合わせる。
     端末の設定は見ない。見ると答えが CSS とずれる。 */
  function theme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  /* ------------------------------------------------------------ 明暗切替 */
  function applyTheme(m) {
    if (m) document.documentElement.setAttribute('data-theme', m);
    else document.documentElement.removeAttribute('data-theme');
    try { m ? localStorage.setItem('pb-theme', m) : localStorage.removeItem('pb-theme'); } catch (e) {}
    paintControls();
  }

  /* --------------------------------------------------------------- 起動 */
  function boot() {
    try {
      var saved = localStorage.getItem('pb-theme');
      if (saved) document.documentElement.setAttribute('data-theme', saved);
    } catch (e) {}

    applyLang();
    applyTheme(document.documentElement.getAttribute('data-theme'));

    /* センチメントのページだけ、外の数字を読みに行く。
       閉じているあいだは取りに行かない ── 戻ってきたときに取り直す。 */
    if (document.getElementById('sentiment') && !SENT.wired) {
      SENT.wired = true;
      loadSentiment();
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') loadSentiment();
      });
    }

    /* 切替ボタンは天と一緒に作り直されるので、要素に直接ではなく
       document で受ける。付け直しの漏れが起きない。 */
    document.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('#lang, #theme') : null;
      if (!b) return;
      if (b.id === 'lang') {
        lang = (lang === 'ja' ? 'en' : 'ja');
        applyLang();
        return;
      }
      applyTheme(theme() === 'dark' ? 'light' : 'dark');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
