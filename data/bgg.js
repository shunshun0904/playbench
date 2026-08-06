/* boardgamegeek.com から取得。tools/fetch-bgg.mjs が書き換えるので手で編集しない。
   こちらの実測ではなく他人が付けた数字なので、取得日と評価人数を必ず添えて表示する。

   まだ一度も取得していない。games が空のあいだ、画面には何も出ない。

   取り方 ── ご自分の回線で1回:

     npm run bgg                                   # 取得して、このファイルを書き換える
     BGG_UA='承認された名前/1.0 (+URL)' npm run bgg  # 名乗りを変える場合
     npm run bgg:print                             # 書き換えず、取れた値を見るだけ

   CI からは取れない。BGG はデータセンターの回線を 401/403 で弾くので、
   GitHub Actions でもクラウド上でも通らない（6通りの宛先×名乗りで確認済み）。
   利用申請が通っても、この制限は別物なので変わらない可能性が高い。 */
'use strict';

window.PB = window.PB || {};
window.PB.BGG = {
  "fetchedAt": null,
  "source": "boardgamegeek.com",
  "games": {}
};
