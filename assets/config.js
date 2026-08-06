/* ==========================================================================
   接続先の設定。

   いまここにあるのはアクセス解析の測定IDだけ。
   measurementId が空のあいだは gtag.js を読み込まない ── 外部への通信は起きない。
   取り方は docs/analytics.md を参照。
   ========================================================================== */
'use strict';

window.PB = window.PB || {};

/* すでに入っていれば、そちらを優先する（検査で差し込むため） */
window.PB.CONFIG = window.PB.CONFIG || {
  analytics: {
    /* 収録ゲーム5作の index.html にも同じ測定IDを入れてある。
       6サイトとも同一オリジン（shunshun0904.github.io）なので、
       止める設定（localStorage の pb-analytics）も共有される。 */
    measurementId: 'G-L76Z1LVWX6'
  }
};
