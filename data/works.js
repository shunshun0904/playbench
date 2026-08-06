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

  /* ---------------------------------------------------------------- 02 */
  {
    id: 'acquire',
    bggName: 'Acquire',
    no: 1,
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

  /* ---------------------------------------------------------------- 03 */
  {
    id: 'highsociety',
    bggName: 'High Society',
    no: 2,
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

  /* ---------------------------------------------------------------- 04 */
  {
    id: 'imperial',
    bggName: 'Imperial',
    no: 3,
    title: 'インペリアル',
    titleEn: 'Imperial',
    latin: 'IMPERIAL',
    designer: 'マック・ゲルツ',
    designerEn: 'Mac Gerdts',
    players: '2〜6人',
    playersEn: '2–6 players',
    genre: 'ロンデル・債券・エリア支配',
    genreEn: 'Rondel / Bonds / Area control',
    hook: '国を持つのではない。国に一番出資している者が、その国を動かす。出資を抜かれた瞬間、軍も国庫も相手のものになる。',
    hookEn: 'You do not own a country — whoever has lent it the most money commands it. Get outbid, and its armies and treasury change hands mid-game.',
    opponents: 'CPU 1〜5人（ルールベース）',
    opponentsEn: '1–5 CPU (rule-based)',
    lead: '六帝国の債券を引き受け、その国の政府として盤上を動かす。2006年版・日本語版ルールに準拠。',
    leadEn: 'Underwrite the bonds of six empires and command whichever one you have funded most. Follows the 2006 edition.',

    /* 相手の作り */
    method: '巡回の設計として解く',
    methodEn: 'Solved as a scheduling problem',
    methodBody:
      '学習も探索木も使っていない。このゲームの行動選択はロンデル（8マスの輪）で行われ、' +
      '同じマスに留まれず、時計回りにしか進めず、4マス目以降は1マスにつき2かかる。' +
      'つまり「何をするか」ではなく「どの順で回るか」を決める問題になっている。' +
      'そこで各マスについて、いま止まった場合の効果（徴税なら上がる国力、生産なら妨害されていない工場の数）を' +
      '見積もり、そこから移動料を引いた値で比べている。投資は「利息 × 国力係数」に、' +
      'その国の筆頭出資者を奪えるなら加点する。',
    methodBodyEn:
      'No learning and no search tree. Actions are chosen on a rondel of eight spaces: you may not stay put, ' +
      'you may only advance clockwise, and every space past the third costs 2. The decision is therefore not ' +
      'what to do but in what order to come back round. Each space is scored by its immediate payoff — the ' +
      'power gained if taxing, the number of unblocked factories if producing — minus the cost of reaching it. ' +
      'Investments are priced as interest × the power multiplier, plus a bonus for seizing control of a nation.',

    plate: {
      caption: '実測勝率',
      captionEn: 'Measured win rate',
      note: '4人戦・席順ローテーション・各400局（括弧内は95%信頼区間）',
      noteEn: '4 players, seats rotated, 400 games each (95% CI)',
      baseline: 0.25,
      rows: [
        { label: 'AI 1人 対 素人筋 3人',   labelEn: 'AI vs 3 naive',        v: 0.780, ci: 0.041, lead: true },
        { label: 'AI 1人 対 乱択 3人',     labelEn: 'AI vs 3 random',       v: 0.988, ci: 0.011 },
        { label: '素人筋 1人 対 AI 3人',   labelEn: 'Naive vs 3 AI',        v: 0.120, ci: 0.032 },
        { label: '乱択 1人 対 AI 3人',     labelEn: 'Random vs 3 AI',       v: 0.003, ci: 0.005 },
        { label: '［参考］素人筋 対 乱択3人', labelEn: '[ref] Naive vs 3 random', v: 0.815, ci: 0.038 }
      ]
    },

    remark:
      '席順の有利不利を疑って、AI 4人だけでも400局回した。席別の勝率は .233/.217/.300/.250 で、' +
      '偏りは信頼区間の内側に収まっている。なお本作は盤面に持ち込みの画像を1枚使っており、' +
      '他の3作の「画像を読み込まない」という作法からは外れている。',
    remarkEn:
      'Suspecting a seat advantage, 400 games were also run with four copies of the AI: .233/.217/.300/.250 by ' +
      'seat, within the confidence interval. Note that this one loads a single supplied board image, and so ' +
      'departs from the no-images rule the other three keep.',

    play: 'https://shunshun0904.github.io/imperial/',
    repo: 'https://github.com/shunshun0904/imperial',
    figure: 'rondel'
  },

  /* ---------------------------------------------------------------- 05 */
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

/* 設計の作法。収録作で実際に守られていること（例外はその場に書く）。 */
window.PB.PRINCIPLES = [
  {
    title: '外部依存を持たない',
    titleEn: 'No dependencies',
    body:
      'どれもライブラリもフォントも読み込まない。盤面も駒も手書きの SVG と CSS で、' +
      'ハイソサエティは index.html 1枚で完結する（学習した重み20KBごと埋め込んである）。' +
      'アクワイアも単一ファイル版を書き出せる。' +
      '例外はインペリアルで、持ち込みの盤面画像を1枚使い、ES モジュールのため配信が要る。' +
      '外から読むのはアクセス解析の1本だけ。それも web で配信しているときに限り、' +
      'ファイルとして開けば、どれも外へは何も出さない。',
    bodyEn:
      'None of them loads a library or a font. Boards and pieces are hand-written SVG and CSS. High Society is ' +
      'a single index.html, trained weights and all; Acquire can be exported as one file too. Imperial is the ' +
      'exception: it uses one supplied board image and, being ' +
      'ES modules, needs to be served. The one thing loaded from outside is analytics, and only when served ' +
      'over the web — opened as a file, none of them reaches out at all.'
  },
  {
    title: '遊ぶコードと測るコードを分けない',
    titleEn: 'One copy of the rules',
    body:
      '検査も学習も、遊ぶときと同じロジックをそのまま Node で実行する。' +
      'ブラウザで動く相手と、机上で測った相手がずれない。',
    bodyEn:
      'Tests and training run the very same logic that runs when you play. The opponent measured on the bench ' +
      'and the opponent in your browser cannot drift apart.'
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
