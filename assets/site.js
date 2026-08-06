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
      signin: 'ログイン', signup: '新規登録', signout: 'ログアウト',
      account: 'アカウント', guest: 'ゲスト',
      played: '対戦', won: '勝ち', rate: '勝率', agents: 'エージェント',
      noRecord: 'まだ記録がありません。ゲームを遊ぶと、ここに残ります。',
      noRank: 'まだ対戦が行われていません。エージェント機能ができると、ここに並びます。',
      joined: '登録', save: '保存する', del: 'アカウントを削除', exportD: '書き出す',
      displayName: '表示名', localOnly: 'この端末のみ',
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
      signin: 'Sign in', signup: 'Create account', signout: 'Sign out',
      account: 'Account', guest: 'Guest',
      played: 'Played', won: 'Won', rate: 'Win rate', agents: 'Agents',
      noRecord: 'No games yet. Your results will appear here once you play.',
      noRank: 'No matches yet. Once agents arrive, they will be ranked here.',
      joined: 'Joined', save: 'Save', del: 'Delete account', exportD: 'Export',
      displayName: 'Display name', localOnly: 'this device only',
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
  function identicon(handle, size) {
    var h = 2166136261;
    for (var i = 0; i < handle.length; i++) {
      h ^= handle.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    var s = svg(5, 5);
    s.setAttribute('class', 'idc');
    if (size) { s.style.width = size; s.style.height = size; }
    s.setAttribute('aria-hidden', 'true');
    for (var c = 0; c < 3; c++) for (var r = 0; r < 5; r++) {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      h = (h ^ (h >>> 13)) >>> 0;
      if ((h & 3) === 0) continue;
      [c, 4 - c].forEach(function (x) {
        sh(s, 'rect', { x: x, y: r, width: 1, height: 1, fill: 'currentColor', 'fill-opacity': (h & 4) ? .75 : .4 });
      });
    }
    return s;
  }

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

  /* ----------------------------------------------------------- アカウント */
  function initials(u) { return (u.display || u.handle).trim().charAt(0); }

  function buildAccountSlot() {
    var slot = document.getElementById('account-slot');
    if (!slot) return;
    slot.textContent = '';
    var u = PB.auth.user();

    if (!u) {
      var b = el('button', 'ctl ctl--go', t('signin'));
      b.type = 'button';
      b.setAttribute('data-auth-open', 'signin');
      slot.appendChild(b);
      return;
    }

    var link = el('a', 'who');
    link.href = '#me';
    link.appendChild(identicon(u.handle, '1.15rem'));
    link.appendChild(el('span', 'who__n', u.display));
    slot.appendChild(link);
  }

  function statTile(k, v, note) {
    var d = el('div', 'stat');
    d.appendChild(el('span', 'stat__v num', v));
    d.appendChild(el('span', 'stat__k', k));
    if (note) d.appendChild(el('span', 'stat__note', note));
    return d;
  }

  function buildAccountPanel() {
    var host = document.getElementById('account-panel');
    if (!host) return;
    host.textContent = '';
    var u = PB.auth.user();

    /* 未ログイン ── 勧誘。ただし遊ぶのに要らないことを必ず添える */
    if (!u) {
      var box = el('div', 'invite');
      box.appendChild(el('h3', 'invite__t',
        lang === 'en' ? 'Keep your results' : '成績を残しませんか'));
      box.appendChild(el('p', 'invite__b', lang === 'en'
        ? 'An account records what you played and how it went, and later it is what your own agent is trained from. Playing never requires one.'
        : 'アカウントを作ると、遊んだ記録が残ります。のちのち、あなた専用のエージェントを鍛える材料にもなります。遊ぶだけならアカウントは要りません。'));
      var acts = el('div', 'invite__acts');
      var b1 = el('button', 'btn btn--go', t('signup'));
      b1.type = 'button'; b1.setAttribute('data-auth-open', 'signup');
      var b2 = el('button', 'btn', t('signin'));
      b2.type = 'button'; b2.setAttribute('data-auth-open', 'signin');
      acts.appendChild(b1); acts.appendChild(b2);
      box.appendChild(acts);
      host.appendChild(box);
      return;
    }

    /* ログイン済み */
    var card = el('div', 'me');

    var head = el('div', 'me__head');
    head.appendChild(identicon(u.handle, '2.6rem'));
    var who = el('div', 'me__who');
    who.appendChild(el('h3', 'me__n', u.display));
    who.appendChild(el('p', 'me__h', '@' + u.handle));
    head.appendChild(who);

    var badge = el('span', 'me__where', PB.auth.kind === 'local' ? t('localOnly') : PB.auth.label);
    head.appendChild(badge);
    card.appendChild(head);

    var st = u.stats || { played: 0, won: 0 };
    var tiles = el('div', 'cells stats');
    tiles.appendChild(statTile(t('played'), String(st.played || 0)));
    tiles.appendChild(statTile(t('won'), String(st.won || 0)));
    tiles.appendChild(statTile(t('rate'), st.played ? fmt(st.won / st.played) : '—'));
    tiles.appendChild(statTile(t('agents'), String((u.agents || []).length),
      lang === 'en' ? 'not yet available' : 'これから'));
    card.appendChild(tiles);

    if (!st.played) card.appendChild(el('p', 'me__empty', t('noRecord')));

    /* 設定 */
    var form = el('form', 'me__form');
    var f = el('div', 'field field--row');
    var lab = el('label', 'field__k', t('displayName'));
    lab.htmlFor = 'me-display';
    var inp = el('input', 'field__i');
    inp.id = 'me-display'; inp.type = 'text'; inp.value = u.display; inp.maxLength = 24;
    var sv = el('button', 'btn', t('save'));
    sv.type = 'submit';
    f.appendChild(lab); f.appendChild(inp); f.appendChild(sv);
    form.appendChild(f);
    var msg = el('p', 'me__msg');
    msg.hidden = true;
    form.appendChild(msg);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      PB.auth.update({ display: inp.value }).then(function () {
        msg.hidden = false;
        msg.textContent = lang === 'en' ? 'Saved.' : '保存しました';
        msg.className = 'me__msg';
      }).catch(function (err) {
        msg.hidden = false;
        msg.textContent = err.message;
        msg.className = 'me__msg me__msg--bad';
      });
    });
    card.appendChild(form);

    var foot = el('div', 'me__foot');
    var out = el('button', 'btn', t('signout'));
    out.type = 'button';
    out.addEventListener('click', function () { PB.auth.signOut(); });
    foot.appendChild(out);

    var exp = el('button', 'btn', t('exportD'));
    exp.type = 'button';
    exp.addEventListener('click', function () {
      var data = PB.auth.exportData();
      if (!data) return;
      var url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      var a = document.createElement('a');
      a.href = url; a.download = 'playbench-' + u.handle + '.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
    foot.appendChild(exp);

    var del = el('button', 'btn btn--danger', t('del'));
    del.type = 'button';
    del.addEventListener('click', function () {
      var ok = window.confirm(lang === 'en'
        ? 'Delete this account and its record? This cannot be undone.'
        : 'このアカウントと記録を消します。元に戻せません。よろしいですか。');
      if (!ok) return;
      PB.auth.remove().catch(function (e) {
        msg.hidden = false;
        msg.textContent = e.message;
        msg.className = 'me__msg me__msg--bad';
        msg.scrollIntoView({ block: 'nearest' });
      });
    });
    foot.appendChild(del);

    card.appendChild(foot);
    host.appendChild(card);
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

  /* ----------------------------------------------------------- これから */
  function buildPlan() {
    var wrap = el('div', 'cells plan');
    PB.ROADMAP.forEach(function (r) {
      var st = el('div', 'step');
      st.appendChild(el('div', 'step__n', pick(r, 'step')));
      st.appendChild(el('h3', 'step__t', pick(r, 'title')));
      st.appendChild(el('p', 'step__b', pick(r, 'body')));
      if (r.note) st.appendChild(el('p', 'step__note', pick(r, 'note')));
      st.appendChild(el('span', 'step__state', t('planned')));
      wrap.appendChild(st);
    });
    return wrap;
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

  function buildTenets() {
    var wrap = el('div', 'cells tenets');
    PB.PRINCIPLES.forEach(function (p) {
      var d = el('div', 'tenet');
      d.appendChild(el('h3', 'tenet__t', pick(p, 'title')));
      d.appendChild(el('p', 'tenet__b', pick(p, 'body')));
      wrap.appendChild(d);
    });
    return wrap;
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
     4ページあるので、天と地は HTML に写さず、ここから組む。
     文言を直す場所が1つで済む。 */
  var PAGES = [
    { file: 'index.html', ja: '自己紹介',     en: 'About' },
    { file: 'games.html', ja: 'ボードゲーム', en: 'Board games' },
    { file: 'macro.html', ja: '経済',         en: 'Economy' }
  ];
  function here() {
    var f = (location.pathname.split('/').pop() || '').split('?')[0];
    return f === '' ? 'index.html' : f;
  }
  function who() {
    var p = PB.PROFILE && PB.PROFILE.name;
    return (p && p.fill && pick2(p)) || 'shunshun0904';
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

    var mark = el('a', 'masthead__mark', who());
    mark.href = 'index.html';
    box.appendChild(mark);

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
    /* アカウントは対戦の記録のためだけにある。盤上のページにしか出さない */
    if (cur === 'games.html') {
      var slot = el('div'); slot.id = 'account-slot';
      tools.appendChild(slot);
    }
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

    host.appendChild(col(en ? 'About this site' : 'このサイトについて', [
      el('p', null, en
        ? 'A personal site. Nothing is sold and there are no ads.'
        : '個人のサイトです。何も販売せず、広告も出しません。'),
      el('p', null, en
        ? 'For analytics it uses Google Analytics: which pages were read, plus a rough region and device type. Nothing you type is ever sent.'
        : 'アクセス解析には Google アナリティクスを使います。集めるのは読まれたページと、'
          + 'おおまかな地域・機器の別だけで、入力した文字は送りません。'),
      (function () { var p = el('p', 'pstate'); p.id = 'privacy-state'; return p; })()
    ]));

    host.appendChild(col(en ? 'Rights' : '権利について', [
      el('p', null, en
        ? 'High Society is a game by Reiner Knizia; Big Shot by Alex Randolph; Acquire by Sid Sackson. The implementations here are unofficial fan work made for study, containing no trademarks and no original artwork.'
        : 'High Society はライナー・クニツィア、Big Shot はアレックス・ランドルフ、'
          + 'Acquire はシド・サクソンによるゲームです。ここの実装はいずれも学習目的の'
          + '非公式なファンメイドで、商標もアートワークも含みません。'),
      el('p', null, en
        ? 'Macro figures come from Alpha Vantage. Nothing here is investment advice.'
        : 'マクロの数字は Alpha Vantage から取っています。投資助言ではありません。')
    ]));

    var link = el('p');
    var a = el('a', null, 'github.com/shunshun0904');
    a.href = 'https://github.com/shunshun0904';
    a.rel = 'noopener';
    link.appendChild(a);
    host.appendChild(col(en ? 'Source' : '置き場所', [
      el('p', null, en
        ? 'Everything here is public, including the measurements behind every bar.'
        : 'すべて公開しています。棒グラフの裏にある実測も含めて。'),
      link
    ]));
  }

  /* トップ（＝自己紹介）の名乗り。中身は buildProfile が組む */
  function buildHello() {
    var n = document.getElementById('hello-name');
    if (n) n.textContent = who();
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

    if (pr.links && pr.links.fill && pr.links.rows.length) {
      var ul = el('div', 'links');
      pr.links.rows.forEach(function (r) {
        var a = el('a', 'links__a', r.label);
        a.href = r.url; a.rel = 'noopener';
        ul.appendChild(a);
      });
      intro.appendChild(ul);
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

    /* ---- 道具 */
    var sk = document.getElementById('profile-skills');
    sk.textContent = '';
    if (pr.skills && pr.skills.fill && pr.skills.groups.length) {
      var g = el('div', 'cells');
      pr.skills.groups.forEach(function (grp) {
        var d = el('div', 'tenet');
        d.appendChild(el('h3', 'tenet__t', pick(grp, 'label')));
        var row = el('p', 'tags');
        grp.items.forEach(function (s) { row.appendChild(el('span', 'tag tag--ink', s)); });
        d.appendChild(row);
        g.appendChild(d);
      });
      sk.appendChild(g);
    } else sk.appendChild(notYet());
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

      var head = el('div', 'gauge__head');
      head.appendChild(el('h3', 'gauge__t', pick(ind, 'title')));
      var sub = pick(ind, 'sub');
      if (sub) head.appendChild(el('span', 'gauge__sub', sub));
      card.appendChild(head);

      card.appendChild(el('p', 'gauge__why', pick(ind, 'why')));

      var s = M.series && M.series[ind.id];
      if (s && s.v && s.v.length) {
        var fig = el('div', 'gauge__fig');
        var g = sparkline(s, ind.unit);
        if (g) fig.appendChild(g);
        card.appendChild(fig);
        card.appendChild(el('p', 'gauge__src', (lang === 'en'
          ? 'Monthly, ' + s.from + ' to ' + monthAt(s.from, s.v.length - 1) + ' · ' + (M.source || '')
          : '月次 ' + s.from + ' 〜 ' + monthAt(s.from, s.v.length - 1) + ' ・ 出どころ ' + (M.source || ''))));
      } else {
        card.appendChild(el('p', 'blank', lang === 'en'
          ? 'Not fetched yet. Run tools/fetch-macro.mjs with an API key.'
          : 'まだ取ってきていません。tools/fetch-macro.mjs を鍵つきで走らせると入ります。'));
      }
      host.appendChild(card);
    });
  }

  /* --------------------------------------------------------------- 描画 */
  function render() {
    buildHead();
    buildFoot();
    buildHello();
    buildProfile();
    buildMacro();

    var games = document.getElementById('works');
    if (games) {
      games.textContent = '';
      PB.WORKS.forEach(function (w) { games.appendChild(buildGame(w)); });
    }

    var cnt = document.getElementById('games-count');
    if (cnt) cnt.textContent = lang === 'en'
      ? PB.WORKS.length + ' games'
      : '全 ' + PB.WORKS.length + ' 作';

    var plan = document.getElementById('plan');
    if (plan) { plan.textContent = ''; plan.appendChild(buildPlan()); }

    var tenets = document.getElementById('tenets');
    if (tenets) { tenets.textContent = ''; tenets.appendChild(buildTenets()); }

    buildRanking();
    buildAccountSlot();
    buildAccountPanel();
    buildPrivacyState();
    watchPlates(document);
  }

  /* ------------------------------------------------- ログイン／新規登録 */
  var modal, form, mode = 'signin';

  /* 出す入力欄はプロバイダが決める。
     Local はハンドル名でログイン、Supabase はメールでログインする。 */
  function setMode(m) {
    mode = m;
    var want = PB.auth.fields()[m] || [];
    document.getElementById('auth-title').textContent = t(m === 'signup' ? 'signup' : 'signin');
    document.getElementById('auth-submit').textContent = t(m === 'signup' ? 'signup' : 'signin');

    modal.querySelectorAll('[data-field]').forEach(function (n) {
      var on = want.indexOf(n.dataset.field) >= 0;
      n.hidden = !on;
      var input = n.querySelector('input');
      if (input) input.disabled = !on;   // 隠した欄は検証にも送信にも入れない
    });
    modal.querySelectorAll('.tab').forEach(function (b) {
      var on = b.dataset.tab === m;
      b.classList.toggle('tab--on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    var foot = document.getElementById('auth-foot');
    if (foot) {
      foot.innerHTML = '';
      if (PB.auth.kind === 'local') {
        foot.innerHTML = lang === 'en'
          ? 'Accounts live in <strong>this browser only</strong> — nothing is sent to a server, and there is nothing to recover if you clear your browser data.'
          : 'アカウントは<strong>いまのところこのブラウザの中だけ</strong>にあります。サーバーへは何も送っていません。そのぶん、ブラウザのデータを消すと戻せません。';
      } else {
        foot.innerHTML = lang === 'en'
          ? 'Your email is used to sign in and is never shown to anyone. Your handle and display name are public.'
          : 'メールアドレスはログインにだけ使い、誰にも表示しません。公開されるのはハンドル名と表示名です。';
      }
    }
    showErr(null);
  }

  function showErr(msg) {
    var box = document.getElementById('auth-err');
    box.hidden = !msg;
    box.textContent = msg || '';
  }

  function openAuth(m) {
    setMode(m || 'signin');
    if (!modal.open) modal.showModal();
    var first = document.getElementById('f-handle');
    setTimeout(function () { first.focus(); }, 40);
  }

  function wireAuth() {
    modal = document.getElementById('auth-modal');
    form = document.getElementById('auth-form');
    /* アカウントは対戦の記録のためだけにある。盤上のページ以外には置いていない */
    if (!modal || !form) { modal = form = null; return; }

    document.getElementById('auth-close').addEventListener('click', function () { modal.close(); });

    modal.querySelectorAll('.tab').forEach(function (b) {
      b.addEventListener('click', function () { setMode(b.dataset.tab); });
    });

    /* 背景を押したら閉じる */
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.close();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var submit = document.getElementById('auth-submit');
      var o = {};
      (PB.auth.fields()[mode] || []).forEach(function (k) {
        if (form[k]) o[k] = form[k].value;
      });
      submit.disabled = true;
      showErr(null);

      var p = (mode === 'signup') ? PB.auth.signUp(o) : PB.auth.signIn(o);
      p.then(function () {
        form.reset();
        modal.close();
      }).catch(function (err) {
        showErr(err.message || String(err));
      }).then(function () {
        submit.disabled = false;
      });
    });

    /* どこからでも開けるようにしておく */
    document.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-auth-open]') : null;
      if (b) { e.preventDefault(); openAuth(b.getAttribute('data-auth-open')); }
    });
  }

  /* ------------------------------------------------------------ 言語切替 */
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-en]').forEach(function (n) {
      if (n.dataset.ja == null) n.dataset.ja = n.innerHTML;
      n.innerHTML = lang === 'en' ? n.dataset.en : n.dataset.ja;
    });
    if (modal) setMode(mode);
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
      var cur = document.documentElement.getAttribute('data-theme');
      var name = cur === 'dark' ? '青焼き' : (cur === 'light' ? '製図用紙' : '地の色');
      tb.textContent = '';
      tb.appendChild(el('span', 'ctl__long', name));
      var short = el('span', 'ctl__short', '◐');
      short.setAttribute('aria-hidden', 'true');
      tb.appendChild(short);
      tb.setAttribute('aria-label', lang === 'en' ? 'Change background (' + name + ')' : '地の色を変える（' + name + '）');
    }
  }

  /* ------------------------------------------------------------ 明暗切替 */
  function applyTheme(m) {
    if (m) document.documentElement.setAttribute('data-theme', m);
    else document.documentElement.removeAttribute('data-theme');
    try { m ? localStorage.setItem('pb-theme', m) : localStorage.removeItem('pb-theme'); } catch (e) {}
    paintControls();
  }

  /* 確認リンクから戻ってきたときに、何が起きたのかを画面上部に出す。
     黙って元の画面に戻すと「何も起きなかった」ようにしか見えない。 */
  function showLanding(landed) {
    var host = document.querySelector('main');
    if (!host) return;
    var box = el('div', 'landing' + (landed.error ? ' landing--bad' : ''));
    var msg = landed.error
      ? landed.error
      : (lang === 'en'
          ? 'Email confirmed. You are signed in.'
          : 'メールアドレスを確認しました。ログインしています。');
    box.appendChild(el('span', 'landing__t', msg));
    var x = el('button', 'landing__x', '×');
    x.type = 'button';
    x.setAttribute('aria-label', lang === 'en' ? 'Dismiss' : '閉じる');
    x.addEventListener('click', function () { box.remove(); });
    box.appendChild(x);
    host.insertBefore(box, host.firstChild);
    box.scrollIntoView({ block: 'nearest' });
  }

  /* --------------------------------------------------------------- 起動 */
  function boot() {
    try {
      var saved = localStorage.getItem('pb-theme');
      if (saved) document.documentElement.setAttribute('data-theme', saved);
    } catch (e) {}

    wireAuth();
    applyLang();
    applyTheme(document.documentElement.getAttribute('data-theme'));

    PB.auth.onChange(function () {
      buildAccountSlot();
      buildAccountPanel();
    });

    /* 保存してあるセッションから利用者を取り戻す。
       確認メールのリンクから戻ってきた場合もここで拾われる。 */
    PB.auth.start().then(function () {
      var landed = PB.auth.takeLanding && PB.auth.takeLanding();
      if (landed) showLanding(landed);
    });

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
      var cur = document.documentElement.getAttribute('data-theme');
      var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(!cur ? (dark ? 'light' : 'dark')
        : (cur === (dark ? 'light' : 'dark') ? (dark ? 'dark' : 'light') : null));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
