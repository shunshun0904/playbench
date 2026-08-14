/* ==========================================================================
   市場センチメントの設定。

   数字そのものはここには入りません。5分ごとに AWS 側（Lambda）が集計して
   S3 に置いた JSON を、開いている間だけ読みに行きます。
   仕組みは https://github.com/shunshun0904/sentiment_analysis

   endpoint が空のあいだ、画面は「まだ配備していません」とだけ出します。
   古い数字を残したり、それらしい値を出したりはしません。
   ========================================================================== */
'use strict';

window.PB = window.PB || {};

window.PB.SENTIMENT = {
  /* 集計結果の置き場。配備したら、その latest.json のURLをここに書きます。
     例: https://<バケット名>.s3.ap-northeast-1.amazonaws.com/data/SPX/latest.json
     CloudFront を前に置いたら、そちらのURLに差し替えます。 */
  endpoint: '',

  /* いま見ている指数。増やすときは配列にする前に、まず1本で運用してから */
  index: { id: 'SPX', ja: 'S&P 500', en: 'S&P 500' },

  /* 記事の出どころ。数字の出典として画面に出します */
  provider: { ja: 'APITube（ニュース記事）', en: 'APITube (news articles)' },

  /* 仕組みの説明。図の下に置きます */
  method: {
    ja: '金融ニュースの記事ごとのセンチメントを、時間減衰つきの加重平均で1つにまとめています。'
      + '半減期は6時間 ── 6時間前の記事の重みは半分、12時間前は4分の1になります。'
      + '対象は直近24時間の記事だけです。',
    en: 'Each finance news article carries a sentiment score; the index value is their '
      + 'time-decayed weighted mean. Half-life is 6 hours, so an article from 6 hours ago '
      + 'counts half as much, and one from 12 hours ago a quarter. Only the last 24 hours count.'
  },

  /* 読み取り方の注意。数字より先に読んでほしいので、図の前に置きます */
  caveat: {
    ja: 'これはニュースの論調の集計であって、相場の予測ではありません。'
      + '報道が出てから値が動くとは限らず、逆に動いたあとで報道が追いつくこともあります。',
    en: 'This measures the tone of the news, not the market. Coverage does not lead prices, '
      + 'and often follows them.'
  }
};
