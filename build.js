/* ==========================================================================
   index.html の CSS / JS をインライン展開して1枚にまとめる。
     node build.js
   出力:
     dist/playbench.html          盤上のページを1枚にまとめたもの
     dist/playbench-artifact.html Artifact 用（doctype/html/head/body を外した本文）
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');

const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let html = read('games.html');

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g,
  (_, href) => '<style>\n' + read(href).trim() + '\n</style>');

html = html.replace(/<script src="([^"]+)"><\/script>/g,
  (_, src) => '<script>\n' + read(src).trim() + '\n</script>');

if (/<link rel="stylesheet"|<script src=/.test(html)) {
  console.error('❌ インライン化できていない外部参照が残っています');
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'playbench.html'), html);

/* Artifact 用: 本文だけを取り出す */
const body = html.match(/<body>([\s\S]*)<\/body>/);
if (body) {
  const style = (html.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [, 'PLAYBENCH'])[1];
  fs.writeFileSync(path.join(OUT, 'playbench-artifact.html'),
    '<title>' + title + '</title>\n' + style + '\n' + body[1].trim() + '\n');
}

const kb = (fs.statSync(path.join(OUT, 'playbench.html')).size / 1024).toFixed(1);
console.log('✅ dist/playbench.html (' + kb + ' KB)');
console.log('✅ dist/playbench-artifact.html');
