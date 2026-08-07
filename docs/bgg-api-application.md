# BoardGameGeek XML API 利用申請

<https://boardgamegeek.com/applications> のフォームに、**項目ごとにそのまま貼れる**形で
まとめてあります。

内容はすべて `tools/fetch-bgg.mjs` の実装と一致させてあります。
**実装を変えたらここも直してください。** 申告と実際の振る舞いがずれるのが、
いちばんまずい形です。

---

## 短い項目

| フォームの項目 | 記入内容 |
| --- | --- |
| Application name | `PLAYBENCH` |
| Your full legal name | （本名） |
| Your organization's name, if applicable | 空欄（個人のため） |
| Your organization's website | `https://shunshun0904.github.io/playbench/` |
| Your organization's location (City/town) | （お住まいの市区町村を検索して選ぶ） |
| Contact email | （日常的に見るアドレス） |
| Is your application available to the public? | **Yes** |
| Your API client(s), comma separated list | `https://shunshun0904.github.io/playbench/` |
| Is your endeavor commercial in nature? | **No** |

`Is your application available to the public?` は **Yes** です。
フォームの注記どおり「コードを公開リポジトリに置いている」時点で public に当たります。

---

## Describe your organization's (or your own) activities as they relate to BoardGameGeek and your use of the XML API.

> 補足: 3段落目の「BGG をどう使っているか」は、ご自身の実際の使い方に合わせて
> 直してください。事実と違うことは書かないほうがよいです。

```
I am a board game hobbyist and a software developer, writing as an individual —
there is no organization behind this.

Over the past months I have been reimplementing board games I love as small,
self-contained browser versions, and writing computer opponents for them. There are
four so far: Big Shot, Acquire, High Society and Imperial. Each one is a study
project. I read the rules carefully, implement them exactly, then build an opponent
and measure how strong it actually is over hundreds of games instead of guessing.
Where the rules left something genuinely ambiguous, I say so in writing rather than
quietly picking an interpretation.

I use BoardGameGeek as a reader — to check rules questions, to read the threads
that settle edge cases, and to work out what a game is really like before trying
it.

I would like to use the XML API for one narrow purpose: to show, on each game's
page, the community's average rating and average weight, credited to BGG and linked
back to that game's entry.
```

---

## Detailed description of your application(s), and how you will use our API

> フォームには「非技術的な説明を入れてください」とあるので、ここでは
> 技術の話は書きません。数字や仕組みは最後の欄に回します。

```
PLAYBENCH is a website where anyone can play four classic board games in their
browser — free, with no account and no installation. Alongside each game I publish
how strong its computer opponent is, measured over hundreds of games and shown
against the line where an evenly matched game would sit.

What those pages lack is context about the game itself. My own numbers say "this
opponent wins 78% of the time", but they say nothing about whether the game is a
light filler or a heavy three-hour negotiation, or whether people who have actually
played it enjoyed it. That is what I would like to borrow from BoardGameGeek.

On each game's card I would show two figures from BGG:

- the average weight (complexity), on its 1-5 scale
- the average rating, on its 1-10 scale

Each is shown with the number of ratings behind it, the date I retrieved it, and a
link to that game's page on boardgamegeek.com. They are deliberately styled
differently from my own measurements, so a visitor can tell at a glance which
numbers are mine and which are BGG's. The intent is that anyone curious about a
game is sent to BoardGameGeek to learn more, not kept on my site.

I would not republish descriptions, images, reviews, forum content or user data —
only those two community averages, with attribution.
```

---

## Please add any other information you think would be useful for us in evaluating your request for XML API access.

```
The main thing worth knowing is how little I would be asking of your servers.

- Two endpoints only: /xmlapi2/search (to resolve a title to an id, once per game)
  and /xmlapi2/thing?id=<id>&stats=1 (to read the figures).
- Six fields read: name, yearpublished, average, bayesaverage, usersrated,
  averageweight.
- At most 8 requests per refresh — four games, two calls each.
- Refreshed manually, at most once a week.
- At least 1.5 seconds between requests, and 202 / 429 responses are honoured with
  increasing back-off.

Crucially, this does not scale with my traffic. The results are written into my
repository as a static snapshot and served from GitHub Pages, so visitors' browsers
never contact BoardGameGeek at all. However popular the site becomes, the number of
requests reaching your servers stays exactly the same.

I do not scrape HTML pages.

Everything is open source, so all of the above can be verified:
https://github.com/shunshun0904/playbench

The fetching code is a single file, tools/fetch-bgg.mjs. The description I have
given here is kept next to it in docs/bgg-api-application.md, specifically so the
two cannot drift apart. Requests are sent with one User-Agent and no other:

  playbench/1.0 (+https://github.com/shunshun0904/playbench)

One note on why I am applying rather than simply calling the API: requests from
data-centre addresses are refused with 401 — I confirmed this against
api.geekdo.com, boardgamegeek.com and www.boardgamegeek.com. I would rather
register and identify myself honestly than route around that, so the code contains
no browser-impersonating fallback.

If the volume or the fields above are more than you are comfortable granting, I am
glad to reduce them. The site works without this data; it is simply less useful to
the reader.
```

---

## 日本語訳（提出はしません。内容確認用）

### 活動について

ボードゲーム愛好家であり、ソフトウェアを書く個人です。背後に組織はありません。

ここ数か月、好きなボードゲームを外部依存のないブラウザ版として作り直し、
相手のCPUを書いてきました。いまのところ4作（ビッグショット／アクワイア／
ハイソサエティ／インペリアル）。どれも勉強のための実装です。ルールを丁寧に読み、
その通りに実装し、相手を作って、**当て推量ではなく数百局の実測で強さを測ります**。
ルールが本当に曖昧だった箇所は、黙って解釈を決めるのではなく、そう書き残しています。

BGG は読み手として日常的に使っています ── ルールの疑問を確かめ、細かい裁定が
決着している議論を読み、そのゲームが実際どんなものかを知るために。

XML API は1点だけに使いたいです。各ゲームのページに、コミュニティの平均評価と
平均の重さを、BGG の出典を明記し、当該ページへリンクした上で表示すること。

### 使い方

PLAYBENCH は、4つの古典的ボードゲームをブラウザで遊べるサイトです。無料、
アカウント不要、インストール不要。各ゲームには、相手CPUの強さを数百局の実測で示し、
互角ならどこに来るかの線と一緒に載せています。

**それらのページに欠けているのは、ゲームそのものの手触りです。** こちらの数字は
「この相手は78%勝つ」とは言えても、そのゲームが軽い20分のつまみなのか、重い3時間の
交渉ゲームなのか、実際に遊んだ人が楽しんだのかは何も語りません。そこを BGG から
お借りしたい。

各カードに BGG から2つの数値を出します ── 重さ（1〜5）と評価（1〜10）。それぞれに
評価人数・取得日・該当ページへのリンクを添えます。こちらの実測とは見た目も分けて、
どちらの数字かが一目で分かるようにします。**狙いは、興味を持った人を BGG へ送ること**
であって、自分のサイトに留めることではありません。

説明文・画像・レビュー・フォーラムの内容・利用者データは一切再掲しません。
この2つの平均値だけです。

### その他

いちばん知っていただきたいのは、**負荷がどれだけ小さいか**です。

- 使う口は2つだけ（search と thing?stats=1）
- 読む項目は6つだけ
- 1回の更新につき最大8要求（4作 × 2口）
- 更新は手動、多くても週1回
- 要求間隔1.5秒以上。202・429 には待ち時間を増やして従う

**そして、これはサイトの人気とは無関係です。** 結果はリポジトリに静的なスナップ
ショットとして置き、GitHub Pages から配信するので、閲覧者のブラウザは BGG に一切
接続しません。何人が訪れても、BGG に届く要求の数は変わりません。

HTMLのスクレイピングはしません。すべて公開なので検証できます。

データセンターからの要求が 401 で拒否されることは3つの宛先で確認しました。回避策を
探すより素性を明らかにして使いたいので、**コードにブラウザのふりをする経路は置いて
いません**。

分量や項目が受け入れられない場合は減らします。このデータが無くてもサイトは動きます。
読み手にとって少し不便になるだけです。

---

## 通ったあと（2026-08、承認・鍵発行ずみ）

鍵は**リポジトリに置きません**。環境変数か GitHub の Secrets（`BGG_KEY`）から渡します。

```sh
BGG_KEY=xxxxxxxx npm run bgg             # 取得して data/bgg.js を書き換える
git add data/bgg.js && git commit && git push
```

Actions からも試せます（Actions → "Refresh BGG data" → Run workflow）。
承認の主眼はデータセンターからの 401 解除のはずなので、そこから通る可能性が
あります。通らなければ、これまでどおり手元で実行してください。

### 鍵の送り方について

**承認の通知に、鍵をどう送るかが書かれていれば、それに従ってください。**
書かれていない場合のために、道具は次の順で1回だけ実測して確かめます。

| `BGG_KEY_MODE` | 送り方 |
|---|---|
| `bearer` | `Authorization: Bearer <鍵>` |
| `xapikey` | `X-API-Key: <鍵>` |
| `query` | `?apikey=<鍵>` |
| `none` | 送らない（承認前と同じ。名乗りだけ） |

通ったものは実行時に画面へ出ます。以後 `BGG_KEY_MODE=bearer` のように
指定すれば試行は起きません。試すのは1つの宛先につき最大4回、1.5秒あけて ──
上の申請文で約束した「1回の更新につき最大8要求・1.5秒以上あける」の内側です。

**鍵そのものはログに出しません。** 出るのは送り方の名前だけです。

`data/bgg.js` が埋まれば各カードに重さと評価が出ます。空のあいだはその行が
出ないだけで、画面は壊れません。
