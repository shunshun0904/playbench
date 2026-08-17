/* boardgamegeek.com から取得。tools/fetch-bgg.mjs が書き換えるので手で編集しない。
   recommend.html がこれを読む。こちらの実測ではなく他人が付けた数字なので、
   取得日と評価人数を必ず添えて表示する。
   画像・説明文・レビューは取っていない（docs/bgg-api-application.md の申告どおり）。

   ── まだ取得していない ──
   BGG はデータセンターからの要求を弾くので、ここは手元の回線で埋める:

       npm run bgg
       git add data/bgg-picks.js && git commit && git push

   空のあいだ、recommend.html は診断まで動いて「まだ取得していない」と出す。
   黙って空の結果を出したり、出典のない数字で埋めたりはしない。 */
'use strict';

window.PB = window.PB || {};
window.PB.BGG_PICKS = {
  "fetchedAt": null,
  "source": "boardgamegeek.com",
  "games": {}
};
