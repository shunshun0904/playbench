/* ==========================================================================
   自己紹介と職務経歴。

   ここだけが「本人にしか書けない」ファイルです。
   about.html はこの中身をそのまま組みます。HTML には手を入れません。

   ─────────────────────────────────────────────────────────────
   いまは空欄（fill: false）です。埋めたい項目の中身を書いて、
   その項目の fill を true にすると、画面に出ます。
   空欄のままの項目は「まだ書いていません」と正直に出します。
   勝手に埋めることはしません。
   ─────────────────────────────────────────────────────────────
   ========================================================================== */
'use strict';

window.PB = window.PB || {};

window.PB.PROFILE = {

  /* 名乗り。ハンドルだけでも、本名でも。 */
  name:   { fill: true,  ja: 'Shun Nakamura', en: 'Shun Nakamura' },
  tagline:{ fill: false, ja: '', en: '' },   // 一行の肩書き（例: ソフトウェアエンジニア）

  /* 自己紹介。段落ごとに配列の1要素。 */
  intro: {
    fill: false,
    ja: [
      // '例）業務ではこういうことをしています。',
      // '例）このサイトは、業務とは別に、自分で確かめたいことを置く場所です。'
    ],
    en: []
  },

  /* 職務経歴。新しいものが上。 */
  career: {
    fill: false,
    rows: [
      // {
      //   from: '2022-04', to: '在職中',        // to は '' なら「現在」
      //   org: '会社名', orgEn: '',
      //   role: '役割', roleEn: '',
      //   body: 'やっていること・作ったもの・規模・使った技術',
      //   bodyEn: ''
      // }
    ]
  },

  /* 手に馴染んでいる道具。分類ごとに並べる。 */
  skills: {
    fill: false,
    groups: [
      // { label: '言語', labelEn: 'Languages', items: ['JavaScript', 'Python'] }
    ]
  },


  /* 気になっている論文。Notion のデータベースへ。

     published が false のあいだはリンクにせず、題と守備範囲だけを出します。
     いまの url はワークスペース内のもので、他人が押しても Notion の
     ログイン画面に着くだけなので、押せるようにはしていません。

     公開するなら Notion 側で 共有 → ウェブで公開 を押し、出てきた
     .notion.site の URL に差し替えて published: true にしてください。 */
  papers: {
    fill: true,
    rows: [
      {
        title: 'ゲームAI / 自己対戦RL', titleEn: 'Game AI and self-play RL',
        body: '自己対戦RL、探索と学習の統合、不完全情報ゲーム、相手モデリング。'
          + '読んだものには「ハイソサエティに適用できるか」を書き添えている。',
        bodyEn: 'Self-play RL, search combined with learning, imperfect-information games, opponent '
          + 'modelling. Each entry carries a note on whether it could apply to High Society.',
        url: 'https://app.notion.com/p/74bb68df48114e959775cc05dab9b919',
        published: false
      },
      {
        title: '金融工学 / ML・マクロ', titleEn: 'Quantitative finance, ML and macro',
        body: 'ボラティリティ予測、ポートフォリオ最適化、マイクロデータからのインフレ予測、'
          + 'マーケットインパクト。経済のページで見ている数字の裏側。',
        bodyEn: 'Volatility forecasting, portfolio optimisation, inflation forecasting from micro data, '
          + 'market impact — the reasoning behind the figures on the Economy page.',
        url: 'https://app.notion.com/p/4ba5af8498f643ada8d69d589db485cf',
        published: false
      },
      {
        title: 'AIアラインメント・哲学', titleEn: 'AI alignment and philosophy',
        body: 'Constitutional AI、認識論。Amanda Askell の仕事を軸に集めている。',
        bodyEn: 'Constitutional AI and epistemology, gathered around Amanda Askell\'s work.',
        url: 'https://app.notion.com/p/4f8a8285b2b04c6d830931697b199d22',
        published: false
      }
    ]
  },

  /* 外に出しているもの。GitHub は既定で入れてあります。 */
  links: {
    fill: true,
    rows: [
      { label: 'GitHub', url: 'https://github.com/shunshun0904' }
    ]
  }
};
