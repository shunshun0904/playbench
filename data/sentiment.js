/* ==========================================================================
   市場センチメントの設定。

   数字そのものはここには入りません。60分ごとに AWS 側（Lambda）が集計して
   S3 に置いた JSON を、開いている間だけ読みに行きます。
   仕組みは https://github.com/shunshun0904/sentiment_analysis

   取得は60分に1回ですが、図は5分刻みで描きます。記事1件ずつに発行時刻が
   付いているので、任意の時刻の値をブラウザ側で計算し直せるためです。
   取得間隔で決まるのは遅れ（最大60分）であって、図の細かさではありません。

   endpoint が空のあいだ、画面は「まだ配備していません」とだけ出します。
   古い数字を残したり、それらしい値を出したりはしません。
   ========================================================================== */
'use strict';

window.PB = window.PB || {};

window.PB.SENTIMENT = {
  /* 集計結果の置き場。配備したら、その latest.json のURLをここに書きます。
     例: https://shunshun0904.github.io/sentiment_analysis/public/latest.json
     GitHub Pages は access-control-allow-origin: * を返すので、
     別オリジンでも設定なしで読めます。 */
  endpoint: '',

  /* いま見ている指数。増やすときは配列にする前に、まず1本で運用してから */
  index: { id: 'SPX', ja: 'S&P 500', en: 'S&P 500' },

  /* 記事とスコアの出どころ。数字の出典として画面に出します */
  provider: {
    ja: 'Alpha Vantage（ニュース記事とそのセンチメントスコア）',
    en: 'Alpha Vantage (news articles and their sentiment scores)'
  },

  /* 仕組みの説明。図の下に置きます */
  method: {
    ja: '金融ニュースの記事ごとのセンチメントを、時間減衰つきの加重平均で1つにまとめています。'
      + '半減期は6時間 ── 6時間前の記事の重みは半分、12時間前は4分の1になります。'
      + '対象は直近24時間の記事だけです。'
      + '記事の取得は60分に1回ですが、記事には発行時刻が付いているので、'
      + '5分刻みの推移はこのページ側で計算し直しています。'
      + '破線は重みを一切かけない単純平均で、加重平均がどれだけ動かされたかを見る対照です。',
    en: 'Each finance news article carries a sentiment score; the index value is their '
      + 'time-decayed weighted mean. Half-life is 6 hours, so an article from 6 hours ago '
      + 'counts half as much, and one from 12 hours ago a quarter. Only the last 24 hours count. '
      + 'Articles are collected once an hour, but each carries a publication time, so the '
      + '5-minute curve is recomputed here in the browser. The dashed line is the plain '
      + 'unweighted mean, kept as a control against the weighted one.'
  },

  /* 読み取り方の注意。数字より先に読んでほしいので、図の前に置きます */
  caveat: {
    ja: 'これはニュースの論調の集計であって、相場の予測ではありません。'
      + '報道が出てから値が動くとは限らず、逆に動いたあとで報道が追いつくこともあります。'
      + '半減期6時間は暫定値で、実際の値動きと突き合わせて調整する予定です。',
    en: 'This measures the tone of the news, not the market. Coverage does not lead prices, '
      + 'and often follows them. The 6-hour half-life is provisional and will be adjusted '
      + 'against how the index actually moved.'
  }
};
