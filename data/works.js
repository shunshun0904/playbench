/* ==========================================================================
   収録作品の目録。
   作品を1つ増やすときに手を入れるのは、原則このファイルだけ。

   数値はすべて各リポジトリの README に載っている実測値をそのまま写している。
   出典のない数字は書かない。baseline は「互角なら何割か」の線で、
   4人戦なら .250。すべての棒はこの線と一緒に読む。
   ========================================================================== */
'use strict';

window.PB = window.PB || {};

window.PB.WORKS = [
  /* ---------------------------------------------------------------- 01 */
  {
    id: 'highsociety',
    bggName: 'High Society',
    no: 1,
    title: 'ハイソサエティ',
    titleEn: 'High Society',
    latin: 'HIGH SOCIETY',
    designer: 'ライナー・クニツィア',
    designerEn: 'Reiner Knizia',
    players: '4人',
    playersEn: '4 players',
    genre: '競り・逆説的な勝利条件',
    genreEn: 'Auction / Inverted victory condition',
    hook: 'いちばん金を使った人は、最後に脱落する。競り勝ちすぎてもいけない。',
    hookEn: 'Whoever spent the most is eliminated at the end. Winning too many auctions loses the game.',
    opponents: 'ハード（学習AI＋先読み）／イージー（手書きルーチン）',
    opponentsEn: 'Hard (trained AI + search) / Easy (hand-written routine)',
    lead: '贅沢品を競り落としつつ、いちばん金を使った者は最後に脱落する。Osprey 2018年版に準拠。',
    leadEn: 'Bid for luxuries, but whoever spent the most is eliminated at the end. Follows the Osprey 2018 edition.',

    method: '自己対戦の強化学習＋先読み',
    methodEn: 'Self-play RL, then search',
    methodBody:
      '自己対戦 PPO で鍛えた方策ネットワーク。入力91次元 → 96(ReLU) → 64(ReLU) → 9行動＋状態価値。' +
      'int8 量子化して約20KBにし、HTML に直接埋め込んである。推論も素の JavaScript で、通信もライブラリもない。' +
      'さらに候補手ごとに局面を複製して打ってみて、2手先の価値で比べる（1手あたり中央値6ms）。',
    methodBodyEn:
      'A policy network trained by self-play PPO: 91 inputs → 96 (ReLU) → 64 (ReLU) → 9 actions plus a value ' +
      'head. Quantised to int8, about 20 KB, embedded directly in the HTML — inference is plain JavaScript, ' +
      'with no network and no library. On top of that, each candidate move is actually played out on a cloned ' +
      'state and judged two decisions ahead (median 6 ms per move).',

    plate: {
      caption: '実測勝率',
      captionEn: 'Measured win rate',
      note: '4人戦・席順ローテーション',
      noteEn: '4 players, seats rotated',
      baseline: 0.25,
      rows: [
        { label: '方策＋先読み 対 既存CPU 3人', labelEn: 'Policy+search vs 3 heuristic', v: 0.621, lead: true },
        { label: '方策のみ 対 既存CPU 3人',     labelEn: 'Policy only vs 3 heuristic',   v: 0.554 },
        { label: '方策＋先読み 対 乱択 3人',    labelEn: 'Policy+search vs 3 random',    v: 0.835 },
        { label: '［参考］既存CPU 対 乱択 3人',  labelEn: '[ref] Heuristic vs 3 random',  v: 0.772 },
        { label: '方策のみ 対 先読み 3人',      labelEn: 'Policy only vs 3 policy+search', v: 0.164 }
      ]
    },

    remark:
      '学習だけで .250 → .554、そこに先読みを載せて .621。伸ばそうとして駄目だった方向' +
      '（学習量を増やす／網を大きくする／先読みを方策に教え込む）も、実測つきで train/README に残してある。',
    remarkEn:
      'Learning alone moved it .250 → .554; search on top brought .621. The directions that failed — more ' +
      'training, a wider network, distilling search back into the policy — are kept in train/README with their ' +
      'measurements.',

    play: 'https://shunshun0904.github.io/highsociety/',
    repo: 'https://github.com/shunshun0904/highsociety',
    figure: 'cards'
  },
  /* ---------------------------------------------------------------- 02 */
  {
    id: 'acquire',
    bggName: 'Acquire',
    no: 2,
    title: 'アクワイア',
    titleEn: 'Acquire',
    latin: 'ACQUIRE',
    designer: 'シド・サクソン',
    designerEn: 'Sid Sackson',
    players: '2〜6人',
    playersEn: '2–6 players',
    genre: '株式・合併・タイル配置',
    genreEn: 'Stocks / Mergers / Tile laying',
    hook: '小さなチェーンは大きなチェーンに呑み込まれる。その瞬間、筆頭株主に株価の10倍が落ちる。',
    hookEn: 'Small chains get swallowed by big ones — and the moment they do, the largest shareholder is paid ten times the share price.',
    opponents: '性格4種（バランス／アグレッシブ／キャッシュ重視／マージャー）',
    opponentsEn: '4 personalities (balanced / aggressive / cautious / merger)',
    lead: 'ホテルチェーンを設立し、株を買い、合併ボーナスで資産を増やす。Avalon Hill 版に準拠。',
    leadEn: 'Found hotel chains, buy stock, and grow on merger bonuses. Rules follow the Avalon Hill edition.',

    method: '期待ドルへの換算',
    methodEn: 'Everything priced in dollars',
    methodBody:
      'ルールベース。学習も探索木も使わない。かわりに、すべての選択肢を「期待ドル」に換算して比較する。' +
      '単位が揃っているので「設立」「拡大」「合併」「捨て牌」を直接比べられる。',
    methodBodyEn:
      'Rule-based, with no learning and no search tree. Every option is converted into expected dollars, so ' +
      'founding, growing, merging and discarding can be compared on one scale.',

    plate: {
      caption: '実測勝率',
      captionEn: 'Measured win rate',
      note: '4人戦・席順ローテーション・400ゲーム',
      noteEn: '4 players, seats rotated, 400 games',
      baseline: 0.25,
      rows: [
        { label: 'ルールベース CPU',        labelEn: 'Rule-based CPU',   v: 0.500, lead: true },
        { label: 'ルールベース CPU（2体目）', labelEn: 'Rule-based CPU #2', v: 0.470 },
        { label: '初期版の CPU',            labelEn: 'First-draft CPU',  v: 0.028 },
        { label: 'ランダム',                labelEn: 'Random',           v: 0.003 },
        { label: 'ルールベース 対 乱択 3人',  labelEn: 'Rule-based vs 3 random', v: 0.920 }
      ]
    },

    remark:
      '「相手の利益をどれだけ嫌うか」の係数 rival は総当りで測って決めた ' +
      '（0.2→22.0% / 0.5→26.4% / 0.7→29.1% / 1.0→26.0% / 1.8→20.0%）。0.7 を採用。',
    remarkEn:
      'The rival coefficient — how much a rival\'s gain is disliked — was chosen by measurement ' +
      '(0.2→22.0% / 0.5→26.4% / 0.7→29.1% / 1.0→26.0% / 1.8→20.0%). 0.7 was adopted.',

    play: 'https://shunshun0904.github.io/aquire/',
    repo: 'https://github.com/shunshun0904/aquire',
    figure: 'grid'
  },
];
