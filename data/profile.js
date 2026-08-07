/* ==========================================================================
   自己紹介と職務経歴。

   ここだけが「本人にしか書けない」ファイルです。
   index.html はこの中身をそのまま組みます。HTML には手を入れません。

   ─────────────────────────────────────────────────────────────
   中身は履歴書と職務経歴書から起こしてあります。
   生年月日・電話番号・住所・メールアドレスは、公開する意味がないので
   持ってきていません。増やす予定もありません。

   fill: false にすると、その項目は「まだ書いていません」と正直に出ます。
   ─────────────────────────────────────────────────────────────
   ========================================================================== */
'use strict';

window.PB = window.PB || {};

window.PB.PROFILE = {

  /* 名乗り。 */
  name:   { fill: true, ja: 'Shun Nakamura', en: 'Shun Nakamura' },
  tagline:{ fill: true,
    ja: 'データサイエンティスト ── 機械工学から入って、いまは機械学習で食べています',
    en: 'Data scientist ── came in through mechanical engineering, now paid to do machine learning' },

  /* 自己紹介。段落ごとに配列の1要素。 */
  intro: {
    fill: true,
    ja: [
      '広告配信、スマホアプリのログ、病院のレセプト、FX と ETF、fMRI、アパレルの売上、自動車のセンサー、電力の需給。' +
      '扱ってきた領域はばらばらですが、やっていることはどれも同じで、' +
      '「手元のデータで何がどこまで言えて、どこから先は言えないのか」を確かめることです。' +
      '当てにいくより、外れ方を先に知っておきたい性分だと思います。',

      'このサイトは仕事とは別に、自分で確かめたいことを置く場所です。' +
      'ボードゲームの自主研究と、投資のために見ているマクロ経済指標を並べています。' +
      'どちらも、数字は自分で測るか出典を添えるかのどちらかにしていて、' +
      'それができないものは載せないことにしています。'
    ],
    en: [
      'Ad delivery, smartphone app logs, hospital claims data, FX and ETFs, fMRI, apparel sales, ' +
      'vehicle sensors, electricity supply and demand. The domains have been scattered, but the work ' +
      'has always been the same: finding out how much the data in front of me can actually support, ' +
      'and where it stops. I would rather know how a model fails before I know how it wins.',

      'This site is separate from that work — a place for things I want to check for myself. ' +
      'Board game research, and the macroeconomic indicators I follow for investing. ' +
      'In both, a number is either measured here or carries its source. ' +
      'If it can be neither, it does not go up.'
    ]
  },

  /* 職務経歴と学歴。新しいものが上。

     社名は出しません。取引先・グループ会社・サービス名も、
     そこから社名が割れるので一緒に伏せてあります。
     業種と、何をしたかだけ書きます。 */
  career: {
    fill: true,
    rows: [
      {
        from: '2024-07', to: '2025-09',
        org: '電力小売の会社', orgEn: 'An electricity retailer',
        role: '社内の研究部門 ── 電力の需給予測', roleEn: 'In-house research group — electricity supply and demand',
        body: '気象庁配信の GSM 予測値、電力需要、太陽光発電量の実績、需給調整市場の取引データを扱い、' +
              '将来の商品開発を見据えた予測モデルをつくっていました。予測は LightGBM が中心で、' +
              '要因を見るときは線形回帰・ガウス過程回帰・SHAP を併用。' +
              '日々の分析は SageMaker Notebook、ステージングでの予測値配信は EventBridge × EC2 × S3 で組みました。',
        bodyEn: 'Forecasting models built on JMA GSM weather forecasts, electricity demand, solar generation ' +
                'records, and balancing-market trades. LightGBM for the forecasts; linear regression, ' +
                'Gaussian process regression and SHAP when the question was why. Ad-hoc analysis on SageMaker ' +
                'notebooks, staging delivery on EventBridge × EC2 × S3.'
      },
      {
        from: '2023-08', to: '2024-03',
        org: '自動車業界向けの研究開発会社', orgEn: 'An R&D firm serving the automotive industry',
        role: '業務委託 ── 大手自動車メーカーの先進安全技術部門でのデータ分析',
        roleEn: 'Contract — data analysis inside a major carmaker’s advanced safety group',
        body: '交差点単位の事故発生予測モデルを、少量かつ不均衡なデータという制約の中でつくる仕事でした。' +
              '車載センサーの CAN データ、OpenStreetMap、PLATEAU（3D 都市モデル）、国土交通省の人流データを併せて使い、' +
              'オープンソース系のものは自分でパースしています。PoC フェーズで、発注側と日次で擦り合わせながら進めました。',
        bodyEn: 'Predicting accident occurrence per intersection, under the constraint of small and heavily ' +
                'imbalanced data. CAN sensor data, OpenStreetMap, PLATEAU 3D city models and MLIT people-flow ' +
                'data, with the open-source sets parsed in-house. A PoC, aligned daily with the client.'
      },
      {
        from: '2023-01', to: '2023-07',
        org: '衣料品の EC を持つ小売会社', orgEn: 'An apparel retailer with its own e-commerce',
        role: 'データ戦略室（CEO 直下）', roleEn: 'Data strategy office, reporting to the CEO',
        body: '多部署が日々使う Tableau ダッシュボードの運用保守。不具合対応と、' +
              'Tableau が参照する DB の ETL 連携まわりのコード改修が主でした。' +
              'マーケティング部が使う KPI ダッシュボードの作成も担当しています。',
        bodyEn: 'Maintaining the Tableau dashboards several departments used daily — fixing breakages and ' +
                'reworking the ETL feeding the underlying database. Also built the marketing KPI dashboard.'
      },
      {
        from: '2022-02', to: '2023-01',
        org: 'ニューロテックのベンチャー（業務委託）', orgEn: 'Neurotech startup (contract)',
        role: '疾患バイオマーカの開発', roleEn: 'Disease biomarker development',
        body: 'fMRI データを使ったバイオマーカ開発の一環として、PyTorch で GRU と 1D Convolution を用いた' +
              '信号データの分類予測モデルをつくっていました。',
        bodyEn: 'Signal classification models on fMRI data — GRU and 1D convolution in PyTorch — as part of ' +
                'biomarker development.'
      },
      {
        from: '2021-03', to: '2021-12',
        org: '金融サービスの会社', orgEn: 'A financial services company',
        role: 'FX 自動売買サービスの研究開発', roleEn: 'R&D for an automated FX trading service',
        body: 'A3C（強化学習）を使ったサービスの開発で、ポートフォリオ機能のための AI エージェント選定ロジックの PoC を担当。' +
              'PoC の後を見据えてコードのリファクタリングとスクリプト化まで行い、ソフトウェアエンジニアに引き渡しました。' +
              '別に、ETF 銘柄の自動売買サービスへ銘柄を追加するための損益推移シミュレーションも Python で実装しています。',
        bodyEn: 'A PoC for the agent-selection logic behind the portfolio feature, inside a service built on ' +
                'A3C reinforcement learning — refactored and scripted for handover to the engineers. Separately, ' +
                'a Python simulation of profit and loss for adding new tickers to the automated ETF service.'
      },
      {
        from: '2019-04', to: '2021-02',
        org: 'データ分析・AI 活用コンサルの会社', orgEn: 'A data analytics and AI consultancy',
        role: 'データサイエンティスト', roleEn: 'Data scientist',
        body: '大手通信会社の広告配信の最適化モデル（グループ会社に常駐）。' +
              '8 つの施策のうち 6 つでランダム配信よりクリック率を上げられたものの、残り 2 つの精度が悪く、' +
              '全体ではランダムと変わらないモデルになりました。PoC と本番運用の距離を知った案件です。' +
              'ほかに、スマホのプリインストールアプリのログ解析（顧客ポートフォリオと KPI の設計から）、' +
              '病院のレセプトデータを使った脳卒中発症の予測モデル（LightGBM と、SHAP・PDP による要因分析）。',
        bodyEn: 'Ad-delivery optimisation for a major telecom, on site at a group company. Six of eight ' +
                'campaigns beat random delivery on click-through; the other two were poor enough that the ' +
                'whole thing came out no better than random. That taught me the distance between a PoC and ' +
                'production. Also: log analysis for a pre-installed smartphone app, from customer portfolio ' +
                'and KPI design onward, and a stroke-onset prediction model on hospital claims data ' +
                '(LightGBM, with SHAP and PDP for the reasoning).'
      },
      {
        from: '2016-04', to: '2019-03',
        org: '東京工業大学大学院', orgEn: 'Tokyo Institute of Technology',
        role: '機械系 機械コース（修士）', roleEn: 'M.Eng., Department of Mechanical Engineering'
      },
      {
        from: '2012-04', to: '2016-03',
        org: '金沢大学', orgEn: 'Kanazawa University',
        role: '理工学域 機械工学類', roleEn: 'B.Eng., Mechanical Engineering'
      }
    ]
  },

  /* 研究業績と、分析コンペの成績。
     論文は履歴書・職務経歴書に載っているものです。
     url は「押して確かめられるもの」だけ入れます。空なら、ただの文字として出ます。 */
  research: {
    fill: true,
    groups: [
      {
        label: '論文', labelEn: 'Papers',
        rows: [
          {
            kind: '査読あり', kindEn: 'Peer-reviewed',
            title: '患者の OCT 画像を入力とする CNN を用いた注射後の視力推定精度の検証',
            titleEn: 'Validating post-injection visual acuity estimation from patient OCT images with a CNN',
            note: '', noteEn: '', url: ''
          },
          {
            kind: '国内会議', kindEn: 'Domestic conference',
            title: 'クラスタリングを用いた湾曲繊維 CFRP の最適繊維配向モデルの探索手法の提案',
            titleEn: 'A clustering-based search for optimal fibre orientation in curvilinear-fibre CFRP',
            note: '優秀講演フェロー賞', noteEn: 'Outstanding Presentation Fellow Award', url: ''
          },
          {
            kind: '共著', kindEn: 'Co-authored',
            title: 'Machine learning model estimating number of COVID-19 infection cases over coming 24 days ' +
                   'in every province of South Korea (XGBoost and MultiOutputRegressor)',
            titleEn: '',
            note: 'medRxiv, 2020', noteEn: 'medRxiv, 2020',
            url: 'https://doi.org/10.1101/2020.05.10.20097527'
          }
        ]
      },
      {
        label: '分析コンペティション', labelEn: 'Competitions',
        rows: [
          {
            kind: 'SIGNATE', kindEn: 'SIGNATE',
            title: 'JR 東日本 列車運行予測',
            titleEn: 'JR East train operation forecasting',
            note: 'ブロンズ・ソロ参加 / 2021-01', noteEn: 'Bronze, solo / 2021-01', url: ''
          },
          {
            kind: 'SIGNATE', kindEn: 'SIGNATE',
            title: 'マイナビ 賃貸物件の価格予測（SOTA チャレンジ）',
            titleEn: 'Mynavi rental price prediction (SOTA challenge)',
            note: 'ブロンズ・ソロ参加 / 2021-07', noteEn: 'Bronze, solo / 2021-07', url: ''
          },
          {
            kind: 'SIGNATE', kindEn: 'SIGNATE',
            title: 'SIGNATE Cup 2024 旅行パッケージ成約率予測',
            titleEn: 'SIGNATE Cup 2024 travel package conversion prediction',
            note: 'ブロンズ', noteEn: 'Bronze', url: ''
          },
          {
            kind: 'Kaggle', kindEn: 'Kaggle',
            title: 'ICR — Identifying Age-related Conditions',
            titleEn: 'ICR — Identifying Age-related Conditions',
            note: 'ブロンズ', noteEn: 'Bronze', url: ''
          }
        ]
      },
      {
        label: '資格', labelEn: 'Certifications',
        rows: [
          {
            kind: '2020-07', kindEn: '2020-07',
            title: 'Python3 エンジニア認定データ分析試験',
            titleEn: 'Python 3 Certified Data Analyst Examination',
            note: '', noteEn: '', url: ''
          },
          {
            kind: '2014-06', kindEn: '2014-06',
            title: 'TOEIC 725',
            titleEn: 'TOEIC 725',
            note: '', noteEn: '', url: ''
          }
        ]
      }
    ]
  },

  /* 外に出しているもの。url が空の行は出しません。 */
  links: {
    fill: true,
    rows: [
      { label: 'GitHub', url: 'https://github.com/shunshun0904' },
      { label: 'Qiita',  url: 'https://qiita.com/shunshun0904' },

      /* Kaggle は本人からもらった共有リンク。Google 経由の転送なので、
         kaggle.com/<ユーザー名> の直リンクが分かったら差し替えたい。 */
      { label: 'Kaggle', url: 'https://share.google/snLjEHti228HPzqK8' },

      /* SIGNATE はまだ URL が分かっていないので空。
         プロフィールページの URL を貼れば、そのまま出ます。 */
      { label: 'SIGNATE', url: '' }
    ]
  }
};
