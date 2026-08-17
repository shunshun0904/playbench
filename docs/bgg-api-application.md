# BoardGameGeek XML API 利用申請

<https://boardgamegeek.com/applications> のフォームに、**項目ごとにそのまま貼れる**形で
まとめてあります。

内容はすべて `tools/fetch-bgg.mjs` の実装と一致させてあります。
**実装を変えたらここも直してください。** 申告と実際の振る舞いがずれるのが、
いちばんまずい形です。

---

## ⚠ 2026-08 の変更 ── BGG への連絡がまだ済んでいません

`recommend.html`（はじめての人向けのおすすめ）を作るにあたり、**読む項目と作品数を
承認時の申告より広げました。** 実装とこの文書は一致させてあります。残っているのは
**BGG に伝えること**です。

| | 承認時の申告 | いまの実装 |
|---|---|---|
| 使う口 | search と thing の2つ | 変わらず2つ |
| 読む項目 | 6項目 | 16項目（人数・時間・対象年齢・総合ランク・人数投票・分類を追加） |
| 作品数 | 4作 | 収録2作 ＋ おすすめ一覧 約60作 |
| 1回の要求数 | 最大8 | 初回30以内／2回目以降12前後 |
| 更新 | 手動・多くても週1回 | 変わらず |
| 閲覧者のブラウザから叩くか | 叩かない | 変わらず叩かない |
| 説明文・画像・レビュー・利用者データ | 再掲しない | 変わらず再掲しない |

**取得を実行する前に、BGG の窓口へ変更を伝えてください。** 下の英文の
「Detailed description」と「other information」は、そのまま連絡文として使える形に
更新してあります。申告より広く取ってしまうのが、いちばん避けたい形です。

要求数の上限は `test/bgg-fetch.mjs` が見張っています（通信しません）。
ここの数字を変えるときは、あちらの閾値も一緒に直してください。

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

There is a second page, added later, which I should describe here as well.

Most people who ask me "which board game should I buy first?" cannot use a
ranking. The top of any ranked list is full of three-hour games, and a beginner
who starts there usually never plays a second one. So I built a page that asks
five plain questions — how many people, how long, how much experience, what kind
of evening you want, who you are playing with — and answers them from BGG's own
figures rather than from my opinion.

The single most useful thing on it is your community's player-count poll. Being
able to say "612 people voted, and 588 of them say this is best at two" is worth
more to a beginner than any review, and it exists nowhere else. Alongside it I use
the player range, playing time, minimum age, the average weight, the average
rating with its number of votes, the Board Game Rank, and the category and
mechanic names — the last two only to work out roughly what kind of evening a game
gives you.

Every game shown carries its BGG rating, its weight, the number of people who
rated it, the date I retrieved all of it, and a link to its page on
boardgamegeek.com. The page also states plainly, at the foot, that the figures
come from BGG. Where a game is a poor fit it says so using your figures — "this
count is not recommended by the poll", "this is heavier than you asked for" —
because the point of the page is to stop beginners buying the wrong box, and that
needs the unflattering numbers as much as the flattering ones.

I would not republish descriptions, images, reviews, forum content or user data.
What I read is the factual shape of a game and the community averages, with
attribution and a link back on every single entry.
```

---

## Please add any other information you think would be useful for us in evaluating your request for XML API access.

```
The main thing worth knowing is how little I would be asking of your servers.

- Two endpoints only: /xmlapi2/search (to resolve a title to an id, once per title,
  ever) and /xmlapi2/thing?id=<id>&stats=1 (to read the figures).
- Sixteen fields read: name, yearpublished, minplayers, maxplayers, minplaytime,
  maxplaytime, playingtime, minage, average, bayesaverage, usersrated,
  averageweight, the Board Game Rank value, the suggested_numplayers poll, and the
  names of boardgamecategory and boardgamemechanic links.
- About 60 games in total.
- Requests are batched: /thing takes twenty comma-separated ids at a time, so the
  whole catalogue is four calls, not sixty. Resolved ids are written into the
  snapshot and reused, so /search runs only for a title I have never fetched
  before.
- That makes at most 30 requests the first time a title list is fetched, and
  around 12 for a routine refresh afterwards.
- Refreshed manually, at most once a week.
- At least 1.5 seconds between requests, and 202 / 429 responses are honoured with
  increasing back-off.
- If a returned title does not match the title I asked for, I discard it rather
  than display it. I would rather show nothing than show your data against the
  wrong game.

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

**あとから足したページについても、ここで説明しておきます。**

「最初の1つは何を買えばいい?」と聞いてくる人の多くは、ランキングを使えません。
上位は3時間級で埋まっていて、そこから始めた初心者はたいてい2つ目を遊びません。
そこで、5つの平凡な質問（何人・どれくらいの時間・経験・どんな時間を過ごしたいか・
誰と）に答えてもらい、**こちらの意見ではなく BGG の数値で**答えるページを作りました。

いちばん効くのは**人数投票**です。「612人が投票し、588人が2人がベストと答えている」
と言えることは、初心者にとってどんなレビューよりも価値があり、他のどこにもありません。
併せて、人数の範囲・プレイ時間・対象年齢・重さ・評価（票数つき）・総合ランク・
分類とメカニクスの名前を使います。最後の2つは「どんな時間になるゲームか」を
おおまかに判別するためだけに使います。

出す作品には必ず、評価・重さ・評価人数・取得日・BGG の当該ページへのリンクを添えます。
ページの下部にも、数値の出どころが BGG であることを明記します。**条件に合わない
ときは、BGG の数値を使ってそう言います** ──「この人数は投票では推奨されていない」
「希望より重い」。初心者が箱を買い間違えないためのページなので、都合の良い数字だけ
でなく、都合の悪い数字も要ります。

説明文・画像・レビュー・フォーラムの内容・利用者データは一切再掲しません。
読むのは、ゲームの事実としての形と、コミュニティが付けた平均値だけです。

### その他

いちばん知っていただきたいのは、**負荷がどれだけ小さいか**です。

- 使う口は2つだけ（search と thing?stats=1）
- 読む項目は16（名前・発行年・人数・時間・対象年齢・評価・重さ・評価人数・
  総合ランク・人数投票・分類とメカニクスの名前）
- 作品数は約60
- **まとめて引きます。** thing は id を20件ずつカンマで並べるので、一覧全体で4要求。
  引き当てた id はスナップショットに残して使い回すので、search が走るのは
  一度も取ったことのない題だけ
- 初回で最大30要求、2回目以降は12前後
- 更新は手動、多くても週1回
- 要求間隔1.5秒以上。202・429 には待ち時間を増やして従う
- 返ってきた題が頼んだ題と違えば、表示せずに捨てます。
  間違ったゲームに BGG の数値を貼るより、何も出さないほうがましなので

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
