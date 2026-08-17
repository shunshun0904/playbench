/* 取得の段取りだけの検査。通信はしない（fetch を差し替えて動かす）。
     node test/bgg-fetch.mjs

   実際の取得は手元の回線でしか通らないので、そこで初めて間違いに気づくのは
   遅い。まとめて引けているか・別物を掴んでいないか・要求数が約束の内側かは、
   ここで先に固めておく。

   docs/bgg-api-application.md で BGG に申告した要求数の上限も、
   この検査で見張っている。実装だけ増えて申告が古くなるのを防ぐため。 */
'use strict';

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let bad = 0;
const ok = (cond, what, detail) => {
  console.log(`   ${cond ? '✅' : '❌'} ${what}${detail == null ? '' : `: ${detail}`}`);
  if (!cond) bad++;
};

/* --print で走らせる。書き込みは起きないので data/ は汚れない */
const run = spawnSync(process.execPath,
  ['--import', path.join(ROOT, 'test', 'stub-bgg.mjs'), path.join(ROOT, 'tools', 'fetch-bgg.mjs'), '--print'],
  { cwd: ROOT, encoding: 'utf8', timeout: 120000, env: { ...process.env, BGG_STUB: '1' } });

const out = (run.stdout || '') + (run.stderr || '');
if (run.status !== 0) {
  console.log(out);
  console.log(`\n❌ 道具が異常終了した（status=${run.status}）`);
  process.exit(1);
}

/* 差し替えた fetch が、呼ばれた URL を最後にまとめて出す */
const calls = [...out.matchAll(/^STUB (.+)$/gm)].map(m => m[1]);
const things = calls.filter(u => u.includes('/thing?'));
const searches = calls.filter(u => u.includes('/search?'));

console.log('── まとめて引けているか');
const batched = things.filter(u => (u.match(/,/g) || []).length >= 5);
ok(batched.length > 0, 'thing は id をカンマで並べて引いている', `${things.length} 回のうち ${batched.length} 回`);

/* 要求数の上限は docs/bgg-api-application.md で BGG に申告している数字。
   ここを緩めるときは、あちらも一緒に直すこと。

   いまの数は「初回＝data/bgg-picks.js がまだ無い」場合のもの。
   2回目からは前回の id を使い回すので search が丸ごと消え、
   thing のまとめ引きだけ（一覧60件で4回前後）になる。 */
console.log('── 要求数（初回・いちばん多い場合）');
ok(things.length <= 8, 'thing は8回以内', things.length);
ok(calls.length <= 30, '全体で30回以内', calls.length);
ok(searches.length <= 25, 'search は初回に見つからないぶんだけ', searches.length);

console.log('── 別物を掴まないこと');
/* stub は Codenames の id に別のゲームを返す。名前で気づいて引き直すはず */
ok(/⚠ id=178900 は/.test(out), 'id が別のゲームを指していたら気づく');
ok(searches.some(u => /Codenames/i.test(decodeURIComponent(u))),
   '気づいたら題名で引き直す');

console.log('── 書き出す中身');
ok(/window\.PB\.BGG_PICKS = \{/.test(out), 'data/bgg-picks.js の形で出す');
ok(/"fetchedAt": "\d{4}-\d{2}-\d{2}"/.test(out), '取得日が入る');
ok(/"poll":/.test(out), '人数投票が入る');
ok(/"minPlayers":/.test(out) && /"maxTime":/.test(out), '人数と時間が入る');
ok(!/"description"/.test(out) && !/"image"/.test(out),
   '説明文と画像は入れない（申告どおり）');

/* 既存の data/bgg.js 側（収録2作）も壊していないこと */
ok(/window\.PB\.BGG = \{/.test(out), '収録作ぶんの data/bgg.js も従来どおり出す');

console.log(bad ? `\n❌ ${bad} 件` : '\n✅ すべて通過');
process.exit(bad ? 1 : 0);
