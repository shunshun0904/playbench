/* ==========================================================================
   業種別 売買シェアの遷移 ── 画面の組み立て

   計算は share-core.js（PBSHARE）。こちらは DOM だけを見る。
   データは持たない。閲覧者が読み込んだ JSON をそのまま描く。
   ========================================================================== */
(function () {
  'use strict';
  var S = window.PBSHARE;

  /* 同梱データの置き場所。頁からの相対パス。
     sectorflow の Actions が日次で作り、playbench へ push する。
     無ければ（単体版など）静かに諦めて、読み込みの箱だけ出す。 */
  var BUNDLED = 'data/share_sector17.json';

  var st = { data: null, view: 'm3', source: null };

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
    var h = document.getElementById('sh-state');
    if (h) h.textContent = msg;
  }
  function label(code) {
    return (st.data && st.data.labels && st.data.labels[code]) || code;
  }

  /* ─────────────────────────────────────────────── 読み込み */

  function buildLoad() {
    var host = clear('sh-load');
    if (!host) return;
    var box = el('div', 'fl-load');
    var row = el('div', 'fl-load__row');

    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) read(f);
    });
    row.appendChild(inp);
    box.appendChild(row);

    box.appendChild(el('p', 'fl-help',
      '既定では、この頁に置いてある最新のデータを自動で読みます。'
      + '別の期間を見たいときは、python/jquants_fetch.py share-json で作った JSON を選んでください。'
      + '選んだファイルは、あなたのブラウザから外に出ません。'));
    box.appendChild(el('p', 'fl-load__state', '未読込'));
    box.lastChild.id = 'sh-state';
    host.appendChild(box);
  }

  function read(file) {
    var r = new FileReader();
    r.onload = function () { accept(r.result, 'file'); };
    r.onerror = function () { say('ファイルを開けませんでした。'); };
    r.readAsText(file);
  }

  /* 文字列を受け取って、通れば描く。通らなければ理由を言って止まる。
     ファイル選択と自動取得で同じ道を通す。 */
  function accept(text, source) {
    try {
      st.data = S.validate(JSON.parse(text));
    } catch (err) {
      st.data = null;
      say((source === 'auto' ? 'この頁のデータが読めません: ' : '読めませんでした: ')
        + err.message);
      blank('データを読み込むと、ここに出ます。');
      return false;
    }
    st.source = source;
    var d = st.data;
    say((source === 'auto' ? '' : '選んだファイル: ')
      + d.sectors.length + '業種 / ' + d.dates.length + '営業日 / '
      + d.dates[0] + '〜' + d.dates[d.dates.length - 1]
      + (d.generated ? '（作成 ' + d.generated + '）' : ''));
    buildTabs();
    draw();
    return true;
  }

  /* 同梱データを取りに行く。無くても壊れない ── 単体版や、まだ
     置いていない頁では 404 になるので、その場合は黙って諦める。 */
  function autoLoad() {
    if (!window.fetch) return;
    fetch(BUNDLED, { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then(function (t) { accept(t, 'auto'); })
      .catch(function () {
        /* 置いていないだけなら、読み込みの箱から選んでもらえばよい。
           ここで赤字を出すと、単体版で毎回エラーが出ることになる。 */
        say('未読込（下からファイルを選んでください）');
      });
  }

  function blank(msg) {
    ['sh-tabs', 'sh-range'].forEach(function (id) { clear(id); });
    var h = clear('sh-table');
    if (h) h.appendChild(el('p', 'blank', msg));
  }

  /* ─────────────────────────────────────────────── 期間の切り替え */

  function buildTabs() {
    var host = clear('sh-tabs');
    if (!host) return;
    S.VIEWS.forEach(function (v) {
      var b = el('button', 'ctl sh-tab' + (st.view === v.k ? ' is-on' : ''), v.t);
      b.type = 'button';
      b.setAttribute('aria-pressed', st.view === v.k ? 'true' : 'false');
      b.onclick = function () {
        if (st.view === v.k) return;
        st.view = v.k;
        buildTabs();
        draw();
      };
      host.appendChild(b);
    });
  }

  /* ─────────────────────────────────────────────── 本体 */

  function draw() {
    var d = st.data;
    if (!d) return;
    var view = S.VIEWS.filter(function (v) { return v.k === st.view; })[0];
    var cut = S.slice(d, view);
    var n = cut.dates.length;

    var rg = clear('sh-range');
    if (rg) {
      rg.appendChild(el('span', 'tag',
        cut.dates[0] + ' 〜 ' + cut.dates[n - 1] + ' / ' + n + '営業日'));
    }

    var host = clear('sh-table');
    if (!host) return;

    var tbl = el('table', 'grid sh-tbl');
    var hr = el('tr');
    /* 帯の見出しには印を付ける。文字の列だけを内容幅まで縮めたいので、
       この2列を巻き込まないようにするため（巻き込むと帯まで縮む）。 */
    [['業種', 0], ['シェアの遷移', 1], ['直近', 0], ['期間変化', 0],
     ['広がりの遷移', 1], ['直近', 0], ['実効銘柄', 0], ['上位1社', 0]]
      .forEach(function (h) { hr.appendChild(el('th', h[1] ? 'sh-band-h' : null, h[0])); });
    var th = el('thead'); th.appendChild(hr); tbl.appendChild(th);

    var tb = el('tbody');
    S.order(d).forEach(function (c) {
      var sv = d.share[c].slice(cut.from);
      var bv = (d.breadth[c] || []).slice(cut.from);
      var ref = d.ref[c] || [0, 100];

      var tr = el('tr');
      tr.appendChild(el('td', 'grid__n', label(c)));
      tr.appendChild(band(sv, cut.dates, function (v) {
        return S.shareColor(v, ref[0], ref[1]);
      }, 'シェア', '%'));
      tr.appendChild(el('td', 'num', sv[sv.length - 1].toFixed(1) + '%'));
      var chg = sv[sv.length - 1] - sv[0];
      tr.appendChild(el('td', 'num', (chg >= 0 ? '+' : '') + chg.toFixed(1) + 'pp'));
      tr.appendChild(band(bv, cut.dates, S.breadthColor, '広がり', ''));

      var last5 = S.avg(bv.slice(-5));
      tr.appendChild(el('td', 'num', last5 == null ? '—' : last5.toFixed(2)));
      var en = S.avg((d.effn[c] || []).slice(cut.from));
      tr.appendChild(el('td', 'num', en == null ? '—' : en.toFixed(1) + '社'));
      var t1 = S.avg((d.top1[c] || []).slice(cut.from));
      tr.appendChild(el('td', 'num', t1 == null ? '—' : t1.toFixed(0) + '%'));
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);

    var wrap = el('div', 'grid__wrap');
    wrap.appendChild(tbl);
    host.appendChild(wrap);
    host.appendChild(legend());
  }

  /* 1行ぶんの色帯。1コマに日付と値を title で持たせる。

     コマの幅は指定しない。以前は 880/コマ数 で px を計算していたが、
     それだと期間が延びるほど帯が伸びて表が画面からはみ出し、横に
     スクロールしないと 読めなくなっていた（4か月で表 1994px に対し
     器は 1024px）。いまは帯の td に残り幅を割り当てて、その中を
     flex で等分する。期間を延ばすとコマが細くなるだけで、
     表の幅は変わらない。 */
  function band(vals, dates, color, name, unit) {
    var td = el('td', 'sh-band');
    var box = el('div', 'sh-band__in');
    for (var i = 0; i < vals.length; i++) {
      var c = el('i');
      c.style.background = color(vals[i]);
      c.title = dates[i] + '  ' + name + ' '
        + (vals[i] == null ? '—' : vals[i].toFixed(2) + unit);
      box.appendChild(c);
    }
    td.appendChild(box);
    return td;
  }

  function legend() {
    var box = el('div', 'fl-legend');
    box.appendChild(el('p', 'fl-legend__l',
      'シェアは、その日の売買代金が17業種でどう分かれたか（合計100%）。'
      + '広がりは、その業種の典型的な銘柄が市場の典型的な銘柄と比べてどれだけ活発か（1.00で同じ）。'
      + 'シェアが濃いのに広がりが白い行は、そのシェアが少数銘柄で作られているということ。'
      + '右の実効銘柄数と上位1社シェアで裏が取れます。'));
    var ul = el('ul', 'fl-legend__u');
    [
      ['シェアの色', '業種ごとに自分の履歴（既定3年）の5〜95%点で正規化。業種の大きさは50倍違うので、そのままでは比べられない'],
      ['広がりの色', '朱＝市場より活発／藍＝不活発。1.00 を中立に ' + S.BREADTH_LO + '〜' + S.BREADTH_HI + ' で頭打ち'],
      ['色の基準', '表示期間ではなく固定。期間を切り替えても色の意味は変わらない（穏やかな期間は全体が淡くなる）'],
      ['売買代金について', '売りと買いの両方を含む。シェアの上昇は「買われた」ではなく「売買が集まった」']
    ].forEach(function (kv) {
      var li = el('li');
      li.appendChild(el('span', 'fl-legend__k', kv[0]));
      li.appendChild(el('span', 'fl-legend__v', kv[1]));
      ul.appendChild(li);
    });
    box.appendChild(ul);
    return box;
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildLoad();
    blank('データを読み込むと、ここに出ます。');
    autoLoad();
  });
}());
