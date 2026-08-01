/* ==========================================================================
   index.html の自前ファイル参照に ?v=… を付ける。

     node tools/stamp-assets.mjs <版>
     node tools/stamp-assets.mjs --check      付いているか確かめるだけ

   なぜ要るか:
   GitHub Pages は Cache-Control: max-age=600 で配る。参照するURLが
   assets/site.js のまま変わらないと、閲覧者のブラウザは手元の古い写しを
   使い続ける。配備は成功しているのに画面が変わらない、という形になる。
   実際、ゲームを1つ増やしたときにそれが起きた。

   版はコミットの SHA を使う。配備のたびに URL が変わるので、
   ブラウザは必ず取り直す。中身が変わっていないファイルも取り直すことになるが、
   全部合わせて 100KB 程度なので、取りこぼしの分かりにくさに比べれば安い。

   触るのは同じリポジトリ内の assets/ と data/ だけ。data: URI や
   外部URLには手を出さない。
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'index.html');

/* src="assets/…" src="data/…" href="assets/…" を拾う。
   すでに ?v= が付いていれば付け替える。 */
const REF = /((?:src|href)=")((?:assets|data)\/[^"?#]+)(\?v=[^"]*)?(")/g;

const html = fs.readFileSync(FILE, 'utf8');
const found = [...html.matchAll(REF)];

if (process.argv.includes('--check')) {
  const bare = found.filter(m => !m[3]);
  console.log(`自前ファイルの参照 ${found.length} 件 / 版なし ${bare.length} 件`);
  bare.forEach(m => console.log('   版が付いていない:', m[2]));
  if (!found.length) {
    console.error('❌ 参照が1つも見つからない。index.html の書き方が変わった可能性がある');
    process.exit(1);
  }
  process.exit(bare.length ? 1 : 0);
}

const version = (process.argv[2] || '').trim();
if (!version) {
  console.error('版を渡してください: node tools/stamp-assets.mjs <版>');
  process.exit(1);
}
const tag = version.slice(0, 12).replace(/[^A-Za-z0-9._-]/g, '');
if (!tag) {
  console.error('版に使える文字がありません');
  process.exit(1);
}

if (!found.length) {
  console.error('❌ 参照が1つも見つからない。index.html の書き方が変わった可能性がある');
  process.exit(1);
}

const out = html.replace(REF, (_, pre, p, __, post) => `${pre}${p}?v=${tag}${post}`);
fs.writeFileSync(FILE, out);

console.log(`✅ ${found.length} 件の参照に ?v=${tag} を付けた`);
found.forEach(m => console.log('   ', m[2]));
