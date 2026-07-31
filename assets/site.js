/* ==========================================================================
   PLAYBENCH ─ 図録の組版

   作品は data/works.js から組む。作品を増やすときにこのファイルは触らない。
   図版は外部画像を持たず、その場で SVG を生成する（3作の流儀に合わせる）。
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
    // lang が en のとき keyEn を優先し、無ければ日本語に落とす
    if (lang === 'en') {
      var k = key + 'En';
      if (o[k]) return o[k];
    }
    return o[key];
  }
  function fmt(v) {
    // .855 / 1.000 ── 桁を揃えて先頭の 0 を落とす
    var s = v.toFixed(3);
    return v < 1 ? s.slice(1) : s;
  }
  var T = {
    ja: {
      opponent: '相手の作り', plate: '実測', remark: '注記',
      play: '遊ぶ', repo: 'リポジトリ', designer: '作者', players: '人数', genre: '分類',
      fig: '図', parity: '互角', planned: '未実装'
    },
    en: {
      opponent: 'The opponent', plate: 'Measured', remark: 'Note',
      play: 'Play', repo: 'Source', designer: 'Designer', players: 'Players', genre: 'Type',
      fig: 'Fig.', parity: 'parity', planned: 'planned'
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

  /* 街区図 ── ビッグショット。街路で区切られた街区と、公園ひとつ */
  function figBlocks() {
    var s = svg(100, 100);
    var ink = 'currentColor';
    sh(s, 'rect', { x: 0, y: 0, width: 100, height: 100, fill: 'none' });
    var cells = [
      [8, 8], [38, 8], [68, 8],
      [8, 38], [38, 38], [68, 38],
      [8, 68], [38, 68], [68, 68]
    ];
    cells.forEach(function (c, i) {
      var x = c[0], y = c[1], w = 24, h = 24;
      var park = (i === 4);
      sh(s, 'rect', {
        x: x, y: y, width: w, height: h,
        fill: park ? 'none' : 'currentColor',
        'fill-opacity': park ? 0 : .05,
        stroke: ink, 'stroke-width': .85, 'stroke-opacity': .8
      });
      if (park) {
        // 園路と木立
        sh(s, 'path', {
          d: 'M' + x + ' ' + (y + 16) + ' Q' + (x + 12) + ' ' + (y + 4) + ' ' + (x + 24) + ' ' + (y + 10),
          fill: 'none', stroke: ink, 'stroke-width': .6, 'stroke-opacity': .4
        });
        [[6, 6], [17, 8], [11, 18], [19, 17]].forEach(function (p) {
          sh(s, 'circle', { cx: x + p[0], cy: y + p[1], r: 2.1, fill: ink, 'fill-opacity': .3 });
        });
      } else {
        // 敷地割。高い区画ほど線が密になる
        var n = 2 + (i % 4);
        for (var j = 1; j < n; j++) {
          sh(s, 'line', {
            x1: x + (w / n) * j, y1: y, x2: x + (w / n) * j, y2: y + h,
            stroke: ink, 'stroke-width': .4, 'stroke-opacity': .42
          });
        }
        sh(s, 'line', {
          x1: x, y1: y + h * .62, x2: x + w, y2: y + h * .62,
          stroke: ink, 'stroke-width': .4, 'stroke-opacity': .42
        });
      }
    });
    // 街路のセンターライン
    [32, 62].forEach(function (v) {
      sh(s, 'line', { x1: v + 2, y1: 4, x2: v + 2, y2: 96, stroke: ink, 'stroke-width': .5, 'stroke-opacity': .35, 'stroke-dasharray': '3 3' });
      sh(s, 'line', { x1: 4, y1: v + 2, x2: 96, y2: v + 2, stroke: ink, 'stroke-width': .5, 'stroke-opacity': .35, 'stroke-dasharray': '3 3' });
    });
    return s;
  }

  /* 盤面 ── アクワイア。12×9 のマスに、繋がったチェーンが2つ */
  function figGrid() {
    var s = svg(100, 100);
    var ink = 'currentColor';
    var cols = 12, rows = 9, pad = 6;
    var cw = (100 - pad * 2) / cols, ch = (100 - pad * 2 - 8) / rows;
    var chainA = ['2,2', '3,2', '3,3', '4,3', '4,2', '5,2'];
    var chainB = ['7,5', '8,5', '8,6', '9,6', '7,6'];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var key = c + ',' + r;
        var inA = chainA.indexOf(key) >= 0, inB = chainB.indexOf(key) >= 0;
        sh(s, 'rect', {
          x: pad + c * cw + .5, y: pad + 4 + r * ch + .5,
          width: cw - 1.4, height: ch - 1.4,
          fill: (inA || inB) ? ink : 'none',
          'fill-opacity': inA ? .6 : (inB ? .32 : 0),
          stroke: ink, 'stroke-width': .35,
          'stroke-opacity': (inA || inB) ? .72 : .34
        });
      }
    }
    return s;
  }

  /* 競り札 ── ハイソサエティ。重ねた3枚 */
  function figCards() {
    var s = svg(100, 100);
    var ink = 'currentColor';
    var defs = [
      { x: 12, y: 26, rot: -8, op: .06 },
      { x: 26, y: 20, rot: -1, op: .10 },
      { x: 40, y: 25, rot: 7, op: .16 }
    ];
    defs.forEach(function (d, i) {
      var g = sh(s, 'g', { transform: 'rotate(' + d.rot + ' ' + (d.x + 24) + ' ' + (d.y + 26) + ')' });
      sh(g, 'rect', {
        x: d.x, y: d.y, width: 34, height: 48, rx: 2,
        fill: ink, 'fill-opacity': d.op, stroke: ink, 'stroke-width': .85, 'stroke-opacity': .8
      });
      sh(g, 'rect', {
        x: d.x + 4, y: d.y + 4, width: 26, height: 40, rx: 1,
        fill: 'none', stroke: ink, 'stroke-width': .4, 'stroke-opacity': .42
      });
      if (i === 2) {
        [[0, 0], [1, 0], [0, 1], [1, 1], [.5, .5]].forEach(function (p) {
          sh(g, 'circle', {
            cx: d.x + 12 + p[0] * 11, cy: d.y + 16 + p[1] * 11, r: 1.9,
            fill: ink, 'fill-opacity': .45
          });
        });
      }
    });
    return s;
  }

  var FIGS = { blocks: figBlocks, grid: figGrid, cards: figCards };

  /* ------------------------------------------------------- 実測プレート */
  function buildPlate(p) {
    var fig = el('figure', 'plate');

    var cap = el('figcaption', 'cell__k');
    var capT = el('span', 'tag tag--ink', t('plate') + ' ── ' + pick(p, 'caption'));
    cap.appendChild(capT);
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
      row.appendChild(track);

      row.appendChild(el('div', 'srow__v', fmt(r.v)));
      scale.appendChild(row);
    });

    /* 目盛り。0 ／ 互角 ／ 1.000 の三点だけ打つ */
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

    /* 互角の線は全行を貫くので、行ではなく scale の上に1本だけ置く */
    scale.appendChild(el('div', 'scale__base'));

    fig.appendChild(scale);
    return fig;
  }

  /* ------------------------------------------------------------- 作品 */
  function buildWork(w) {
    var art = el('article', 'work');
    art.id = w.id;

    /* 上段：図版と書誌 */
    var top = el('div', 'work__top');

    var figWrap = el('figure', 'work__fig');
    var s = (FIGS[w.figure] || figGrid)();
    s.setAttribute('aria-label', pick(w, 'title'));
    figWrap.appendChild(s);
    figWrap.appendChild(el('figcaption', 'work__figcap',
      t('fig') + ' ' + w.no + ' ── ' + (lang === 'en' ? 'schematic' : '模式図')));
    top.appendChild(figWrap);

    var head = el('div', 'work__head');
    var no = el('div', 'work__no');
    no.appendChild(el('span', 'tag tag--red', 'No.' + String(w.no).padStart(2, '0')));
    head.appendChild(no);

    head.appendChild(el('h3', 'work__title', pick(w, 'title')));
    head.appendChild(el('p', 'work__latin', w.latin));

    var meta = el('ul', 'work__meta');
    [
      [t('designer'), pick(w, 'designer')],
      [t('players'), pick(w, 'players')],
      [t('genre'), pick(w, 'genre')]
    ].forEach(function (m) {
      var li = el('li');
      li.appendChild(el('b', null, m[0]));
      li.appendChild(el('span', null, m[1]));
      meta.appendChild(li);
    });
    head.appendChild(meta);
    head.appendChild(el('p', 'work__lead', pick(w, 'lead')));

    var acts = el('div', 'work__acts');
    if (w.play) {
      var a = el('a', 'act act--play', t('play') + ' →');
      a.href = w.play;
      acts.appendChild(a);
    } else {
      acts.appendChild(el('span', 'act act--off', pick(w, 'playNote') || t('planned')));
    }
    var rp = el('a', 'act', t('repo'));
    rp.href = w.repo;
    rp.rel = 'noopener';
    acts.appendChild(rp);
    head.appendChild(acts);
    top.appendChild(head);
    art.appendChild(top);

    /* 下段：相手の作り ／ 実測 */
    var body = el('div', 'work__body');

    var c1 = el('div', 'cell');
    c1.appendChild(el('span', 'cell__k tag tag--ink', t('opponent')));
    c1.appendChild(el('h4', 'cell__t', pick(w, 'method')));
    c1.appendChild(el('p', 'cell__p', pick(w, 'methodBody')));
    body.appendChild(c1);

    var c2 = el('div', 'cell');
    c2.appendChild(buildPlate(w.plate));
    body.appendChild(c2);
    art.appendChild(body);

    /* 注記 */
    if (w.remark) {
      var rm = el('div', 'remark');
      rm.appendChild(el('span', 'remark__k', t('remark')));
      rm.appendChild(el('p', 'remark__b', pick(w, 'remark')));
      art.appendChild(rm);
    }
    return art;
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

  /* 構成図。サーバーを持たない対戦の流れ */
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
      var x = i * (w + gap) + 6;
      var accent = (i === 2);
      sh(s, 'rect', {
        x: x, y: y, width: w, height: h,
        fill: ink, 'fill-opacity': accent ? .07 : .03,
        stroke: ink, 'stroke-width': accent ? 1.1 : .8,
        'stroke-opacity': accent ? .7 : .45
      });
      label.split('\n').forEach(function (line, li, arr) {
        var tx = sh(s, 'text', {
          x: x + w / 2, y: y + h / 2 + (li - (arr.length - 1) / 2) * 13 + 4,
          'text-anchor': 'middle', fill: ink,
          'font-size': arr.length > 1 ? 10 : 11,
          'fill-opacity': li === 0 ? .85 : .6
        });
        tx.textContent = line;
      });
      if (i < boxes.length - 1) {
        var ax = x + w + 4;
        sh(s, 'line', { x1: ax, y1: y + h / 2, x2: ax + gap - 8, y2: y + h / 2, stroke: ink, 'stroke-width': .8, 'stroke-opacity': .5 });
        sh(s, 'path', {
          d: 'M' + (ax + gap - 8) + ' ' + (y + h / 2) + ' l-4 -3 v6 z',
          fill: ink, 'fill-opacity': .5
        });
      }
    });
    var cap = sh(s, 'text', { x: 6, y: 116, fill: ink, 'font-size': 10, 'fill-opacity': .55 });
    cap.textContent = lang === 'en'
      ? 'No server. Every row of the ranking can be reproduced from its seed and its run log.'
      : 'サーバーを持たない。順位表のどの行も、シードと実行ログから再現できる。';
    box.appendChild(s);
    return box;
  }

  /* ------------------------------------------------------------- 作法 */
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

  /* --------------------------------------------------------------- 描画 */
  var io = null;
  function watchPlates(root) {
    if (!('IntersectionObserver' in window)) {
      root.querySelectorAll('.scale').forEach(function (n) { n.classList.add('is-read'); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-read'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: .2 });
    }
    root.querySelectorAll('.scale').forEach(function (n) { io.observe(n); });
  }

  function render() {
    var works = document.getElementById('works');
    works.textContent = '';
    PB.WORKS.forEach(function (w) { works.appendChild(buildWork(w)); });

    var plan = document.getElementById('plan');
    plan.textContent = '';
    plan.appendChild(buildPlan());
    plan.appendChild(buildWire());

    var tenets = document.getElementById('tenets');
    tenets.textContent = '';
    tenets.appendChild(buildTenets());

    var n = document.getElementById('gauge-works');
    if (n) n.textContent = PB.WORKS.length;

    watchPlates(document);
  }

  /* ------------------------------------------------------------ 言語切替 */
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-en]').forEach(function (n) {
      if (n.dataset.ja == null) n.dataset.ja = n.innerHTML;
      n.innerHTML = lang === 'en' ? n.dataset.en : n.dataset.ja;
    });
    var btn = document.getElementById('lang');
    if (btn) {
      btn.innerHTML = lang === 'en'
        ? '<span class="ctl__on">EN</span> / 日本語'
        : '<span class="ctl__on">日本語</span> / EN';
      btn.setAttribute('aria-label', lang === 'en' ? 'Switch to Japanese' : '英語に切り替える');
    }
    render();
  }

  /* ------------------------------------------------------------ 明暗切替 */
  function applyTheme(mode) {
    if (mode) document.documentElement.setAttribute('data-theme', mode);
    else document.documentElement.removeAttribute('data-theme');
    try { mode ? localStorage.setItem('pb-theme', mode) : localStorage.removeItem('pb-theme'); } catch (e) {}
    var btn = document.getElementById('theme');
    if (btn) {
      var cur = document.documentElement.getAttribute('data-theme');
      btn.textContent = cur === 'dark' ? '青焼き' : (cur === 'light' ? '製図用紙' : '地の色');
    }
  }

  /* --------------------------------------------------------------- 起動 */
  function boot() {
    try {
      var saved = localStorage.getItem('pb-theme');
      if (saved) document.documentElement.setAttribute('data-theme', saved);
    } catch (e) {}

    applyLang();
    applyTheme(document.documentElement.getAttribute('data-theme'));

    var lb = document.getElementById('lang');
    if (lb) lb.addEventListener('click', function () { lang = (lang === 'ja' ? 'en' : 'ja'); applyLang(); });

    var tb = document.getElementById('theme');
    if (tb) tb.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      // 地の色 → 反対側 → 元の側 → 地の色
      applyTheme(!cur ? (dark ? 'light' : 'dark') : (cur === (dark ? 'light' : 'dark') ? (dark ? 'dark' : 'light') : null));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
