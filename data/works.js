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
    id: 'bigshot',
    no: 1,
    title: 'ビッグショット',
    titleEn: 'Big Shot',
    latin: 'BIG SHOT',
    designer: 'アレックス・ランドルフ',
    designerEn: 'Alex Randolph',
    players: '4人',
    playersEn: '4 players',
    genre: '競り・エリアマジョリティ',
    genreEn: 'Auction / Area majority',
    lead: '18回の競りで街を分け合う。収入がないので、使った金はそのまま失点になる。',
    leadEn: 'Eighteen auctions divide a city. There is no income, so every dollar spent is a point lost.',

    /* 相手の作り */
    method: '確率の数え上げ',
    methodEn: 'Exhaustive enumeration',
    methodBody:
      '学習は使っていない。区画の状態は「4色の個数・合計7以下」の330通りしかないので、' +
      '残り枠が無作為に埋まると仮定したときの所有確率を起動時に多項分布で全部数え上げて表にしておく。' +
      '同数無効のルールもこの数え上げの中で処理される。',
    methodBodyEn:
      'No learning. A block has only 330 reachable states (four colours, at most seven cubes), so the ' +
      'ownership probability under random filling is enumerated exactly at start-up with the multinomial ' +
      'distribution. The tie-voids-the-colour rule falls out of the same enumeration.',

    plate: {
      caption: '実測勝率',
      captionEn: 'Measured win rate',
      note: '4人戦・席順ローテーション・各200局',
      noteEn: '4 players, seats rotated, 200 games each',
      baseline: 0.25,
      rows: [
        { label: 'AI 1人 対 素人筋 3人',  labelEn: 'AI vs 3 naive',    v: 0.855, lead: true },
        { label: 'AI 1人 対 浪費家 3人',  labelEn: 'AI vs 3 spenders', v: 0.995 },
        { label: 'AI 1人 対 乱択 3人',    labelEn: 'AI vs 3 random',   v: 1.000 },
        { label: '素人筋 1人 対 AI 3人',  labelEn: 'Naive vs 3 AI',    v: 0.055 },
        { label: '乱択 1人 対 AI 3人',    labelEn: 'Random vs 3 AI',   v: 0.040 }
      ]
    },

    remark:
      '所有確率を「置いた数が多いほど有利」と当てずっぽうで近似していた版は、空き区画に1個置いただけで' +
      '勝率43%と見積もり、序盤に全財産を注いで沈んだ。数え上げに替えて 0.43 → 0.98。',
    remarkEn:
      'An earlier version approximated ownership by "more cubes is better", valued a single cube on an empty ' +
      'block at 43%, and drowned itself in debt in the opening. Switching to enumeration moved it 0.43 → 0.98.',

    play: 'https://shunshun0904.github.io/bigshot/',
    repo: 'https://github.com/shunshun0904/bigshot',
    figure: 'blocks'
  },

  /* ---------------------------------------------------------------- 02 */
  {
    id: 'acquire',
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

    play: null,
    playNote: 'Pages 公開はこれから',
    playNoteEn: 'Pages deployment pending',
    repo: 'https://github.com/shunshun0904/aquire',
    figure: 'grid'
  },

  /* ---------------------------------------------------------------- 03 */
  {
    id: 'highsociety',
    no: 3,
    title: 'ハイソサエティ',
    titleEn: 'High Society',
    latin: 'HIGH SOCIETY',
    designer: 'ライナー・クニツィア',
    designerEn: 'Reiner Knizia',
    players: '4人',
    playersEn: '4 players',
    genre: '競り・逆説的な勝利条件',
    genreEn: 'Auction / Inverted victory condition',
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
  }
];

/* 「これから作るもの」。実装が済んだ段階で state を 'done' にする。 */
window.PB.ROADMAP = [
  {
    step: '一',
    stepEn: 'I',
    title: '棋譜をとる',
    titleEn: 'Record your games',
    body: 'あなたが打った一手ずつを、局面と一緒に手元（ブラウザ内）に貯める。送信はしない。',
    bodyEn: 'Every move you make is stored with its position, in your own browser. Nothing is uploaded.',
    state: 'planned'
  },
  {
    step: '二',
    stepEn: 'II',
    title: '分身をつくる',
    titleEn: 'Build your double',
    body: 'その棋譜を真似るように学習させて、「あなたのように打つ」エージェントを作る。',
    bodyEn: 'Train an agent to imitate those games — an opponent that plays the way you play.',
    state: 'planned'
  },
  {
    step: '三',
    stepEn: 'III',
    title: '倒す相手を鍛える',
    titleEn: 'Train something to beat it',
    body:
      'その分身だけを相手に、それを倒すことに特化した方策を鍛える。' +
      '出来上がるのは「あなたの癖を咎めるために作られた相手」になる。',
    bodyEn:
      'Then train a policy whose only job is to beat that double. What comes out is an opponent built ' +
      'specifically to punish your habits.',
    state: 'planned',
    note: 'highsociety の train/league.js --mode=exploit に、この中核はすでに動く形で入っている。',
    noteEn: 'The core of this already runs, as train/league.js --mode=exploit in highsociety.'
  },
  {
    step: '四',
    stepEn: 'IV',
    title: '闘技場で並べる',
    titleEn: 'Put them in the arena',
    body:
      'エージェントは PR で提出する。対戦は GitHub Actions が回し、結果は JSON でコミットされ、' +
      'このサイトがそれを読む。サーバーは無い。順位表の全行が、実行ログと突き合わせて再現できる。',
    bodyEn:
      'Agents arrive as pull requests. Matches run in GitHub Actions, results are committed as JSON, and this ' +
      'site reads them. There is no server. Every row of the table can be reproduced against its run log.',
    state: 'planned'
  }
];

/* 設計の作法。3作すべてに共通して実際に守られていること。 */
window.PB.PRINCIPLES = [
  {
    title: '外部依存を持たない',
    titleEn: 'No dependencies',
    body:
      '3作ともライブラリもフォントも画像も読み込まない。盤面も駒もすべて手書きの SVG と CSS。' +
      'index.html を開けば動く。',
    bodyEn:
      'None of the three loads a library, a font, or an image. Boards and pieces are hand-written SVG and CSS. ' +
      'Open index.html and it runs.'
  },
  {
    title: '遊ぶコードと測るコードを分けない',
    titleEn: 'One copy of the rules',
    body:
      '検査も学習も、index.html のロジック区画をそのまま切り出して Node で実行する。' +
      'ブラウザで動く相手と、机上で測った相手がずれない。',
    bodyEn:
      'Tests and training run the very same logic sections lifted out of index.html. The opponent measured on ' +
      'the bench and the opponent in your browser cannot drift apart.'
  },
  {
    title: '互角の線を必ず添える',
    titleEn: 'Always show the parity line',
    body:
      '勝率だけを見せても強さは分からない。4人戦なら互角は .250。' +
      'このサイトの棒はすべて、その線と一緒に読むようにできている。',
    bodyEn:
      'A win rate alone says nothing. In a four-player game, parity is .250. Every bar on this site is drawn ' +
      'to be read against that line.'
  },
  {
    title: '駄目だった方向も残す',
    titleEn: 'Keep the failures',
    body:
      '強くしようとして外した手も、同じだけ有用な記録として実測つきで残す。' +
      '「先読みの真似は上手くなったのに、実際の強さは落ちた」のような結果こそ、次の判断材料になる。',
    bodyEn:
      'Attempts that made things worse are kept, with their measurements. "It imitated the search better and ' +
      'played worse" is exactly the kind of result that decides what to try next.'
  }
];
