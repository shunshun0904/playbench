/* ==========================================================================
   PLAYBENCH ─ アクセス解析（Google アナリティクス 4）

   何をするか:
     assets/config.js に測定ID（G- で始まる）が入っていれば gtag.js を読み込む。
     入っていなければ何もしない。外部への通信も1本も起きない。

   止め方（3つとも実際に効く）:
     1. ブラウザが追跡拒否を出していれば、最初から読み込まない
        （Global Privacy Control、または DNT）
     2. 奥付の「止める」を押すと localStorage に残り、以後は読み込まない
     3. すでに読み込んだ後でも ga-disable-<測定ID> を立てるので、その場で送信が止まる
        （GA が公式に用意している逃げ道）

   なぜ1ファイルに切り出すか:
     このサイトは外部から何も読み込まない作りで来た。GA はその唯一の例外なので、
     どこへ何を出しているかが1ファイルを読めば分かるようにしておく。
     読みに行く先は https://www.googletagmanager.com/gtag/js だけ。

   立ち上げ手順は docs/analytics.md を参照。
   ========================================================================== */
'use strict';

(function () {
  var PB = window.PB = window.PB || {};
  var cfg = (PB.CONFIG && PB.CONFIG.analytics) || {};
  var id = String(cfg.measurementId || '').trim();
  var KEY = 'pb-analytics';

  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function keep(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  /* ブラウザからの拒否表明。DNT は仕様としては廃れたが、
     いま出している人は明確に「やめてほしい」と言っている。 */
  function refused() {
    if (navigator.globalPrivacyControl) return true;
    var d = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
    return d === '1' || d === 'yes';
  }

  /*  unset … 測定IDが無い（何もしない）
      dnt   … ブラウザが拒否を出している
      off   … 本人が止めた
      on    … 計測する                                        */
  function decide() {
    if (!id) return 'unset';
    var s = saved();
    if (s === 'off') return 'off';
    if (s === 'on') return 'on';        // 本人の明示は DNT より優先する
    return refused() ? 'dnt' : 'on';
  }

  var state = decide();
  var loaded = false;
  var subs = [];

  function load() {
    if (loaded) return;
    loaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    /* GA4 は IP を既定で丸める。効かない設定を足して「やっている風」にしない */
    window.gtag('config', id);

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
  }

  function halt(off) { if (id) window['ga-disable-' + id] = !!off; }

  PB.analytics = {
    id: id,
    configured: !!id,
    state: function () { return state; },
    /* 本人の指示。true で許す、false で止める。押した結果を返す */
    set: function (want) {
      if (!id) return state;
      keep(want ? 'on' : 'off');
      state = want ? 'on' : 'off';
      halt(!want);
      if (want) load();
      subs.forEach(function (f) { try { f(state); } catch (e) {} });
      return state;
    },
    onChange: function (f) { subs.push(f); }
  };

  halt(state !== 'on');
  if (state === 'on') load();
})();
