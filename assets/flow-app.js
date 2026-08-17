/* ==========================================================================
   セクター間資金フロー ── 画面の組み立て

   flow-engine.js（計算）と、それを載せる器（playbench の1ページ、または
   web/index.html の単体版）の間をつなぐ。器は #flow-* の空箱だけを用意する。

   ── データについて ──
   このファイルは数字を1つも持たない。読み込んだ CSV だけを描く。
   仕様書 §0 の「実データ取得前に架空のデータを合成して検証することは、
   ユーザーの明示的な許可がない限り禁止」に従い、見栄えのためのダミーも
   置いていない。何も読み込んでいなければ、何も出ない。

   CSV はブラウザの中だけで読む（FileReader）。どこにも送らない。
   J-Quants の利用規約における第三者提供の可否は仕様書 §10 で未確認のまま
   なので、公開ページ側にデータを置かない作りにしてある。
   ========================================================================== */
'use strict';

(function () {
  var F = window.PBFLOW;
  if (!F) return;

  /* ------------------------------------------------------------ 小物 */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svg(w, h) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    return s;
  }
  function sh(parent, tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    parent.appendChild(n);
    return n;
  }
  function fmt(v, d) {
    if (v == null || !isFinite(v)) return '—';
    return v.toFixed(d == null ? 2 : d);
  }
  function clear(id) {
    var n = document.getElementById(id);
    if (n) n.textContent = '';
    return n;
  }
  function raf(fn) {
    if (window.requestAnimationFrame) window.requestAnimationFrame(fn);
    else setTimeout(fn, 16);
  }

  /* ------------------------------------------------------------- 状態 */
  var S = {
    turnover: null,     /* 読み込んだ売買代金パネル */
    flow: null,         /* 残差化まで済んだフロー変数 */
    est: null,          /* 窓1つぶんの推定結果 */
    gate: null,         /* 帰無分布のゲートを通したエッジ */
    roll: null,         /* ローリング総連結度 */
    busy: false,
    params: {
      window: 250, p: 2, H: 10, ridgeAlpha: 0,
      residualize: true, betaWindow: 250,
      nBoot: 200, block: 20, alpha: 0.10, girfQ: 0.90, seed: 0,
      rollStep: 5
    }
  };

  /* ═══════════════════════════════════════════════════ 読み込みの箱 */

  function buildLoad() {
    var host = clear('flow-load');
    if (!host) return;

    var box = el('div', 'fl-load');

    var row = el('div', 'fl-load__row');
    var label = el('label', 'btn fl-file');
    label.appendChild(el('span', null, 'CSV を選ぶ'));
    var input = el('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) readFile(e.target.files[0]);
    });
    label.appendChild(input);
    row.appendChild(label);

    var st = el('span', 'fl-load__st', '未読込');
    st.id = 'flow-loadstate';
    row.appendChild(st);
    box.appendChild(row);

    /* 落として読ませる */
    box.addEventListener('dragover', function (e) {
      e.preventDefault(); box.classList.add('is-over');
    });
    box.addEventListener('dragleave', function () { box.classList.remove('is-over'); });
    box.addEventListener('drop', function (e) {
      e.preventDefault(); box.classList.remove('is-over');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]);
    });

    var help = el('details', 'fl-help');
    help.appendChild(el('summary', null, 'どんな CSV を渡すのか'));
    var body = el('div', 'fl-help__b');

    body.appendChild(el('p', null,
      '1列目に日付、2列目以降に業種、値は日次の売買代金（円）。'
      + 'ヘッダ1行。仕様書 §4 の業種別売買代金パネル '
      + '（interim/sector_turnover_sector17.parquet）を CSV に落としたものです。'));

    var pre = el('pre', 'fl-code');
    pre.textContent = [
      'date,1,2,3,...,17',
      '2016-01-04,83500000000,21400000000,...',
      '2016-01-05,79200000000,22800000000,...'
    ].join('\n');
    body.appendChild(pre);

    body.appendChild(el('p', null,
      '列名が TOPIX-17 の業種コード（1〜17）なら、表示だけ業種名に置き換えます。'
      + 'それ以外の列名はそのまま使います。33業種でも動きますが、'
      + '仕様書 §5 のとおり 250 日窓では ridge が要ります。'));

    body.appendChild(el('p', 'fl-warn',
      '読み込みはブラウザの中だけで完結します。ファイルはどこにも送りません。'
      + 'このページ自体もデータを持っていません。'));

    help.appendChild(body);
    box.appendChild(help);
    host.appendChild(box);
  }

  function readFile(file) {
    var st = document.getElementById('flow-loadstate');
    if (st) st.textContent = '読み込み中…';
    var fr = new FileReader();
    fr.onerror = function () { if (st) st.textContent = 'ファイルを読めませんでした'; };
    fr.onload = function () {
      try {
        var t = F.parseCsv(String(fr.result));
        t.labels = F.labelSectors(t.names);
        S.turnover = t;
        S.flow = null; S.est = null; S.gate = null; S.roll = null;
        rebuildFlow();
        if (st) {
          st.textContent = t.names.length + '業種 / ' + t.values.length + '行 / '
            + t.dates[0] + '〜' + t.dates[t.dates.length - 1]
            + (t.skipped ? '（列数の合わない ' + t.skipped + ' 行は捨てた）' : '');
        }
        buildParams();
        buildEmpty('推定していません。下の「推定する」を押してください。');
      } catch (err) {
        S.turnover = null;
        if (st) st.textContent = '読めませんでした: ' + err.message;
      }
    };
    fr.readAsText(file, 'utf-8');
  }

  /* 売買代金 → フロー変数（§4 の手順） */
  function rebuildFlow() {
    if (!S.turnover) return;
    var p = S.params;
    S.flow = F.buildFlowSeries(S.turnover, {
      residualize: p.residualize,
      betaWindow: p.residualize ? (p.betaWindow || null) : null
    });
    S.flow.labels = F.labelSectors(S.flow.names);
  }

  /* ═══════════════════════════════════════════════════════ つまみ */

  var FIELDS = [
    { k: 'window', t: '窓長', unit: '営業日', min: 60, max: 5000, step: 10,
      note: '仕様書 §2.5-2 の検出力問題。250 日・17業種・p=2 は1式35パラメータに対し有効標本248で、比が約7。' },
    { k: 'p', t: 'ラグ次数 p', unit: '', min: 1, max: 6, step: 1, note: 'BIC で確認すること。' },
    { k: 'H', t: 'ホライズン H', unit: '営業日', min: 1, max: 40, step: 1,
      note: '測定スケールであって予測期間ではない。' },
    { k: 'ridgeAlpha', t: 'ridge', unit: '', min: 0, max: 100, step: 0.5,
      note: '0 で無効。33業種＋250日窓では必須。' },
    { k: 'betaWindow', t: 'β の窓', unit: '営業日', min: 0, max: 2000, step: 10,
      note: '0 で全期間 β。ローリング連結度を出すなら全期間 β は将来情報の混入になる。' },
    { k: 'nBoot', t: 'ブートストラップ', unit: '回', min: 20, max: 2000, step: 20, note: '' },
    { k: 'block', t: 'ブロック長', unit: '', min: 2, max: 120, step: 1, note: '' },
    { k: 'alpha', t: 'FDR の α', unit: '', min: 0.01, max: 0.5, step: 0.01,
      note: '17業種なら136ペアぶんの多重検定。' },
    { k: 'girfQ', t: '符号ゲートの分位点', unit: '', min: 0.5, max: 0.999, step: 0.005,
      note: '帰無分布の |累積GIRF| のこの分位点を girf_tol にする。内側は ambiguous。' },
    { k: 'seed', t: '乱数の種', unit: '', min: 0, max: 9999, step: 1,
      note: '同じ種なら同じ結果。' },
    { k: 'rollStep', t: 'ローリングの間引き', unit: '営業日ごと', min: 1, max: 40, step: 1,
      note: '総連結度の推移だけに効く。1 にすると全営業日で推定するので重い。' }
  ];

  function buildParams() {
    var host = clear('flow-params');
    if (!host || !S.turnover) return;

    var grid = el('div', 'fl-params');
    FIELDS.forEach(function (f) {
      var w = el('label', 'fl-param');
      w.appendChild(el('span', 'fl-param__t', f.t));
      var inp = el('input', 'fl-param__i num');
      inp.type = 'number';
      inp.min = f.min; inp.max = f.max; inp.step = f.step;
      inp.value = S.params[f.k];
      inp.addEventListener('change', function () {
        var v = Number(inp.value);
        if (!isFinite(v)) { inp.value = S.params[f.k]; return; }
        v = Math.min(f.max, Math.max(f.min, v));
        inp.value = v;
        S.params[f.k] = v;
        if (f.k === 'betaWindow') rebuildFlow();
      });
      w.appendChild(inp);
      if (f.unit) w.appendChild(el('span', 'fl-param__u', f.unit));
      if (f.note) w.appendChild(el('span', 'fl-param__n', f.note));
      grid.appendChild(w);
    });

    /* 残差化の有無だけは真偽値 */
    var rw = el('label', 'fl-param fl-param--check');
    var rc = el('input');
    rc.type = 'checkbox'; rc.checked = S.params.residualize;
    rc.addEventListener('change', function () {
      S.params.residualize = rc.checked; rebuildFlow();
    });
    rw.appendChild(rc);
    rw.appendChild(el('span', 'fl-param__t', '市場共通成分を β 調整で除く'));
    rw.appendChild(el('span', 'fl-param__n',
      '外すと全業種が同時に膨らむ見せかけの連結度が支配的になる。'
      + 'シェアの CLR 変換は共分散行列を特異にするので使わない（§2.6）。'));
    grid.appendChild(rw);

    host.appendChild(grid);

    var act = el('div', 'fl-act');
    var b1 = el('button', 'btn btn--go', '推定する');
    b1.type = 'button';
    b1.addEventListener('click', runEstimate);
    act.appendChild(b1);

    var b2 = el('button', 'btn', '総連結度の推移を出す');
    b2.type = 'button';
    b2.addEventListener('click', runRolling);
    act.appendChild(b2);

    var prog = el('span', 'fl-act__st');
    prog.id = 'flow-progress';
    act.appendChild(prog);
    host.appendChild(act);

    var n = S.flow ? S.flow.values.length : 0;
    host.appendChild(el('p', 'fl-note',
      'フロー変数は ' + n + ' 行。'
      + (S.params.residualize && S.params.betaWindow
        ? 'ローリング β（' + S.params.betaWindow + '日）で窓の分だけ先頭が落ちています。' : '')));
  }

  function say(msg) {
    var n = document.getElementById('flow-progress');
    if (n) n.textContent = msg || '';
  }
  function lock(on) {
    S.busy = on;
    var host = document.getElementById('flow-params');
    if (!host) return;
    Array.prototype.forEach.call(host.querySelectorAll('button, input'), function (b) {
      b.disabled = on;
    });
  }

  /* ═══════════════════════════════════════════════════════ 推定 */

  function runEstimate() {
    if (S.busy || !S.flow) return;
    var p = S.params;

    if (S.flow.values.length < p.window) {
      say('フロー変数が ' + S.flow.values.length + ' 行しかありません。窓長を下げてください。');
      return;
    }
    lock(true);
    say('VAR を推定中…');

    raf(function () {
      var runner;
      try {
        /* 窓1つぶん。表は行正規化、方向判定はスカラー正規化（§2.5 対策1） */
        S.est = F.estimate(S.flow, {
          window: p.window, p: p.p, H: p.H,
          ridgeAlpha: p.ridgeAlpha || null, normalize: 'scalar'
        });
        var X = S.est.values;
        runner = F.bootstrapRunner(X, {
          p: p.p, H: p.H, nBoot: p.nBoot, block: p.block,
          ridgeAlpha: p.ridgeAlpha || null, normalize: 'scalar',
          nullModel: 'no_crosslag', returnGirf: true, seed: p.seed
        });
      } catch (err) {
        lock(false); say('推定できませんでした: ' + err.message);
        return;
      }

      /* 帰無分布は少しずつ回す。一息にやると画面が固まる */
      (function pump() {
        try {
          runner.step(8);
        } catch (err) {
          lock(false); say('ブートストラップが落ちました: ' + err.message);
          return;
        }
        say('帰無分布（交差ラグゼロ）を作成中… ' + runner.done + ' / ' + runner.total);
        if (!runner.finished) { raf(pump); return; }

        var boot = runner.result();
        S.gate = F.gateEdges(S.est.edges, boot, { alpha: p.alpha, girfQ: p.girfQ });
        S.est.boot = boot;

        lock(false);
        say(boot.failed
          ? '完了（' + boot.failed + ' 回は推定できず捨てた）'
          : '完了');
        drawAll();
      })();
    });
  }

  function runRolling() {
    if (S.busy || !S.flow) return;
    var p = S.params;
    if (S.flow.values.length <= p.window) {
      say('窓長より長い系列が要ります。'); return;
    }
    lock(true);

    var runner;
    try {
      /* %解釈をするので、ここは行正規化。§6.4-1 の指摘に対応して
         normalize を引数に出してある。 */
      runner = F.rollingRunner(S.flow, {
        window: p.window, p: p.p, H: p.H, step: p.rollStep,
        ridgeAlpha: p.ridgeAlpha || null, normalize: 'row'
      });
    } catch (err) {
      lock(false); say('できませんでした: ' + err.message); return;
    }

    (function pump() {
      var t0 = Date.now();
      while (!runner.finished && Date.now() - t0 < 60) runner.step(1);
      say('ローリング推定中… ' + runner.done + ' / ' + runner.total);
      if (!runner.finished) { raf(pump); return; }
      S.roll = runner.result();
      lock(false);
      say(S.roll.failed ? '完了（' + S.roll.failed + ' 窓は推定できず）' : '完了');
      drawRolling();
    })();
  }

  /* ═══════════════════════════════════════════════ 有向ネットワーク */

  function buildEmpty(msg) {
    ['flow-net', 'flow-edges', 'flow-table'].forEach(function (id) {
      var h = clear(id);
      if (h) h.appendChild(el('p', 'blank', msg));
    });
  }

  function drawAll() { drawNet(); drawEdges(); drawTable(); }

  function drawNet() {
    var host = clear('flow-net');
    if (!host || !S.est || !S.gate) return;

    var est = S.est, names = est.names;
    var labels = S.flow.labels || names;
    var N = names.length;
    var drawn = S.gate.edges.filter(function (e) { return e.drawn; });

    /* ノードの大きさ ∝ その窓での売買代金シェア。
       売買代金そのものは turnover 側にしか無いので、日付で引き当てる。 */
    var share = sectorShare(est.from, est.to, N);
    var netD = est.table.net;               /* 純流出（正）／純流入（負） */
    var maxNet = Math.max.apply(null, netD.map(Math.abs)) || 1;

    /* 横は業種名がはみ出さない幅を取る。「情報通信・サービスその他」が
       いちばん長く、円の外側にさらにその分の余白が要る。 */
    var W = 900, Hh = 600, cx = W / 2, cy = Hh / 2, R = 205;
    var s = svg(W, Hh);
    s.setAttribute('class', 'fl-net');
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label',
      '業種間の推定資金フロー。矢印 ' + drawn.length + ' 本。');

    /* 矢じり。markerUnits を既定のままにすると線の太さに比例して
       巨大になる（太さ5の線で7倍＝35単位）。userSpaceOnUse で固定する。
       色は defs の中では currentColor が引き継がれないので、
       クラスを付けて CSS 側で塗る。 */
    var defs = sh(s, 'defs', {});
    var mk = sh(defs, 'marker', {
      id: 'fl-ah', viewBox: '0 0 10 10', refX: 9, refY: 5,
      markerUnits: 'userSpaceOnUse', markerWidth: 11, markerHeight: 11,
      orient: 'auto-start-reverse'
    });
    sh(mk, 'path', { d: 'M0 0 L10 5 L0 10 z', class: 'fl-ah' });

    /* ノードの位置。円周に等間隔 */
    var pos = [];
    for (var i = 0; i < N; i++) {
      var a = (i / N) * Math.PI * 2 - Math.PI / 2;
      pos.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), a: a });
    }

    /* エッジ。太さ ∝ net、向き = flow_from → flow_to（＝資金の向き）。
       先導の向きではない。§2.4 のとおり両者は逆になる。 */
    var maxW = Math.max.apply(null, drawn.map(function (e) { return e.net; })) || 1;
    var gEdge = sh(s, 'g', { class: 'fl-net__edges' });

    drawn.forEach(function (e) {
      var a = pos[e.flowFromIdx], b = pos[e.flowToIdx];
      if (!a || !b) return;
      var rNode = 10 + 26 * Math.sqrt(share[e.flowToIdx]);
      /* 矢の先をノードの縁で止める。矢じりのぶん（11）も引いておかないと
         丸に食い込む */
      var dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
      var back = rNode + 12;
      var ex = b.x - dx / L * back, ey = b.y - dy / L * back;
      /* 中心側へ膨らませる。直線だと重なって読めない */
      var mx = (a.x + ex) / 2, my = (a.y + ey) / 2;
      var qx = mx + (cx - mx) * 0.34, qy = my + (cy - my) * 0.34;

      sh(gEdge, 'path', {
        d: 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1)
          + ' Q' + qx.toFixed(1) + ' ' + qy.toFixed(1)
          + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1),
        fill: 'none',
        'stroke-width': (0.9 + 4.6 * (e.net / maxW)).toFixed(2),
        'marker-end': 'url(#fl-ah)',
        class: 'fl-edge'
      }).appendChild(titleOf(
        e.flowFrom + ' → ' + e.flowTo
        + '\nnet ' + fmt(e.net, 3) + F.unitOf(est.normalize)
        + '\n累積GIRF ' + fmt(e.girf, 3)
        + '\n先導は ' + e.driver + '（資金の向きとは逆）'
        + '\np = ' + fmt(e.p, 3)));
    });

    /* ノード */
    var gNode = sh(s, 'g', { class: 'fl-net__nodes' });
    for (i = 0; i < N; i++) {
      var r = 10 + 26 * Math.sqrt(share[i]);
      var strength = Math.abs(netD[i]) / maxNet;
      var g = sh(gNode, 'g', {
        class: 'fl-node ' + (netD[i] >= 0 ? 'is-out' : 'is-in')
      });
      sh(g, 'circle', {
        cx: pos[i].x.toFixed(1), cy: pos[i].y.toFixed(1), r: r.toFixed(1),
        'fill-opacity': (0.10 + 0.55 * strength).toFixed(3)
      }).appendChild(titleOf(
        labels[i]
        + '\n売買代金シェア ' + fmt(share[i] * 100, 1) + '%'
        + '\nTO ' + fmt(est.table.to[i], 1) + '% / FROM ' + fmt(est.table.from[i], 1) + '%'
        + '\nNET ' + fmt(netD[i], 1) + 'pp'));

      /* 見出しは円の外側。左半分は右揃えにする */
      var out = 1 + (r + 13) / R;
      var lx = cx + (pos[i].x - cx) * out, ly = cy + (pos[i].y - cy) * out;
      var right = pos[i].x >= cx - 1;
      var tx = sh(g, 'text', {
        x: lx.toFixed(1), y: ly.toFixed(1),
        'text-anchor': right ? 'start' : 'end',
        'dominant-baseline': 'middle', class: 'fl-node__t'
      });
      tx.textContent = labels[i];
    }

    host.appendChild(s);
    host.appendChild(legend(drawn.length));
  }

  function titleOf(text) {
    var t = document.createElementNS(SVGNS, 'title');
    t.textContent = text;
    return t;
  }

  /* その窓での業種別売買代金シェア（ノードの大きさ用）。
     turnover が無ければ均等にする。 */
  function sectorShare(from, to, N) {
    var t = S.turnover, sum = new Float64Array(N), tot = 0;
    if (t) {
      for (var r = 0; r < t.values.length; r++) {
        if (t.dates[r] < from || t.dates[r] > to) continue;
        for (var i = 0; i < N && i < t.names.length; i++) {
          var v = t.values[r][i];
          if (isFinite(v) && v > 0) { sum[i] += v; tot += v; }
        }
      }
    }
    var out = new Array(N);
    for (var j = 0; j < N; j++) out[j] = tot > 0 ? sum[j] / tot : 1 / N;
    return out;
  }

  function legend(nDrawn) {
    var est = S.est, g = S.gate;
    var box = el('div', 'fl-legend');

    box.appendChild(el('p', 'fl-legend__l',
      '矢印は資金の向き（流出側 → 流入側）で、先導の向きとは逆です。'
      + '太さは net、丸の大きさは売買代金シェア、'
      + '地の濃さは純流出（朱）と純流入（藍）の大きさ。'));

    var ul = el('ul', 'fl-legend__u');
    [
      ['期間', est.from + ' 〜 ' + est.to + '（' + est.obs + '営業日）'],
      ['VAR', 'p = ' + est.p + ' / H = ' + est.H
        + (est.ridgeAlpha ? ' / ridge = ' + est.ridgeAlpha : ' / ridge なし')],
      ['方向判定の正規化', 'scalar（§2.5 対策1。行正規化はリードラグ皆無でも向きを作る）'],
      ['矢印のゲート', '帰無仮説「交差ラグなし」の分布を ' + g.nBoot + ' 回、'
        + 'FDR α = ' + g.alpha + ' で補正。通ったのは '
        + S.gate.edges.filter(function (e) { return e.passNet; }).length
        + ' / ' + S.gate.edges.length + ' ペア'],
      ['符号ゲート', 'girf_tol = ' + fmt(g.girfTol, 4)
        + '（帰無分布の |累積GIRF| の ' + (S.params.girfQ * 100).toFixed(1) + '%点）'],
      ['描いた矢印', nDrawn + ' 本（ゲートを通り、かつ代替関係と判定されたもの）']
    ].forEach(function (kv) {
      var li = el('li');
      li.appendChild(el('span', 'fl-legend__k', kv[0]));
      li.appendChild(el('span', 'fl-legend__v', kv[1]));
      ul.appendChild(li);
    });
    box.appendChild(ul);

    if (!nDrawn) {
      box.appendChild(el('p', 'fl-warn',
        '矢印が1本も残りませんでした。ゲートを通らなかったということで、'
        + '「フローが無い」ではありません。仕様書 §2.5-2 のとおり、'
        + '帰無分布の幅は窓長の平方根に反比例します。'
        + '窓長を伸ばすか、α を緩めるかを検討してください。'));
    }
    return box;
  }

  /* ═══════════════════════════════════════════════════ エッジの表 */

  function drawEdges() {
    var host = clear('flow-edges');
    if (!host || !S.gate) return;

    var est = S.est, unit = F.unitOf(est.normalize);
    var rows = S.gate.edges.slice().sort(function (a, b) {
      if (a.drawn !== b.drawn) return a.drawn ? -1 : 1;
      return b.net - a.net;
    });

    var tbl = el('table', 'grid fl-tbl');
    var hr = el('tr');
    ['資金の向き', '先導', 'net (' + unit + ')', '累積GIRF', '関係', 'p', '矢印']
      .forEach(function (h) { hr.appendChild(el('th', null, h)); });
    var th = el('thead'); th.appendChild(hr); tbl.appendChild(th);

    var tb = el('tbody');
    rows.forEach(function (e) {
      var tr = el('tr', e.drawn ? 'is-drawn' : null);

      var flow = el('td', 'grid__n');
      flow.textContent = e.relation === 'rotation'
        ? (label(e.flowFrom) + ' → ' + label(e.flowTo)) : '—';
      tr.appendChild(flow);

      tr.appendChild(el('td', 'grid__by', label(e.driver) + ' → ' + label(e.follower)));
      tr.appendChild(el('td', 'num', fmt(e.net, 3)));
      tr.appendChild(el('td', 'num', fmt(e.girf, 3)));

      var rel = el('td');
      rel.appendChild(el('span', 'fl-rel fl-rel--' + e.relation,
        e.relation === 'rotation' ? '代替'
          : (e.relation === 'comovement' ? '共変動' : '判別不能')));
      tr.appendChild(rel);

      tr.appendChild(el('td', 'num', fmt(e.p, 3)));
      tr.appendChild(el('td', null, e.drawn ? '●' : (e.passNet ? '符号で落選' : '—')));
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);

    var wrap = el('div', 'grid__wrap');
    wrap.appendChild(tbl);
    host.appendChild(wrap);

    host.appendChild(el('p', 'grid__foot',
      'net は θ(b←a) − θ(a←b)。'
      + (est.normalize === 'row'
        ? '行正規化なので百分率として読めます。'
        : 'スカラー正規化なので割合ではありません（§6.4-3）。'
          + '大小の比較にだけ使ってください。')
      + ' 「符号で落選」は net のゲートは通ったが累積GIRF が 0 と'
      + '区別できなかったペアで、共変動か判別不能のどちらかです。'));
  }

  function label(name) {
    if (!S.flow) return name;
    var i = S.flow.names.indexOf(name);
    return (i >= 0 && S.flow.labels) ? S.flow.labels[i] : name;
  }

  /* ═════════════════════════════════════════ connectedness table */

  function drawTable() {
    var host = clear('flow-table');
    if (!host || !S.est) return;
    var t = S.est.table, labels = S.flow.labels || t.names, N = t.names.length;

    var tbl = el('table', 'grid fl-tbl fl-tbl--mat');
    var hr = el('tr');
    hr.appendChild(el('th', null, 'i \\ j'));
    labels.forEach(function (n) { hr.appendChild(el('th', 'fl-th--rot', n)); });
    hr.appendChild(el('th', null, 'FROM'));
    var th = el('thead'); th.appendChild(hr); tbl.appendChild(th);

    var tb = el('tbody');
    for (var i = 0; i < N; i++) {
      var tr = el('tr');
      tr.appendChild(el('td', 'grid__n', labels[i]));
      for (var j = 0; j < N; j++) {
        var v = t.cells[i][j] * 100;
        var td = el('td', 'num' + (i === j ? ' is-diag' : ''), fmt(v, 1));
        if (i !== j) td.style.setProperty('--heat', Math.min(1, v / 12).toFixed(3));
        tr.appendChild(td);
      }
      tr.appendChild(el('td', 'num fl-td--sum', fmt(t.from[i], 1)));
      tb.appendChild(tr);
    }

    var trTo = el('tr', 'fl-tr--sum');
    trTo.appendChild(el('td', 'grid__n', 'TO'));
    for (i = 0; i < N; i++) trTo.appendChild(el('td', 'num', fmt(t.to[i], 1)));
    trTo.appendChild(el('td', 'num', ''));
    tb.appendChild(trTo);

    var trNet = el('tr', 'fl-tr--sum');
    trNet.appendChild(el('td', 'grid__n', 'NET'));
    for (i = 0; i < N; i++) {
      trNet.appendChild(el('td', 'num ' + (t.net[i] >= 0 ? 'is-out' : 'is-in'), fmt(t.net[i], 1)));
    }
    trNet.appendChild(el('td', 'num fl-td--tci', fmt(t.tci, 1)));
    tb.appendChild(trNet);
    tbl.appendChild(tb);

    var wrap = el('div', 'grid__wrap');
    wrap.appendChild(tbl);
    host.appendChild(wrap);

    host.appendChild(el('p', 'grid__foot',
      '行正規化した GFEVD（単位 %、行和 100）。'
      + '右下は総連結度 ' + fmt(t.tci, 1) + '%。'
      + 'この表は Diebold-Yilmaz の connectedness table そのもので、'
      + '%解釈をするので行正規化を使っています。'
      + '上の矢印はこの表ではなくスカラー正規化のほうから作っています。'));
  }

  /* ═══════════════════════════════════════════ 総連結度の推移 */

  function drawRolling() {
    var host = clear('flow-tci');
    if (!host || !S.roll) return;
    var r = S.roll;

    var vals = r.tci.filter(isFinite);
    if (!vals.length) {
      host.appendChild(el('p', 'blank', 'どの窓でも推定できませんでした。'));
      return;
    }
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var pad = (hi - lo) * 0.12 || 1;
    lo -= pad; hi += pad;

    var W = 760, Hh = 260, mL = 46, mR = 12, mT = 14, mB = 30;
    var iw = W - mL - mR, ih = Hh - mT - mB;
    var s = svg(W, Hh);
    s.setAttribute('class', 'fl-chart');
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', '総連結度の推移');

    var X = function (i) { return mL + iw * (r.dates.length < 2 ? 0.5 : i / (r.dates.length - 1)); };
    var Y = function (v) { return mT + ih * (1 - (v - lo) / (hi - lo)); };

    /* 横罫と目盛り */
    for (var k = 0; k <= 4; k++) {
      var v = lo + (hi - lo) * k / 4, y = Y(v);
      sh(s, 'line', { x1: mL, y1: y.toFixed(1), x2: W - mR, y2: y.toFixed(1), class: 'fl-chart__rule' });
      var tx = sh(s, 'text', { x: mL - 7, y: y.toFixed(1), 'text-anchor': 'end',
        'dominant-baseline': 'middle', class: 'fl-chart__ax num' });
      tx.textContent = v.toFixed(0) + '%';
    }

    /* 折れ線。欠測で切る */
    var d = '', pen = false;
    r.tci.forEach(function (v, i) {
      if (!isFinite(v)) { pen = false; return; }
      d += (pen ? ' L' : ' M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1);
      pen = true;
    });
    sh(s, 'path', { d: d.trim(), fill: 'none', class: 'fl-chart__line' });

    /* 年の区切り */
    var seen = {};
    r.dates.forEach(function (dt, i) {
      var y = String(dt).slice(0, 4);
      if (seen[y] || !/^\d{4}$/.test(y)) return;
      seen[y] = true;
      sh(s, 'line', { x1: X(i).toFixed(1), y1: mT, x2: X(i).toFixed(1), y2: mT + ih,
        class: 'fl-chart__year' });
      var t2 = sh(s, 'text', { x: X(i).toFixed(1), y: Hh - 9, 'text-anchor': 'middle',
        class: 'fl-chart__ax num' });
      t2.textContent = y;
    });

    host.appendChild(s);

    /* ゲート4。2020年3月にスパイクしているか、数字で見せる */
    host.appendChild(gate4(r));
  }

  /* 仕様書 §9 フェーズ4のゲート。
     危機時の総連結度上昇は Diebold-Yilmaz 系実証でもっとも頑健な現象で、
     実装の外部検証になる。通らなければ先へ進まない、と仕様書は書いている。
     ここでは判定を代行せず、比べるための数字を並べるところまでやる。 */
  function gate4(r) {
    var box = el('div', 'fl-gate');
    box.appendChild(el('p', 'fl-gate__t', 'ゲート4 ── 2020年3月にスパイクしているか'));

    var inCrisis = [], outside = [];
    r.dates.forEach(function (d, i) {
      var v = r.tci[i];
      if (!isFinite(v)) return;
      var ym = String(d).slice(0, 7);
      if (ym === '2020-02' || ym === '2020-03' || ym === '2020-04') inCrisis.push(v);
      else outside.push(v);
    });

    if (!inCrisis.length) {
      box.appendChild(el('p', 'fl-warn',
        '2020年2〜4月がこの系列に入っていません。'
        + 'ゲート4を掛けるには、その時期を含む期間で取り直してください。'
        + '仕様書 §3.3 のとおり10年ローリングなので、'
        + 'コロナショックは取得を先延ばしにすると取れなくなります。'));
      return box;
    }

    var mean = function (a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; };
    var sd = function (a) {
      var m = mean(a);
      return Math.sqrt(a.reduce(function (x, y) { return x + (y - m) * (y - m); }, 0) / Math.max(1, a.length - 1));
    };
    var mc = mean(inCrisis), mo = mean(outside), so = sd(outside);
    var z = so > 0 ? (mc - mo) / so : NaN;
    var peak = Math.max.apply(null, inCrisis);

    var ul = el('ul', 'fl-legend__u');
    [
      ['2020年2〜4月の平均', fmt(mc, 2) + '%（' + inCrisis.length + '窓）'],
      ['それ以外の平均', fmt(mo, 2) + '%（' + outside.length + '窓、標準偏差 ' + fmt(so, 2) + '）'],
      ['差の z', fmt(z, 2)],
      ['危機期の最大値', fmt(peak, 2) + '%'],
      ['全期間の最大値', fmt(Math.max.apply(null, r.tci.filter(isFinite)), 2) + '%']
    ].forEach(function (kv) {
      var li = el('li');
      li.appendChild(el('span', 'fl-legend__k', kv[0]));
      li.appendChild(el('span', 'fl-legend__v', kv[1]));
      ul.appendChild(li);
    });
    box.appendChild(ul);

    box.appendChild(el('p', 'fl-note',
      z > 1
        ? '危機期のほうが高く出ています。ただし窓長 ' + r.window
          + '日のローリングは危機を長く引きずるので、'
          + 'この差だけで実装が正しいと結論しないでください。'
        : '危機期が目立って高くなっていません。仕様書 §9 は、'
          + 'この場合の原因は変数構築（残差化・ラグ次数・欠損処理）にあることが'
          + '多いと書いています。ここが通らないうちは矢印を読まないでください。'));
    return box;
  }

  /* ═══════════════════════════════════════════════════════ 起動 */

  function boot() {
    if (!document.getElementById('flow-load')) return;
    buildLoad();
    buildEmpty('CSV を読み込むと、ここに出ます。'
      + 'このページはデータを持っていないので、読み込むまでは何も表示しません。');
    var t = clear('flow-tci');
    if (t) t.appendChild(el('p', 'blank', 'CSV を読み込んで「総連結度の推移を出す」を押してください。'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
