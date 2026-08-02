# Search Console と アクセス解析

## なぜ登録できなかったか

原因は2つあります。どちらも `github.io` のサブパスで配信していることから来ます。

### 1. 「ドメイン」プロパティは github.io では使えない

Search Console の登録画面は左に **ドメイン**、右に **URL プレフィックス** が出ます。
ドメイン側は **DNS の TXT レコード**でしか確認できません。

`github.io` は GitHub の所有するドメインで、こちらは DNS を触れません。
**この方式は原理的に通りません。** 左を選んでいた場合、何度やっても失敗します。

使うのは **URL プレフィックス**のほうで、値は末尾のスラッシュまで含めて:

```
https://shunshun0904.github.io/playbench/
```

### 2. 確認の材料がリポジトリに1つも無かった

URL プレフィックスでも、所有を示すものが要ります。用意していませんでした。

- `googleXXXX.html` … 無し
- `<meta name="google-site-verification">` … 無し

**いまは解決済みです。** リポジトリ直下の `google2e24f8e4be168c53.html`
（ファイル方式）で確認が通っています。

> ⚠ このファイルは**消さないでください。** 消すと所有確認が外れ、
> 蓄積したデータごとプロパティが使えなくなります。中身は1行だけで、
> `https://shunshun0904.github.io/playbench/google2e24f8e4be168c53.html`
> として配信されます。

---

## 手順（済み。他のサイトを足すときのために残す）

1. Search Console で **URL プレフィックス**を選ぶ
2. `https://shunshun0904.github.io/playbench/` を入れる
3. 確認方法は次のどちらか

   **HTML ファイル**（← playbench はこちらで通した）
   ダウンロードした `googleXXXX.html` を**リポジトリ直下**に置いて push。
   `https://shunshun0904.github.io/playbench/googleXXXX.html` で配信されます。

   **HTML タグ**
   出てきた `<meta name="google-site-verification" content="..." >` を
   `index.html` の `<head>`、コメントの直下に貼って push。

4. 配備が終わってから「確認」を押す

> 配備の直後は最大10分キャッシュされます。
> 確認に失敗したら、少し待って再読み込みしてから押し直してください。

5. 通ったら **サイトマップ**に `sitemap.xml` と入れて送信

残りの5サイト（`/bigshot/` など）も同じ手順で1つずつ登録できます。
まとめたい場合は下の「`shunshun0904.github.io` リポジトリを作る」を参照。

---

## 知っておくべき制限

### robots.txt は置けない

`robots.txt` は**ドメインのルート**にしか効きません。

```
https://shunshun0904.github.io/robots.txt      ← ここでないと読まれない
https://shunshun0904.github.io/playbench/robots.txt  ← 無視される
```

ルートに置くには `shunshun0904.github.io` という名前のリポジトリが要りますが、
**いまは存在しません**（ルートURLは 404 です）。

### ゲーム本体は別プロパティになる

収録ゲームはそれぞれ別のパスで配信されています。

```
/playbench/    /bigshot/    /aquire/    /highsociety/    /imperial/    /redplanet/
```

URL プレフィックスのプロパティは**そのパス配下しか見えません**。
6つ全部を見るなら、プロパティを6つ作るか、下の方法で1つにまとめます。

### まとめたいなら `shunshun0904.github.io` リポジトリを作る

`shunshun0904.github.io` という名前のリポジトリを作ると、
`https://shunshun0904.github.io/` がそのリポジトリの内容になります。すると:

- **プロパティを1つ**（`https://shunshun0904.github.io/`）にできて、6サイトぶんまとめて見える
- **ルートに `robots.txt` と `sitemap.xml`** を置ける
- いま 404 のルートに、全作品への入口を置ける

サブパスの配信（`/playbench/` など）はそのまま動きます。

---

## アクセス解析（Google アナリティクス）

Search Console で分かるのは**検索からの表示回数・クリック数・流入クエリ**までで、
入ったあとサイト内で何が読まれたかは見えません。そちらは GA でとります。

手順は [`analytics.md`](analytics.md) にまとめました。`assets/config.js` に
測定IDを1行貼るだけで、貼るまでは gtag.js を読み込みません。

つないでおくと両方が1画面で追えます:
**GA の 管理 → サービス間のリンク設定 → Search Console のリンク**。
先にこのページの手順で所有確認を通しておく必要があります。

### 文言はすでに直してあります

以前は奥付と README にこう書いてありました。

> PLAYBENCH は個人による非商用のサイトです。何も販売せず、**何も追跡せず**、広告も出しません。

GA を入れるとこれは事実でなくなるので、**「何も追跡せず」は消しました**（英語の
`nothing is tracked` も同じ）。いまは何を集めるかを書き、そのうえで
**いまこの端末で実際に計測しているか**を状態から書き出しています。
止める手段も奥付に出してあります（DNT の尊重と、その場で止めるボタン）。
