/* ==========================================================================
   需給フロー ── 3レイヤーの絞り込み。画面の組み立て

   ★ この頁自身はデータを持たない。同じ場所に data/demand_flow.json が
     置いてあれば自動で読み、無ければファイル選択に落ちる。

     診断には銘柄コードと終値が入るので、**JSON を公開の置き場に置いては
     いけない。** 置いた瞬間に、銘柄別データを誰でも取得できる状態になる
     （静的な頁が fetch する URL は、頁を見られる人には必ず読める。
     鍵を頁に埋めても鍵にならない）。

     置いてよいのは、ローカルか、閲覧に認証の掛かった配備先だけ。
     playbench（public）には JSON を置かない ── 検査で見ている。

   作り方:
     python python/demand_flow.py screen --root data/jquants \
       --out-json web/data/demand_flow.json
   ========================================================================== */
(function () {
  'use strict';

  var SECTOR17 = {
    '1': '食品', '2': 'エネルギー資源', '3': '建設・資材', '4': '素材・化学',
    '5': '医薬品', '6': '自動車・輸送機', '7': '鉄鋼・非鉄', '8': '機械',
    '9': '電機・精密', '10': '情報通信・サービスその他', '11': '電気・ガス',
    '12': '運輸・物流', '13': '商社・卸売', '14': '小売', '15': '銀行',
    '16': '金融（除く銀行）', '17': '不動産'
  };

  var REGIME = {
    REGIME_B: { key: 'buy', cls: 'dm-b', short: 'B 買い推奨' },
    REGIME_C: { key: 'avoid', cls: 'dm-c', short: 'C 厳禁' },
    REGIME_A: { key: 'watch', cls: '', short: 'A 様子見' }
  };

  /* 1画面に出す上限。厳禁が数百件になることがあり、全部描くと
     行数だけで読めなくなる。件数そのものは必ず出す。 */
  var MAX_ROWS = 200;

  /* 同じ場所に置いてあれば自動で読む。無ければ静かに諦めてファイル選択に
     落ちる ── public な配備では「無い」のが正しい状態なので、
     ここで赤字を出すと毎回エラーが見えることになる。 */
  var BUNDLED = 'data/demand_flow.json';

  var st = { data: null, view: 'buy', source: null };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function clear(id) {
    var h = document.getElementById(id);
    if (h) h.textContent = '';
    return h;
  }
  function say(msg) {
    var h = document.getElementById('dm-state');
    if (h) h.textContent = msg;
  }
  function sector(code) {
    return SECTOR17[String(code)] || ('業種' + code);
  }
  function num(x, digits) {
    if (x == null || isNaN(x)) return '—';
    return Number(x).toLocaleString('ja-JP', {
      minimumFractionDigits: digits == null ? 0 : digits,
      maximumFractionDigits: digits == null ? 0 : digits
    });
  }
  function pct(x, digits) {
    if (x == null || isNaN(x)) return '—';
    return (x * 100).toFixed(digits == null ? 1 : digits) + '%';
  }
  /* 千円単位で来る。桁が大きいので億円に直す ── 生の千円だと
     -437811189 のような数が並んで、大小が読み取れない。 */
  function oku(thousandYen) {
    if (thousandYen == null || isNaN(thousandYen)) return '—';
    return (thousandYen / 100000).toFixed(0);
  }

  /* ─────────────────────────────────────── 検証

     読めない JSON を黙って空の画面にしない。どこが足りないかを言う。 */

  function validate(d) {
    if (!d || typeof d !== 'object') throw new Error('JSON の中身がオブジェクトではありません。');
    if (!('as_of' in d)) {
      throw new Error('as_of がありません。demand_flow.py screen --out-json で作った JSON ですか。');
    }
    ['buy', 'avoid', 'watch'].forEach(function (k) {
      if (!Array.isArray(d[k])) throw new Error(k + ' が配列ではありません。');
    });
    if (!Array.isArray(d.sector_stress)) throw new Error('sector_stress が配列ではありません。');
    if (!Array.isArray(d.flow_weeks)) throw new Error('flow_weeks が配列ではありません。');
    return d;
  }

  /* ─────────────────────────────────────── 読み込み */

  function buildLoad() {
    var host = clear('dm-load');
    if (!host) return;
    var box = el('div', 'dm-load');
    var row = el('div', 'dm-load__row');

    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) read(f);
    });
    row.appendChild(inp);
    box.appendChild(row);

    box.appendChild(el('p', 'dm-help',
      'この頁と同じ場所に data/demand_flow.json があれば自動で読みます。'
      + '無ければ、python/demand_flow.py screen --out-json で作った JSON を'
      + 'ここから選んでください。'
      + '選んだファイルは、あなたのブラウザから外に出ません。'));

    var state = el('p', 'dm-load__state', '未読込');
    state.id = 'dm-state';
    box.appendChild(state);
    host.appendChild(box);
  }

  function read(file) {
    var r = new FileReader();
    r.onload = function () { accept(r.result, 'file'); };
    r.onerror = function () { say('ファイルを開けませんでした。'); };
    r.readAsText(file);
  }

  function accept(text, source) {
    try {
      st.data = validate(JSON.parse(text));
    } catch (err) {
      st.data = null;
      say((source === 'auto' ? 'この頁のデータが読めません: ' : '読めませんでした: ')
        + err.message);
      blank();
      return false;
    }
    st.source = source || 'file';
    var d = st.data;
    say('判断日 ' + d.as_of
      + ' / 買い ' + d.counts.buy + '件・様子見 ' + d.counts.watch + '件・厳禁 ' + d.counts.avoid + '件'
      + (d.generated ? '（作成 ' + d.generated + '）' : ''));
    /* ゲートが閉じていれば買いは常に0件。開いた最初のタブが空だと
       「壊れている」と読まれるので、中身のある側を初期表示にする。 */
    st.view = d.counts.buy > 0 ? 'buy' : (d.counts.avoid > 0 ? 'avoid' : 'watch');
    drawAll();
    return true;
  }

  function blank() {
    ['dm-head', 'dm-l1', 'dm-l2', 'dm-l3'].forEach(function (id) {
      var h = clear(id);
      if (h) h.appendChild(el('p', 'blank', 'JSON を読み込むと、ここに出ます。'));
    });
    clear('dm-l3tabs');
  }

  /* ─────────────────────────────────────── 判断日とゲート */

  function drawHead() {
    var host = clear('dm-head');
    if (!host) return;
    var d = st.data;

    var box = el('div', 'dm-head');
    function stat(k, v, cls) {
      var w = el('div', 'dm-stat');
      w.appendChild(el('div', 'dm-stat__k', k));
      w.appendChild(el('div', 'dm-stat__v' + (cls ? ' ' + cls : ''), v));
      box.appendChild(w);
    }
    stat('判断日', d.as_of || '—');
    stat('ゲート', d.gate_open ? '開' : '閉', d.gate_open ? 'dm-open' : 'dm-shut');
    stat('連続買い越し', (d.foreign_streak == null ? '—' : d.foreign_streak + ' 週'));
    stat('買い推奨', d.counts.buy + ' 件');
    host.appendChild(box);

    /* どこで止まったか。ゲートが閉じた日は Layer 3 が動いていない */
    var passed = (d.sector_stress || []).filter(function (x) { return x.passed; }).length;
    var f = el('div', 'dm-funnel');
    function step(text, state) { f.appendChild(el('span', 'dm-step is-' + state, text)); }
    function arrow() { f.appendChild(el('span', 'dm-arrow', '→')); }

    /* ゲートが閉じた日でも Layer 1 は仕事をしている（全業種を順位づけている）。
       ここを「上位0業種」と書くと Layer 1 が失敗したように読めるが、
       止めたのは Layer 2 である。どの段で止まったかを取り違えさせない。 */
    var ranked = (d.sector_stress || []).length;
    if (d.gate_open) {
      step('Layer 1  上位' + passed + '業種', 'pass');
    } else {
      step('Layer 1  ' + ranked + '業種を順位づけ', ranked ? 'pass' : 'stop');
    }
    arrow();
    step('Layer 2  ' + (d.gate_open ? 'ゲート開' : 'ゲート閉'), d.gate_open ? 'pass' : 'stop');
    arrow();
    var n = d.counts.buy + d.counts.watch + d.counts.avoid;
    step('Layer 3  ' + (d.gate_open ? n + '銘柄を診断' : '診断せず'), d.gate_open ? 'pass' : 'skip');
    host.appendChild(f);

    if (d.note) host.appendChild(el('p', 'dm-note', d.note));
    if (d.flow_source) host.appendChild(el('p', 'dm-src', 'フロー: ' + d.flow_source));
  }

  /* ─────────────────────────────────────── Layer 1 */

  function drawL1() {
    var host = clear('dm-l1');
    if (!host) return;
    var rows = st.data.sector_stress || [];
    if (!rows.length) {
      host.appendChild(el('p', 'blank', '業種のストレスがありません。'));
      return;
    }
    var max = 0;
    rows.forEach(function (r) { if (r.stress != null && r.stress > max) max = r.stress; });
    if (!(max > 0)) max = 1;

    var wrap = el('div', 'grid__wrap');
    var t = el('table', 'grid dm-tbl');
    var hd = el('tr');
    ['順位', '業種', 'ストレス', '', ''].forEach(function (h, i) {
      var th = el('th', null, h);
      if (i === 4) th.style.width = '40%';
      hd.appendChild(th);
    });
    t.appendChild(el('thead')).appendChild(hd);

    var tb = el('tbody');
    var lastPassed = -1;
    rows.forEach(function (r, i) { if (r.passed) lastPassed = i; });

    rows.forEach(function (r, i) {
      var tr = el('tr', r.passed ? 'is-pass' : '');
      if (i === lastPassed) tr.className += ' dm-cut';
      tr.appendChild(el('td', 'num', String(r.rank)));
      tr.appendChild(el('td', 'grid__n', sector(r.sector)));
      tr.appendChild(el('td', 'num', r.stress == null ? '—' : r.stress.toFixed(3)));
      tr.appendChild(el('td', null, r.passed ? '通過' : ''));
      var bcell = el('td');
      var bar = el('span', 'dm-bar');
      var fill = el('i');
      fill.style.width = Math.max(1, Math.round((r.stress || 0) / max * 100)) + '%';
      bar.appendChild(fill);
      bcell.appendChild(bar);
      tr.appendChild(bcell);
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    wrap.appendChild(t);
    host.appendChild(wrap);

    if (lastPassed >= 0 && lastPassed + 1 < rows.length) {
      var a = rows[lastPassed], b = rows[lastPassed + 1];
      if (a.stress != null && b.stress != null) {
        host.appendChild(el('p', 'grid__foot',
          '朱の線が足切りです。' + (lastPassed + 1) + '位（' + sector(a.sector) + ' ' + a.stress.toFixed(3)
          + '）と ' + (lastPassed + 2) + '位（' + sector(b.sector) + ' ' + b.stress.toFixed(3)
          + '）の差は ' + Math.abs(b.stress - a.stress).toFixed(3)
          + '。ここが僅差なら、順位は入れ替わりうると見てください。'));
      }
    }
  }

  /* ─────────────────────────────────────── Layer 2 */

  function drawL2() {
    var host = clear('dm-l2');
    if (!host) return;
    var wk = (st.data.flow_weeks || []).slice();
    if (!wk.length) {
      host.appendChild(el('p', 'blank',
        '海外投資家のフローがありません。取得できていないか、判断日の時点で公表済みの週が無い状態です。'));
      return;
    }
    var max = 0;
    wk.forEach(function (r) { var a = Math.abs(r.net || 0); if (a > max) max = a; });
    if (!(max > 0)) max = 1;

    /* 末尾から連続している買い越しが、ゲートの根拠。強調する */
    var streak = 0;
    for (var i = wk.length - 1; i >= 0; i--) { if (wk[i].buying) streak++; else break; }

    var wrap = el('div', 'grid__wrap');
    var t = el('table', 'grid dm-flow');
    var hd = el('tr');
    ['集計週', '公表日', '差引（億円）', '', ''].forEach(function (h, i) {
      var th = el('th', null, h);
      if (i === 4) th.style.width = '45%';
      hd.appendChild(th);
    });
    t.appendChild(el('thead')).appendChild(hd);

    var tb = el('tbody');
    wk.slice().reverse().forEach(function (r, idx) {
      var tr = el('tr', idx < streak ? 'dm-streak' : '');
      tr.appendChild(el('td', 'num', r.week_end));
      tr.appendChild(el('td', 'num grid__by', r.available_from));
      tr.appendChild(el('td', 'num', oku(r.net)));
      tr.appendChild(el('td', null, r.buying ? '買い越し' : '売り越し'));

      var c = el('td');
      var bar = el('span', 'dm-fbar');
      var l = el('span', 'dm-fbar__l'), z = el('span', 'dm-fbar__z'), rr = el('span', 'dm-fbar__r');
      var w = Math.max(1, Math.round(Math.abs(r.net || 0) / max * 100));
      var seg = el('i');
      seg.style.width = w + '%';
      (r.buying ? rr : l).appendChild(seg);
      bar.appendChild(l); bar.appendChild(z); bar.appendChild(rr);
      c.appendChild(bar);
      tr.appendChild(c);
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    wrap.appendChild(t);
    host.appendChild(wrap);

    host.appendChild(el('p', 'grid__foot',
      '新しい週が上です。藍の行が、末尾から連続している買い越し（' + streak + ' 週）。'
      + '中央の縦線が 0 で、右へ伸びるのが買い越し、左が売り越しです。'
      + '公表日は集計週の6〜18日後にばらつきます ── 一律のラグではなく、実際の公表日で判定しています。'));
  }

  /* ─────────────────────────────────────── Layer 3 */

  function drawTabs() {
    var host = clear('dm-l3tabs');
    if (!host) return;
    var d = st.data;
    [['buy', '買い推奨（B）', d.counts.buy],
     ['watch', '様子見（A）', d.counts.watch],
     ['avoid', '厳禁（C）', d.counts.avoid]].forEach(function (x) {
      var b = el('button', 'ctl dm-tab' + (st.view === x[0] ? ' is-on' : ''), x[1] + ' ' + x[2]);
      b.type = 'button';
      b.addEventListener('click', function () { st.view = x[0]; drawTabs(); drawL3(); });
      host.appendChild(b);
    });
  }

  function drawL3() {
    var host = clear('dm-l3');
    if (!host) return;
    var d = st.data;
    var rows = d[st.view] || [];

    if (!rows.length) {
      host.appendChild(el('p', 'blank', !d.gate_open
        ? 'ゲートが閉じているので、診断を行っていません。0件は異常ではありません。'
        : 'この区分に当てはまる銘柄はありません。'));
      return;
    }

    var wrap = el('div', 'grid__wrap');
    var t = el('table', 'grid dm-tbl');
    var hd = el('tr');
    ['コード', '業種', '診断', '株価', 'POC 帯', 'POC からの位置', '信用買残', ''].forEach(function (h, i) {
      var th = el('th', null, h);
      if (i === 7) th.style.width = '22%';
      hd.appendChild(th);
    });
    t.appendChild(el('thead')).appendChild(hd);

    var tb = el('tbody');
    rows.slice(0, MAX_ROWS).forEach(function (r) {
      var meta = REGIME[r.Regime] || { cls: '', short: r.Regime };
      var tr = el('tr', meta.cls);
      tr.appendChild(el('td', 'num grid__n', String(r.Code)));
      tr.appendChild(el('td', null, sector(r.Sector17Code)));
      tr.appendChild(el('td', 'dm-reg', meta.short));
      tr.appendChild(el('td', 'num', num(r.CurrentPrice)));
      tr.appendChild(el('td', 'num grid__by',
        (r.POCLow == null ? '—' : num(r.POCLow)) + '–' + (r.POCHigh == null ? '—' : num(r.POCHigh))));
      tr.appendChild(el('td', 'num', r.DistanceFromPOC == null ? '—' : pct(r.DistanceFromPOC, 1)));
      tr.appendChild(el('td', 'grid__by', r.MarginTrend || '—'));
      tr.appendChild(pocCell(r));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    wrap.appendChild(t);
    host.appendChild(wrap);

    if (rows.length > MAX_ROWS) {
      host.appendChild(el('p', 'dm-more',
        rows.length + ' 件のうち先頭 ' + MAX_ROWS + ' 件を出しています。'
        + '全部を見るには CSV（--out-all）を使ってください。'));
    }
    host.appendChild(el('p', 'grid__foot',
      '右端の図は、POC 帯（灰）と現在の株価（縦線）の位置関係です。'
      + '数字だけだと「帯のすぐ上」と「はるか上」が読み分けられません。'
      + '信用買残は過去1年の下位20%なら DECREASING。診断B はこれが条件に入ります。'));
  }

  /* POC 帯と株価の位置を1本の図にする。
     表示の幅は帯の中心を基準に ±20% を取る。株価がその外なら端に貼り付く
     （外れ値で帯が1pxに潰れるより、貼り付いたほうが読める）。 */
  function pocCell(r) {
    var c = el('td');
    if (r.POCLow == null || r.POCHigh == null || r.CurrentPrice == null) {
      c.appendChild(el('span', 'grid__by', '—'));
      return c;
    }
    var mid = (r.POCLow + r.POCHigh) / 2;
    if (!(mid > 0)) { c.appendChild(el('span', 'grid__by', '—')); return c; }
    var lo = mid * 0.8, hi = mid * 1.2, span = hi - lo;
    function at(v) { return Math.max(0, Math.min(100, (v - lo) / span * 100)); }

    var box = el('span', 'dm-poc');
    var band = el('i', 'dm-poc__band');
    band.style.left = at(r.POCLow) + '%';
    band.style.width = Math.max(1, at(r.POCHigh) - at(r.POCLow)) + '%';
    var px = el('i', 'dm-poc__px');
    px.style.left = at(r.CurrentPrice) + '%';
    box.appendChild(band);
    box.appendChild(px);
    c.appendChild(box);
    return c;
  }

  /* ─────────────────────────────────────── */

  function drawAll() {
    drawHead();
    drawL1();
    drawL2();
    drawTabs();
    drawL3();
  }

  /* 同梱データを取りに行く。無くても壊れない ── public な配備や
     単体で開いたときは 404 になるので、その場合は黙って諦める。 */
  function autoLoad() {
    if (!window.fetch) return;
    fetch(BUNDLED, { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then(function (t) { accept(t, 'auto'); })
      .catch(function () {
        say('未読込（下からファイルを選んでください）');
      });
  }

  function init() {
    buildLoad();
    blank();
    autoLoad();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* 検査から呼ぶ */
  window.PBDEMAND = { validate: validate, accept: accept, state: st, SECTOR17: SECTOR17 };
})();
