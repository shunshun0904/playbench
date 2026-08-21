/* ==========================================================================
   業種別 売買シェアの遷移 ── 画面の組み立て

   計算は share-core.js（PBSHARE）。こちらは DOM だけを見る。
   データは持たない。閲覧者が読み込んだ JSON をそのまま描く。
   ========================================================================== */
(function () {
  'use strict';
  var S = window.PBSHARE;

  var st = { data: null, view: 'm3' };

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
      'python/jquants_fetch.py share-json が書き出した JSON を渡してください。'
      + 'この頁はデータを持っていません。読み込んだファイルは、あなたのブラウザから外に出ません。'));
    box.appendChild(el('p', 'fl-load__state', '未読込'));
    box.lastChild.id = 'sh-state';
    host.appendChild(box);
  }

  function read(file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        st.data = S.validate(JSON.parse(r.result));
      } catch (err) {
        st.data = null;
        say('読めませんでした: ' + err.message);
        blank('データを読み込むと、ここに出ます。');
        return;
      }
      var d = st.data;
      say(d.sectors.length + '業種 / ' + d.dates.length + '営業日 / '
        + d.dates[0] + '〜' + d.dates[d.dates.length - 1]
        + (d.generated ? '（作成 ' + d.generated + '）' : ''));
      buildTabs();
      draw();
    };
    r.onerror = function () { say('ファイルを開けませんでした。'); };
    r.readAsText(file);
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
    var w = Math.max(3, Math.min(26, Math.floor(880 / n)));

    var rg = clear('sh-range');
    if (rg) {
      rg.appendChild(el('span', 'tag',
        cut.dates[0] + ' 〜 ' + cut.dates[n - 1] + ' / ' + n + '営業日 / 1コマ' + w + 'px'));
    }

    var host = clear('sh-table');
    if (!host) return;

    var tbl = el('table', 'grid sh-tbl');
    var hr = el('tr');
    ['業種', 'シェアの遷移', '直近', '期間変化', '広がりの遷移', '直近', '実効銘柄', '上位1社']
      .forEach(function (h) { hr.appendChild(el('th', null, h)); });
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
      }, w, 'シェア', '%'));
      tr.appendChild(el('td', 'num', sv[sv.length - 1].toFixed(1) + '%'));
      var chg = sv[sv.length - 1] - sv[0];
      tr.appendChild(el('td', 'num', (chg >= 0 ? '+' : '') + chg.toFixed(1) + 'pp'));
      tr.appendChild(band(bv, cut.dates, S.breadthColor, w, '広がり', ''));

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

  /* 1行ぶんの色帯。1コマに日付と値を title で持たせる */
  function band(vals, dates, color, w, name, unit) {
    var td = el('td', 'sh-band');
    for (var i = 0; i < vals.length; i++) {
      var c = el('i');
      c.style.width = w + 'px';
      c.style.background = color(vals[i]);
      c.title = dates[i] + '  ' + name + ' '
        + (vals[i] == null ? '—' : vals[i].toFixed(2) + unit);
      td.appendChild(c);
    }
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
  });
}());
