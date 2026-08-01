# BoardGameGeek XML API 利用申請

<https://boardgamegeek.com/applications> への申請に使う文面です。

**そのまま貼れます。** 項目名がここと違う場合は、近い項目に読み替えてください。
下に日本語訳を併記してあるので、何を申告しているかを確かめてから出せます。

内容はすべて `tools/fetch-bgg.mjs` の実装と一致させてあります。実装を変えたら
ここも直してください。**申告と実際の振る舞いがずれるのが、いちばんまずい形です。**

---

## 短く答える項目

| 項目 | 記入する内容 |
| --- | --- |
| Application name | `PLAYBENCH` |
| Application URL | `https://shunshun0904.github.io/playbench/` |
| Source code | `https://github.com/shunshun0904/playbench` |
| Type | Personal, non-commercial |
| Platform | Static website (GitHub Pages) + a command-line fetch script (Node.js) |
| User-Agent | `playbench/1.0 (+https://github.com/shunshun0904/playbench)` |
| Contact e-mail | （ご自分のアドレス） |

---

## 本文（英語・そのままコピー）

### What the application is

PLAYBENCH is a small personal website that hosts browser implementations of four
classic board games — Big Shot, Acquire, High Society and Imperial. Each game is
written from scratch in dependency-free JavaScript, and each ships with a computer
opponent whose playing strength has been measured over hundreds of games and
published alongside it.

The site is non-commercial. It carries no advertising, sells nothing, and does not
track visitors. Every game entry names the designer and states plainly that the
implementation is an unofficial fan project containing no trademarks and no
original artwork.

### What data I would like to read

For exactly four games, using only the official XML API2:

- `GET /xmlapi2/search?type=boardgame&exact=1&query=<title>`
  — to resolve a title to its BGG id, once per game.
- `GET /xmlapi2/thing?id=<id>&stats=1`
  — to read six fields: the primary `name`, `yearpublished`, and from
  `statistics/ratings`: `average`, `bayesaverage`, `usersrated` and `averageweight`.

I do not scrape HTML pages, and I do not read user accounts, collections, forums,
images, or any personal data.

### How the data is used

The average rating and the average weight are shown on each game's card, so that a
visitor can see how the wider community rates a game and how complex it is, next to
my own measured figures for the computer opponent's strength.

Every BoardGameGeek figure on the site is:

- labelled as coming from BoardGameGeek,
- shown together with the number of ratings it is based on,
- shown together with the date it was retrieved, and
- accompanied by a link to that game's page on boardgamegeek.com.

They are also styled differently from my own measurements, so that a reader can
tell at a glance which numbers are mine and which are yours.

### Request volume

Very low, and — importantly — it does not grow with the site's traffic.

- At most **8 requests per refresh** (4 games × 2 endpoints).
- Refreshed **manually, at most once a week**.
- At least **1.5 seconds between requests**; `202` and `429` responses are
  respected with increasing back-off.

The results are written into the repository as a static snapshot and served from
GitHub Pages. **Visitors' browsers never contact BoardGameGeek.** However many
people visit the site, the number of requests reaching your servers stays the same.

### Why I am applying

Requests from data-centre addresses are refused with `401`. I confirmed this
against `api.geekdo.com`, `boardgamegeek.com` and `www.boardgamegeek.com`. I would
rather register the application and identify it honestly than work around the
block, so I am asking for access on the terms above. If the volume or the fields
listed here are not acceptable, I am happy to reduce them.

---

## 日本語訳（提出はしません。内容確認用）

### これは何か

PLAYBENCH は、4つの古典的ボードゲーム（ビッグショット／アクワイア／ハイソサエティ／
インペリアル）をブラウザで遊べるようにした個人サイトです。どれも外部依存のない
JavaScript で一から実装しており、相手のCPUの強さを数百局にわたって実測し、
その数字も一緒に公開しています。

非商用です。広告を出さず、何も販売せず、閲覧者を追跡しません。各作品には作者名を
明記し、商標もアートワークも含まない非公式のファン実装であることを断っています。

### 何を読みたいか

4作品ぶんだけ、公式の XML API2 のみを使います。

- `search`（完全一致）── 題名から BGG の id を引く。1作につき1回
- `thing?stats=1` ── 6項目だけ読む：正式名、発行年、平均評価、ベイズ平均、
  評価人数、平均の重さ

HTMLのスクレイピングはしません。利用者アカウント・コレクション・フォーラム・画像・
個人情報のたぐいは一切読みません。

### どう使うか

平均評価と重さを各ゲームのカードに出します。こちらが実測したCPUの強さの隣に置いて、
「広く遊ばれている評価」と「この相手の強さ」を並べて見られるようにするためです。

BGG 由来の数値には必ず、出典が BGG であること・評価人数・取得日・該当ページへの
リンクを添えます。こちらの実測とは見た目も分けて、どちらの数字かが一目で分かるように
しています。

### どれくらい叩くか

非常に少なく、しかも**サイトの人気とは無関係**です。

- 1回の更新につき最大8要求（4作 × 2口）
- 更新は手動で、多くても週1回
- 要求間隔は1.5秒以上。202・429 は待ち時間を増やしながら従う

取得結果はリポジトリに静的なスナップショットとして置き、GitHub Pages から配信します。
**閲覧者のブラウザは BGG に一切接続しません。** 何人が訪れても、BGG に届く要求の数は
変わりません。

### なぜ申請するか

データセンターからの要求は 401 で拒否されます（3つの宛先で確認済み）。回避策を探すより、
申請して素性を明らかにして使いたいので、上記の条件でお願いしています。分量や項目が
受け入れられない場合は、減らします。

---

## 通ったあとにやること

BGG から鍵や識別子が発行された場合は、`tools/fetch-bgg.mjs` の要求に足してください。
いまは名乗り（User-Agent）だけで識別しています。

`data/bgg.js` が実データで埋まれば、各カードに重さと評価が出ます。空のあいだは
その行が出ないだけで、画面は壊れません。
