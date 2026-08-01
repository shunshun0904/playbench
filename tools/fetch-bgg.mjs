/* ==========================================================================
   BoardGameGeek から重さ（複雑さ）と評価を取ってきて data/bgg.js に書く。

     node tools/fetch-bgg.mjs

   ここで取るのは「他人が付けた数字」であって、こちらの実測ではない。
   だから別ファイルに分け、取得日と件数を必ず一緒に残す。
   BGG の値は日々動くので、載せた瞬間から古くなっていくことを前提にする。

   実行は GitHub Actions。閲覧者のブラウザから BGG を叩かせない
   （外部依存を増やさないため、そして BGG に負荷をかけないため）。

   照合は data/works.js の bggName（BGG 上の英語名）で行う。
   取ってきた名前と発行年も JSON に残すので、別物を掴んでいれば一目で分かる。
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
/* BGG はデータセンターからの要求を弾くことがある（GitHub Actions のランナーは
   まさにそれ）。宛先も名乗りも複数用意して、通る組み合わせを探す。
   どれも通らなければ、手元で実行してもらうほうが早い。 */
const HOSTS = [
  'https://api.geekdo.com/xmlapi2',
  'https://boardgamegeek.com/xmlapi2',
  'https://www.boardgamegeek.com/xmlapi2'
];
/* 名乗りはこれ1つだけ。ブラウザのふりをする経路は置かない。
   利用申請で「素性を明かして使いたい」と書いている以上、
   コードに逃げ道を残すのは筋が通らない。
   申請文（docs/bgg-api-application.md）に書いた名乗りと同じものにしておく。 */
const UAS = [
  'playbench/1.0 (+https://github.com/shunshun0904/playbench)'
];
let API = null, UA = UAS[0];   // 一度通った組み合わせを使い回す

/* ---------------------------------------------------------------- 小物 */
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function hit(base, ua, pathq) {
  return fetch(base + pathq, {
    headers: {
      'User-Agent': ua,
      'Accept': 'application/xml,text/xml,*/*',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
}

/* 最初の1回だけ、通る宛先と名乗りの組み合わせを探す */
async function probe(pathq) {
  for (const base of HOSTS) {
    for (const ua of UAS) {
      try {
        const res = await hit(base, ua, pathq);
        console.log(`   試行 ${res.status} ${base} / ${ua.slice(0, 24)}…`);
        if (res.ok || res.status === 202) { API = base; UA = ua; return res; }
      } catch (e) {
        console.log(`   試行 失敗 ${base} ── ${e.message}`);
      }
      await sleep(600);
    }
  }
  return null;
}

/* BGG は温まっていないと 202 を返して「あとで来い」と言う。素直に待つ。 */
async function get(pathq, tries = 6) {
  for (let i = 0; i < tries; i++) {
    let res;
    if (!API) {
      res = await probe(pathq);
      if (!res) throw new Error(
        'どの宛先・名乗りでも BGG に届かない。BGG はデータセンターからの要求を 401 で弾くので、' +
        'CI やクラウド上では取得できない。ご自分の回線で実行してください: npm run bgg');
    } else {
      res = await hit(API, UA, pathq);
    }
    if (res.status === 202 || res.status === 429) {
      const wait = 2000 * (i + 1);
      console.log(`   ${res.status} ── ${wait / 1000}秒待って再試行`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${(API || '') + pathq}`);
    return res.text();
  }
  throw new Error('BGG が応答しない: ' + pathq);
}

/* 必要な項目は数えるほどしかなく、XML の形も安定している。
   ライブラリを足さずに属性を1つずつ拾う。

   タグ名の直後に境界を要求するのが肝。これが無いと <average> の検索が
   <averageweight> に当たってしまい、評価点のつもりで複雑さを拾う。
   いまの BGG は average を先に出すので偶然そうならないだけで、
   順序が変わった瞬間に「それらしい別の数字」が黙って表示される。 */
export const attr = (xml, tag, name = 'value') => {
  const m = xml.match(new RegExp(`<${tag}(?=[\\s/>])[^>]*\\b${name}="([^"]*)"`));
  return m ? m[1] : null;
};
/* 空文字を弾くのが肝。Number('') は 0 になるので、
   値が入っていない属性が「実測された 0」として画面に出てしまう。
   本当に 0 のとき（評価が1件も無い新作など）とは区別する。 */
export const num = (xml, tag) => {
  const v = attr(xml, tag);
  if (v === null || String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* 正式名は type="primary" のもの。属性の並び順は決め打ちにしない */
export function primaryName(xml) {
  const m = xml.match(/<name\b[^>]*\btype="primary"[^>]*\bvalue="([^"]*)"/)
        || xml.match(/<name\b[^>]*\bvalue="([^"]*)"[^>]*\btype="primary"/)
        || xml.match(/<name\b[^>]*\bvalue="([^"]*)"/);
  return m ? m[1] : null;
}

/* 取り出しをひとまとめに。検査から直接呼べるように分けてある */
export function parseThing(xml, id) {
  return {
    id,
    name: primaryName(xml),
    year: num(xml, 'yearpublished'),
    weight: num(xml, 'averageweight'),   // 1〜5 の複雑さ
    rating: num(xml, 'average'),         // 1〜10 の平均評価
    bayes: num(xml, 'bayesaverage'),     // 少数票を薄めた評価
    ratings: num(xml, 'usersrated')      // 評価した人数
  };
}

/* ------------------------------------------------------------ 名前で引く */
async function resolveId(name) {
  const xml = await get(`/search?type=boardgame&exact=1&query=${encodeURIComponent(name)}`);
  const ids = [...xml.matchAll(/<item[^>]*\bid="(\d+)"/g)].map(m => m[1]);
  if (!ids.length) throw new Error(`BGG に「${name}」が見つからない`);
  if (ids.length > 1) console.log(`   完全一致が ${ids.length} 件。いちばん若い id を採る`);
  // 同名が複数あるときは登録の古いほう＝原典であることが多い
  return ids.map(Number).sort((a, b) => a - b)[0];
}

async function fetchThing(id) {
  return parseThing(await get(`/thing?id=${id}&stats=1`), id);
}

/* --------------------------------------------------------------- 本体 */
/* 検査から読み込まれたときは、ここから下を走らせない */
if (process.argv[1] && !process.argv[1].endsWith('fetch-bgg.mjs')) {
  // import されただけ。何もしない
} else {

const PRINT_ONLY = process.argv.includes('--print');

const works = await (async () => {
  const src = fs.readFileSync(path.join(ROOT, 'data', 'works.js'), 'utf8');
  const sandbox = { PB: {} };
  new Function('window', src)(sandbox);
  return sandbox.PB.WORKS;
})();

const out = { fetchedAt: new Date().toISOString().slice(0, 10), source: 'boardgamegeek.com', games: {} };
let failed = 0;

for (const w of works) {
  if (!w.bggName) { console.log(`— ${w.id}: bggName が無いので飛ばす`); continue; }
  try {
    console.log(`— ${w.id} (${w.bggName})`);
    const id = w.bggId || await resolveId(w.bggName);
    const t = await fetchThing(id);

    if (t.weight === null && t.rating === null) throw new Error('数値が取れなかった');
    out.games[w.id] = {
      id: t.id, name: t.name, year: t.year,
      weight: t.weight === null ? null : Math.round(t.weight * 100) / 100,
      rating: t.rating === null ? null : Math.round(t.rating * 100) / 100,
      bayes: t.bayes === null ? null : Math.round(t.bayes * 100) / 100,
      ratings: t.ratings
    };
    console.log(`   id=${t.id} 「${t.name}」(${t.year}) 重さ ${t.weight} / 評価 ${t.rating} / ${t.ratings}人`);
    await sleep(1500);   // BGG への間隔をあける
  } catch (e) {
    failed++;
    console.log(`   ✗ ${e.message}`);
  }
}

const got = Object.keys(out.games).length;
if (!got) {
  console.error('\n❌ 1件も取れなかった。既存の data/bgg.js は残す。');
  console.error('   手元の回線で `npm run bgg` を実行し、data/bgg.js をコミットしてください。');
  process.exit(1);
}

/* JSON ではなく JS として書く。fetch を使わずに読めるので、
   file:// で開いても動くという収録作と同じ性質を保てる。 */
const file = path.join(ROOT, 'data', 'bgg.js');
const next =
  '/* boardgamegeek.com から取得。tools/fetch-bgg.mjs が書き換えるので手で編集しない。\n' +
  '   こちらの実測ではなく他人が付けた数字なので、取得日と評価人数を必ず添えて表示する。 */\n' +
  "'use strict';\n\nwindow.PB = window.PB || {};\nwindow.PB.BGG = " +
  JSON.stringify(out, null, 2) + ';\n';

/* 取得日しか変わっていないなら書かない（毎回コミットが増えるのを防ぐ） */
let changed = true;
if (fs.existsSync(file)) {
  const prev = fs.readFileSync(file, 'utf8');
  const m = prev.match(/window\.PB\.BGG = ([\s\S]*);\s*$/);
  if (m) {
    try { changed = JSON.stringify(JSON.parse(m[1]).games) !== JSON.stringify(out.games); }
    catch (e) { changed = true; }
  }
}
/* --print なら書き込まず中身だけ出す。別の回線の機械で走らせて、
   出てきたものを data/bgg.js に貼れば済むようにするため。 */
if (PRINT_ONLY) {
  console.log('\n----- ここから下を data/bgg.js に貼る -----');
  console.log(next);
} else if (changed) {
  fs.writeFileSync(file, next);
  console.log(`\n✅ data/bgg.js を更新（${got}/${works.length} 件${failed ? `・失敗 ${failed} 件` : ''}）`);
} else {
  console.log(`\n○ 値に変化なし。書き換えない（${got} 件）`);
}

}
