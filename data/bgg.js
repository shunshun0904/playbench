/* boardgamegeek.com から取得。tools/fetch-bgg.mjs が書き換えるので手で編集しない。
   こちらの実測ではなく他人が付けた数字なので、取得日と評価人数を必ず添えて表示する。

   まだ一度も取得していない。GitHub Actions の "Refresh BGG data" が走ると
   ここが実データで置き換わる。games が空のあいだ、画面には何も出ない。 */
'use strict';

window.PB = window.PB || {};
window.PB.BGG = {
  "fetchedAt": null,
  "source": "boardgamegeek.com",
  "games": {}
};
