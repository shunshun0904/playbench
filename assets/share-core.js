/* ==========================================================================
   業種別 売買シェアの遷移 ── 計算の芯（DOM に触らない）

   推定も検定もしない。売買代金を業種で足して構成比にしただけのものと、
   その構成比が少数銘柄で作られているかどうかを並べて出す。
   矢印（web/flow-app.js）とは前提も結論も別なので、頁を分けてある。

   ── データを持たない ──
   このファイルも share.html も、市場データを1行も含まない。閲覧者が
   手元の JSON を読み込む。playbench は public なので、J-Quants から
   作ったものを同梱すると第三者提供になる（仕様書 §10 で未確認）。

   画面を組むのは share-app.js。こちらは node からも読めるので、
   期間の切り出しと色の割り当ては test/share-check.js で検査してある。

   JSON は python/jquants_fetch.py share-json が書き出す。
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PBSHARE = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* 表示できる期間。コマ数ではなく暦で切る ── 祝日の多い期間で
     範囲がずれるため。日付は文字列のまま比べられる（YYYY-MM-DD）。 */
  var VIEWS = [
    { k: 'm4', t: '直近4か月', months: 4 },
    { k: 'm3', t: '直近3か月', months: 3 },
    { k: 'm2', t: '直近2か月', months: 2 },
    { k: 'm1', t: '直近1か月', months: 1 },
    { k: 'w2', t: '直近2週間', days: 14 }
  ];

  /* 広がりの色。1.00 が市場の典型銘柄と同じ活発さ。
     上下限は実測の分布から取った（日次・週次とも 5%点 0.82 / 95%点 1.34）。 */
  var BREADTH_LO = 0.80, BREADTH_MID = 1.00, BREADTH_HI = 1.35;

  function cutoff(dates, view) {
    var last = dates[dates.length - 1];
    var d = new Date(last + 'T00:00:00Z');
    if (view.days) d.setUTCDate(d.getUTCDate() - view.days);
    else d.setUTCMonth(d.getUTCMonth() - view.months);
    return d.toISOString().slice(0, 10);
  }

  /* 表示するコマの範囲。見つからなければ全部返す。 */
  function slice(data, view) {
    var cut = cutoff(data.dates, view);
    var from = 0;
    for (var i = 0; i < data.dates.length; i++) {
      if (data.dates[i] >= cut) { from = i; break; }
    }
    return { from: from, dates: data.dates.slice(from) };
  }

  function shareColor(v, lo, hi) {
    if (v == null) return 'transparent';
    var t = Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1)));
    return 'rgba(176,58,36,' + (0.06 + 0.94 * t).toFixed(3) + ')';
  }

  function breadthColor(v) {
    if (v == null) return 'transparent';
    if (v >= BREADTH_MID) {
      var t = Math.min(1, (v - BREADTH_MID) / (BREADTH_HI - BREADTH_MID));
      return 'rgba(176,58,36,' + t.toFixed(3) + ')';
    }
    var u = Math.min(1, (BREADTH_MID - v) / (BREADTH_MID - BREADTH_LO));
    return 'rgba(43,74,125,' + u.toFixed(3) + ')';
  }

  /* 直近のシェアが大きい順。並べ替えの基準を画面から変えられるように
     しない ── 順番が動くと、期間を切り替えたときに目が迷う。 */
  function order(data) {
    return data.sectors.slice().sort(function (a, b) {
      var xa = data.share[a], xb = data.share[b];
      return xb[xb.length - 1] - xa[xa.length - 1];
    });
  }

  function avg(a) {
    var s = 0, n = 0;
    for (var i = 0; i < a.length; i++) if (a[i] != null) { s += a[i]; n++; }
    return n ? s / n : null;
  }

  /* 読み込んだ JSON が期待した形か。壊れたものを黙って描かない。 */
  function validate(d) {
    if (!d || typeof d !== 'object') throw new Error('JSON として読めません。');
    var need = ['sectors', 'dates', 'share', 'breadth', 'ref'];
    for (var i = 0; i < need.length; i++) {
      if (!d[need[i]]) throw new Error('"' + need[i] + '" がありません。'
        + 'python/jquants_fetch.py share-json が書き出したものを渡してください。');
    }
    if (!d.dates.length) throw new Error('日付が1つも入っていません。');
    if (!d.sectors.length) throw new Error('業種が1つも入っていません。');
    for (var j = 0; j < d.sectors.length; j++) {
      var c = d.sectors[j];
      if (!d.share[c]) throw new Error('業種 ' + c + ' のシェアがありません。');
      if (d.share[c].length !== d.dates.length) {
        throw new Error('業種 ' + c + ' の本数（' + d.share[c].length
          + '）が日付の数（' + d.dates.length + '）と合いません。');
      }
    }
    return d;
  }

  return {
    VIEWS: VIEWS,
    BREADTH_LO: BREADTH_LO, BREADTH_MID: BREADTH_MID, BREADTH_HI: BREADTH_HI,
    cutoff: cutoff, slice: slice, order: order, avg: avg,
    shareColor: shareColor, breadthColor: breadthColor, validate: validate
  };
}));
