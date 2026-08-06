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
/* ページは4枚。1枚でも打ち忘れると、そのページだけ古いJSを掴み続ける */
const FILES = fs.readdirSync(ROOT)
  .filter(f => f.endsWith('.html') && !f.startsWith('google'))
  .sort()
  .map(f => path.join(ROOT, f));

/* src="assets/…" src="data/…" href="assets/…" を拾う。
   すでに ?v= が付いていれば付け替える。 */
const REF = /((?:src|href)=")((?:assets|data)\/[^"?#]+)(\?v=[^"]*)?(")/g;

const pages = FILES.map(f => ({ file: f, html: fs.readFileSync(f, 'utf8') }));
pages.forEach(p => { p.found = [...p.html.matchAll(REF)]; });
const total = pages.reduce((n, p) => n + p.found.length, 0);

if (!pages.length || !total) {
  console.error('❌ 参照が1つも見つからない。ページの書き方が変わった可能性がある');
  process.exit(1);
}

if (process.argv.includes('--check')) {
  let bare = 0;
  pages.forEach(p => {
    const b = p.found.filter(m => !m[3]);
    bare += b.length;
    console.log(`${path.basename(p.file)}: 参照 ${p.found.length} 件 / 版なし ${b.length} 件`);
    b.forEach(m => console.log('   版が付いていない:', m[2]));
  });
  process.exit(bare ? 1 : 0);
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

pages.forEach(p => {
  fs.writeFileSync(p.file, p.html.replace(REF, (_, pre, r, __, post) => `${pre}${r}?v=${tag}${post}`));
  console.log(`   ${path.basename(p.file)} … ${p.found.length} 件`);
});
console.log(`✅ ${pages.length} ページ・計 ${total} 件の参照に ?v=${tag} を付けた`);
