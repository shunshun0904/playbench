/* ==========================================================================
   マクロ経済指標を取ってきて data/macro.js を書き換える。

     ALPHAVANTAGE_KEY=xxxx node tools/fetch-macro.mjs
     ALPHAVANTAGE_KEY=xxxx node tools/fetch-macro.mjs --print   書き換えず出すだけ

   鍵は https://www.alphavantage.co/support/#api-key で無料で取れる。
   無料枠は1日25回なので、指標4つなら1日に何度でも回せる。

   なぜ CI で回さないか:
   BGG のときと同じで、CI から外部APIを叩くのは詰まりやすい。
   ここでも「手元で取る → JSON をコミットする → サイトはそれを読む」に統一する。
   数字がいつ時点のものかは data/macro.js の fetched に残る。

   何を取るかは data/macro.js の INDICATORS が決める。
   このファイルには指標の一覧を持たない（2か所に散らすと必ずずれる）。
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'data', 'macro.js');
const KEY = process.env.ALPHAVANTAGE_KEY || '';
const PRINT = process.argv.includes('--print');

if (!KEY) {
  console.error('鍵がありません。 ALPHAVANTAGE_KEY=xxxx node tools/fetch-macro.mjs');
  console.error('取得先: https://www.alphavantage.co/support/#api-key');
  process.exit(1);
}

/* data/macro.js から INDICATORS を読む。ブラウザ用のファイルなので、
   window を用意してから評価する。 */
function loadIndicators() {
  const src = fs.readFileSync(FILE, 'utf8');
  const win = { PB: {} };
  new Function('window', src)(win);
  if (!win.PB.INDICATORS) throw new Error('INDICATORS が読めません');
  return win.PB.INDICATORS;
}

async function fetchOne(ind) {
  const q = new URLSearchParams({ function: ind.fn, apikey: KEY, datatype: 'json' });
  if (ind.maturity) q.set('maturity', ind.maturity);
  if (ind.fn !== 'UNEMPLOYMENT' && ind.fn !== 'CPI') q.set('interval', 'monthly');

  const res = await fetch('https://www.alphavantage.co/query?' + q, {
    headers: { 'User-Agent': 'shunshun0904-site/1.0 (+https://github.com/shunshun0904)' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();

  /* 無料枠を使い切ると、200 で「Note」や「Information」が返る。
     それを数字として扱わないよう、ここで止める。 */
  if (j.Note || j.Information || j['Error Message']) {
    throw new Error(j.Note || j.Information || j['Error Message']);
  }
  if (!Array.isArray(j.data) || !j.data.length) throw new Error('data が空');
  return j.data;                    // 新しい順で返ってくる
}

/* 「開始月 + 値の並び」に均す。抜けている月は null にして、抜けを抜けとして残す。 */
function toSeries(rows, fromYear) {
  const byMonth = new Map();
  for (const r of rows) {
    const m = String(r.date).slice(0, 7);
    const raw = String(r.value ?? '').trim();
    if (!raw || raw === '.') continue;          // AlphaVantage は欠測を '.' で返す
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    byMonth.set(m, Math.round(n * 100) / 100);
  }
  const keys = [...byMonth.keys()].sort();
  if (!keys.length) throw new Error('使える値がない');

  const start = keys.find(k => +k.slice(0, 4) >= fromYear) || keys[0];
  const last = keys[keys.length - 1];
  const [sy, sm] = start.split('-').map(Number);
  const [ly, lm] = last.split('-').map(Number);
  const n = (ly - sy) * 12 + (lm - sm) + 1;

  const v = [];
  for (let i = 0; i < n; i++) {
    const t = (sm - 1) + i;
    const key = (sy + Math.floor(t / 12)) + '-' + String(t % 12 + 1).padStart(2, '0');
    v.push(byMonth.has(key) ? byMonth.get(key) : null);
  }
  return { from: start, step: 'month', v };
}

/* 前年同月比。指数（CPI など）は水準より向きを見たい。 */
function yoy(s) {
  const v = s.v.map((x, i) => {
    const b = s.v[i - 12];
    if (x == null || b == null || !b) return null;
    return Math.round((x / b - 1) * 1000) / 10;
  });
  const first = v.findIndex(x => x != null);
  if (first < 0) throw new Error('前年比が作れない');
  const a = s.from.split('-').map(Number), t = (a[1] - 1) + first;
  return { from: (a[0] + Math.floor(t / 12)) + '-' + String(t % 12 + 1).padStart(2, '0'),
           step: 'month', v: v.slice(first) };
}

function render(series, unit) {
  const rows = [];
  for (let i = 0; i < series.v.length; i += 12) {
    rows.push('        ' + series.v.slice(i, i + 12)
      .map(x => x == null ? 'null' : x.toFixed(2)).join(', '));
  }
  return `      from: '${series.from}', step: 'month', unit: '${unit || ''}',\n`
       + `      v: [\n${rows.join(',\n')}\n      ]`;
}

const FROM_YEAR = 2000;

const inds = loadIndicators();
const out = {};
for (const ind of inds) {
  process.stdout.write(`── ${ind.id} (${ind.fn}) … `);
  try {
    let s = toSeries(await fetchOne(ind), FROM_YEAR);
    if (ind.transform === 'yoy') s = yoy(s);
    out[ind.id] = s;
    const missing = s.v.filter(x => x == null).length;
    console.log(`${s.v.length} か月 / 欠測 ${missing} / 直近 ${s.v[s.v.length - 1]}${ind.unit || ''}`);
  } catch (e) {
    console.log('❌ ' + e.message);
    console.log('   （この指標は据え置きます。前回の値が残ります）');
  }
  await new Promise(r => setTimeout(r, 1200));      // 無料枠に優しく
}

if (!Object.keys(out).length) {
  console.error('\n1つも取れませんでした。書き換えません。');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const src = fs.readFileSync(FILE, 'utf8');

/* 既にある系列を残しつつ、取れたものだけ差し替える */
const win = { PB: {} };
new Function('window', src)(win);
const merged = Object.assign({}, (win.PB.MACRO && win.PB.MACRO.series) || {}, out);

const unitOf = id => (inds.find(i => i.id === id) || {}).unit || '';
const body = Object.keys(merged).map(id =>
  `    ${id}: {\n${render(merged[id], unitOf(id))}\n    }`).join(',\n');

const block = `window.PB.MACRO = {
  fetched: '${today}',
  source: 'Alpha Vantage',
  series: {
${body}
  }
};
`;

const next = src.replace(/window\.PB\.MACRO = \{[\s\S]*?\n\};\n/, block);
if (next === src) {
  console.error('\n❌ 差し替え先が見つかりません。data/macro.js の書き方が変わった可能性があります');
  process.exit(1);
}

if (PRINT) { console.log('\n' + block); process.exit(0); }

fs.writeFileSync(FILE, next);
console.log(`\n✅ data/macro.js を書き換えました（${Object.keys(merged).length} 指標 / ${today} 取得）`);
