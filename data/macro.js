/* ==========================================================================
   マクロ経済指標のスナップショット。

   出どころは Alpha Vantage（無料枠）。取り直しは:

     ALPHAVANTAGE_KEY=xxxx node tools/fetch-macro.mjs

   道具がこのファイルを書き換えます。手で触らないでください。
   例外は INDICATORS の定義（何を見るか・なぜ見るか）で、そこは手で書きます。

   ─────────────────────────────────────────────────────────────
   月次の系列は「開始月＋値の並び」で持ちます。日付を1つずつ持つより
   短く済み、欠測があれば null が入るので、抜けは抜けとして分かります。
   ─────────────────────────────────────────────────────────────
   ========================================================================== */
'use strict';

window.PB = window.PB || {};

/* 何を見るか。順番がそのまま画面の順番になります。
   ここに項目を足して fetch-macro.mjs を走らせれば、系列が入ります。 */
window.PB.INDICATORS = [
  {
    id: 'fedfunds',
    title: '米国 政策金利', titleEn: 'US policy rate',
    sub: 'FF金利（実効）', subEn: 'Effective federal funds rate',
    unit: '%',
    why: '株の割引率の土台。ここが動くと、利益が変わらなくても株価の妥当な水準が動く。',
    whyEn: 'The base of the discount rate. When this moves, fair value moves even if earnings do not.',
    by: '米連邦準備制度理事会（FRB）', byEn: 'Federal Reserve Board',
    sources: [
      { label: 'FOMC 日程・声明・議事要旨', labelEn: 'FOMC calendar, statements, minutes',
        url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' },
      { label: 'H.15 主要金利（日次）', labelEn: 'H.15 Selected Interest Rates (daily)',
        url: 'https://www.federalreserve.gov/releases/h15/' }
    ],
    fn: 'FEDERAL_FUNDS_RATE'
  },
  {
    id: 'dgs10',
    title: '米国 10年国債利回り', titleEn: 'US 10-year yield',
    sub: '長期金利', subEn: 'Long-term rate',
    unit: '%',
    why: '政策金利との差（イールドカーブ）が景気の織り込みを映す。逆転は歴史的に景気後退の先触れ。',
    whyEn: 'Its gap to the policy rate is the curve. Inversion has historically preceded recessions.',
    by: '米連邦準備制度理事会（FRB）', byEn: 'Federal Reserve Board',
    sources: [
      { label: 'H.15 主要金利（日次）', labelEn: 'H.15 Selected Interest Rates (daily)',
        url: 'https://www.federalreserve.gov/releases/h15/' }
    ],
    fn: 'TREASURY_YIELD', maturity: '10year'
  },
  {
    id: 'cpi',
    title: '米国 消費者物価', titleEn: 'US CPI',
    sub: 'CPI（前年同月比を計算して表示）', subEn: 'CPI, shown as year-over-year',
    unit: '%',
    why: '金利を決めるのはこれ。指数そのものより、前年比の向きを見る。',
    whyEn: 'This is what sets rates. The direction of the year-over-year change matters more than the level.',
    by: '米労働省労働統計局（BLS）', byEn: 'US Bureau of Labor Statistics',
    sources: [
      { label: '最新の公表文', labelEn: 'Latest news release',
        url: 'https://www.bls.gov/news.release/cpi.nr0.htm' },
      { label: '同 PDF', labelEn: 'Same, as PDF', pdf: true,
        url: 'https://www.bls.gov/news.release/pdf/cpi.pdf' },
      { label: '公表予定', labelEn: 'Release schedule',
        url: 'https://www.bls.gov/schedule/news_release/cpi.htm' }
    ],
    fn: 'CPI', transform: 'yoy'
  },
  {
    id: 'unemp',
    title: '米国 失業率', titleEn: 'US unemployment',
    sub: '雇用統計（NFP）と同じ公表文', subEn: 'Same release as nonfarm payrolls',
    unit: '%',
    why: '金融政策のもう一方の目標。上がり始めると利下げが早まる一方、企業収益は落ちる。'
      + '雇用者数（NFP）も同じ公表文に載る。',
    whyEn: 'The other half of the mandate. When it starts rising, cuts come sooner but earnings fall. '
      + 'Nonfarm payrolls are in the same release.',
    by: '米労働省労働統計局（BLS）', byEn: 'US Bureau of Labor Statistics',
    sources: [
      { label: '最新の公表文', labelEn: 'Latest news release',
        url: 'https://www.bls.gov/news.release/empsit.nr0.htm' },
      { label: '同 PDF', labelEn: 'Same, as PDF', pdf: true,
        url: 'https://www.bls.gov/news.release/pdf/empsit.pdf' },
      { label: '公表予定', labelEn: 'Release schedule',
        url: 'https://www.bls.gov/schedule/news_release/empsit.htm' }
    ],
    fn: 'UNEMPLOYMENT'
  },
  {
    id: 'pce',
    title: '米国 PCE 物価指数', titleEn: 'US PCE price index',
    sub: 'FRB が物価目標に使うのはこちら', subEn: 'The gauge the Fed targets',
    unit: '%',
    why: 'FRB の 2% 目標は CPI ではなく PCE。品目の重みの決め方が違うので、CPI とは常にずれる。'
      + '金利を読むならこちらを見る。',
    whyEn: 'The Fed\'s 2% target is PCE, not CPI. It weights items differently, so the two never match. '
      + 'For reading rates, this is the one.',
    by: '米商務省経済分析局（BEA）', byEn: 'US Bureau of Economic Analysis',
    sources: [
      { label: 'PCE 物価指数', labelEn: 'PCE price index',
        url: 'https://www.bea.gov/data/personal-consumption-expenditures-price-index' },
      { label: 'コア PCE（食品・エネルギー除く）', labelEn: 'Core PCE (ex food and energy)',
        url: 'https://www.bea.gov/data/personal-consumption-expenditures-price-index-excluding-food-and-energy' }
    ]
  },
  {
    id: 'umich',
    title: 'ミシガン大 消費者信頼感指数', titleEn: 'U. Michigan consumer sentiment',
    sub: '速報値と確報値が月2回', subEn: 'Preliminary and final, twice a month',
    why: '消費者に直接きいた指数。実績ではなく気分なので外れることも多いが、'
      + '期待インフレ率が同時に出るのが効く ── FRB がそこを見ている。',
    whyEn: 'A survey, not a measurement, so it misses often. What matters is that inflation expectations '
      + 'come with it — the Fed watches those.',
    by: 'ミシガン大学 Surveys of Consumers', byEn: 'University of Michigan Surveys of Consumers',
    sources: [
      { label: 'データと報告書', labelEn: 'Data and reports',
        url: 'https://data.sca.isr.umich.edu/' }
    ]
  },
  {
    id: 'beige',
    title: '米 ベージュブック', titleEn: 'Beige Book',
    sub: '数字ではなく、地区連銀が集めた話', subEn: 'Anecdotes, not numbers',
    why: 'FOMC の約2週間前に年8回。12地区の企業への聞き取りをまとめたもので、'
      + '統計に出る前の変化がここに先に出ることがある。',
    whyEn: 'Eight times a year, about two weeks before each FOMC. Interviews across the twelve districts — '
      + 'shifts sometimes show up here before they reach the statistics.',
    by: '米連邦準備制度理事会（FRB）', byEn: 'Federal Reserve Board',
    sources: [
      { label: 'ベージュブック', labelEn: 'Beige Book',
        url: 'https://www.federalreserve.gov/monetarypolicy/publications/beige-book-default.htm' }
    ]
  },
  {
    id: 'usmb',
    title: '米国 マネーストック', titleEn: 'US money stock',
    sub: 'H.6（M1・M2）', subEn: 'H.6 (M1, M2)',
    why: 'マネタリーベースだけを出す統計（H.3）は廃止されているので、'
      + '公式にたどれる最寄りは H.6 のマネーストックになる。毎月第4火曜。',
    whyEn: 'The release dedicated to the monetary base (H.3) was discontinued, so the nearest official '
      + 'source is the H.6 money stock release. Fourth Tuesday of each month.',
    by: '米連邦準備制度理事会（FRB）', byEn: 'Federal Reserve Board',
    sources: [
      { label: 'H.6 マネーストック', labelEn: 'H.6 Money Stock Measures',
        url: 'https://www.federalreserve.gov/releases/h6/' }
    ]
  },
  {
    id: 'jpcpi',
    title: '日本 全国消費者物価', titleEn: 'Japan CPI',
    sub: '生鮮除く総合（コアCPI）が主役', subEn: 'Core (ex fresh food) is the headline',
    why: '日銀の物価目標はこれ。日本株を持つなら、円金利の前提がここで決まる。',
    whyEn: 'This is the Bank of Japan\'s target. If you hold Japanese equities, the premise for yen rates '
      + 'is set here.',
    by: '総務省統計局', byEn: 'Statistics Bureau of Japan',
    sources: [
      { label: '消費者物価指数 結果', labelEn: 'CPI results',
        url: 'https://www.stat.go.jp/data/cpi/1.html' },
      { label: '統計 Viz（図で見る）', labelEn: 'Statistics Viz',
        url: 'https://www.stat.go.jp/viz/cpi/index.html' }
    ]
  },
  {
    id: 'jpcgpi',
    title: '日本 企業物価指数', titleEn: 'Japan corporate goods prices',
    sub: '国内企業物価・輸出物価・輸入物価', subEn: 'Domestic, export and import price indexes',
    why: '企業間の値段。消費者物価より先に動くので、CPI の先行きを読む材料になる。'
      + '輸出入物価は為替の影響がそのまま出る。',
    whyEn: 'Prices between firms. It moves before consumer prices, so it reads ahead of CPI. The export '
      + 'and import indexes carry the currency effect directly.',
    by: '日本銀行', byEn: 'Bank of Japan',
    sources: [
      { label: '企業物価指数の公表データ一覧', labelEn: 'CGPI releases',
        url: 'https://www.boj.or.jp/statistics/pi/cgpi_release/' },
      { label: '物価関連統計', labelEn: 'Price statistics',
        url: 'https://www.boj.or.jp/statistics/pi/index.htm' }
    ]
  },
  {
    id: 'jpmb',
    title: '日本 マネタリーベース', titleEn: 'Japan monetary base',
    sub: '', subEn: '',
    why: '日銀が世の中に出している通貨の量。金融政策の転換が、声明より先に残高に出ることがある。',
    whyEn: 'The quantity of central bank money outstanding. A turn in policy sometimes shows in the balance '
      + 'before it shows in the statement.',
    by: '日本銀行', byEn: 'Bank of Japan',
    sources: [
      { label: 'マネタリーベース', labelEn: 'Monetary base',
        url: 'https://www.boj.or.jp/statistics/boj/other/mb/index.htm' },
      { label: '時系列統計データ検索', labelEn: 'Time-series data search',
        url: 'https://www.stat-search.boj.or.jp/' }
    ]
  }
];

/* ここから下は道具が書き換えます。
   fetched は取得した時刻、series は id ごとの系列。 */
window.PB.MACRO = {
  fetched: '2026-08-06',
  source: 'Alpha Vantage',
  series: {
    fedfunds: {
      from: '2000-01', step: 'month', unit: '%',
      v: [
        5.45, 5.73, 5.85, 6.02, 6.27, 6.53, 6.54, 6.50, 6.52, 6.51, 6.51, 6.40,
        5.98, 5.49, 5.31, 4.80, 4.21, 3.97, 3.77, 3.65, 3.07, 2.49, 2.09, 1.82,
        1.73, 1.74, 1.73, 1.75, 1.75, 1.75, 1.73, 1.74, 1.75, 1.75, 1.34, 1.24,
        1.24, 1.26, 1.25, 1.26, 1.26, 1.22, 1.01, 1.03, 1.01, 1.01, 1.00, 0.98,
        1.00, 1.01, 1.00, 1.00, 1.00, 1.03, 1.26, 1.43, 1.61, 1.76, 1.93, 2.16,
        2.28, 2.50, 2.63, 2.79, 3.00, 3.04, 3.26, 3.50, 3.62, 3.78, 4.00, 4.16,
        4.29, 4.49, 4.59, 4.79, 4.94, 4.99, 5.24, 5.25, 5.25, 5.25, 5.25, 5.24,
        5.25, 5.26, 5.26, 5.25, 5.25, 5.25, 5.26, 5.02, 4.94, 4.76, 4.49, 4.24,
        3.94, 2.98, 2.61, 2.28, 1.98, 2.00, 2.01, 2.00, 1.81, 0.97, 0.39, 0.16,
        0.15, 0.22, 0.18, 0.15, 0.18, 0.21, 0.16, 0.16, 0.15, 0.12, 0.12, 0.12,
        0.11, 0.13, 0.16, 0.20, 0.20, 0.18, 0.18, 0.19, 0.19, 0.19, 0.19, 0.18,
        0.17, 0.16, 0.14, 0.10, 0.09, 0.09, 0.07, 0.10, 0.08, 0.07, 0.08, 0.07,
        0.08, 0.10, 0.13, 0.14, 0.16, 0.16, 0.16, 0.13, 0.14, 0.16, 0.16, 0.16,
        0.14, 0.15, 0.14, 0.15, 0.11, 0.09, 0.09, 0.08, 0.08, 0.09, 0.08, 0.09,
        0.07, 0.07, 0.08, 0.09, 0.09, 0.10, 0.09, 0.09, 0.09, 0.09, 0.09, 0.12,
        0.11, 0.11, 0.11, 0.12, 0.12, 0.13, 0.13, 0.14, 0.14, 0.12, 0.12, 0.24,
        0.34, 0.38, 0.36, 0.37, 0.37, 0.38, 0.39, 0.40, 0.40, 0.40, 0.41, 0.54,
        0.65, 0.66, 0.79, 0.90, 0.91, 1.04, 1.15, 1.16, 1.15, 1.15, 1.16, 1.30,
        1.41, 1.42, 1.51, 1.69, 1.70, 1.82, 1.91, 1.91, 1.95, 2.19, 2.20, 2.27,
        2.40, 2.40, 2.41, 2.42, 2.39, 2.38, 2.40, 2.13, 2.04, 1.83, 1.55, 1.55,
        1.55, 1.58, 0.65, 0.05, 0.05, 0.08, 0.09, 0.10, 0.09, 0.09, 0.09, 0.09,
        0.09, 0.08, 0.07, 0.07, 0.06, 0.08, 0.10, 0.09, 0.08, 0.08, 0.08, 0.08,
        0.08, 0.08, 0.20, 0.33, 0.77, 1.21, 1.68, 2.33, 2.56, 3.08, 3.78, 4.10,
        4.33, 4.57, 4.65, 4.83, 5.06, 5.08, 5.12, 5.33, 5.33, 5.33, 5.33, 5.33,
        5.33, 5.33, 5.33, 5.33, 5.33, 5.33, 5.33, 5.33, 5.13, 4.83, 4.64, 4.48,
        4.33, 4.33, 4.33, 4.33, 4.33, 4.33, 4.33, 4.33, 4.22, 4.09, 3.88, 3.72,
        3.64, 3.64, 3.64, 3.64, 3.63, 3.63, 3.63
      ]
    }
  }
};
