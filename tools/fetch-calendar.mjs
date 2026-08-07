/* ==========================================================================
   公表予定を Google カレンダーから取ってきて data/releases.js を書き換える。

     CALENDAR_ICS='https://calendar.google.com/calendar/ical/.../basic.ics' \
       node tools/fetch-calendar.mjs

   URL は Google カレンダーの設定 →「カレンダーの統合」→
   「非公開URL（iCal形式）」。カレンダーを公開する必要はない。
   この URL 自体が鍵なので、リポジトリには置かず GitHub の Secrets に入れる。

   ─────────────────────────────────────────────────────────────
   拾うのは data/macro.js の release.match に当たる予定だけ。
   カレンダーには私用の予定も入っているので、当たらないものは
   読み捨てて、ファイルにも記録にも残さない。
   ─────────────────────────────────────────────────────────────
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ ICS */

/* 折り返しをほどく。ICS は 75 バイトで折り返し、続きの行は空白で始まる */
export function unfold(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

/* 日付を YYYY-MM-DD にする。時刻付きは日本時間の日付に寄せる ──
   公表は日本時間で見ているので、UTC のままだと前日にずれる。 */
export function toDay(value, tzid) {
  const v = value.trim();

  /* 終日 ── 20260817 */
  let m = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  /* 時刻つき ── 20260817T213000 / ...Z */
  m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(v);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;

  /* Z なら UTC。TZID があってもここでは素直に +9 へ寄せる
     （このカレンダーは Asia/Tokyo で書かれている） */
  if (z === 'Z') {
    const t = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s) + 9 * 3600 * 1000;
    const j = new Date(t);
    return `${j.getUTCFullYear()}-${String(j.getUTCMonth() + 1).padStart(2, '0')}-`
         + `${String(j.getUTCDate()).padStart(2, '0')}`;
  }
  return `${y}-${mo}-${d}`;
}

/* VEVENT を { on, summary } の並びにする */
export function parseIcs(text) {
  const out = [];
  const blocks = unfold(text).split('BEGIN:VEVENT').slice(1);
  for (const b of blocks) {
    const body = b.split('END:VEVENT')[0];
    if (/^STATUS:CANCELLED$/m.test(body)) continue;

    const start = /^DTSTART(?:;[^:\n]*)?:(.+)$/m.exec(body);
    const sum = /^SUMMARY:(.*)$/m.exec(body);
    if (!start || !sum) continue;

    const tz = /TZID=([^;:]+)/.exec(start[0]);
    const on = toDay(start[1], tz && tz[1]);
    if (!on) continue;

    out.push({
      on,
      summary: sum[1].replace(/\\,/g, ',').replace(/\\n/g, ' ').replace(/\\\\/g, '\\').trim()
    });
  }
  return out;
}

/* ------------------------------------------------------- 指標に振り分ける */

/* match の語をすべて含む件名だけを拾う */
export function pickFor(events, match) {
  return events
    .filter(e => match.every(w => e.summary.includes(w)))
    .map(e => ({ on: e.on, note: noteOf(e.summary) }))
    .sort((a, b) => (a.on < b.on ? -1 : a.on > b.on ? 1 : 0));
}

/* 件名の丸括弧の中を「何の分か」として使う。
   「米国CPI 発表（2026年7月分）」→「2026年7月分」 */
export function noteOf(summary) {
  const m = /[（(]([^）)]*)[）)]\s*$/.exec(summary);
  if (!m) return '';
  return m[1].replace(/(\d+年\d+月)(速報値|確報値)/, '$1 $2').trim();
}

/* data/macro.js から id と release.match を読む。
   ブラウザ用のファイルなので、実行せずに拾う。 */
export function readIndicators(src) {
  const out = [];
  const re = /id:\s*'([a-z0-9]+)',\s*\n\s*release:\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(src))) {
    const [, id, rel] = m;
    if (/daily:\s*true/.test(rel)) { out.push({ id, daily: true }); continue; }
    const mm = /match:\s*\[([^\]]*)\]/.exec(rel);
    if (!mm) continue;
    const words = [...mm[1].matchAll(/'([^']*)'/g)].map(x => x[1]);
    if (words.length) out.push({ id, match: words });
  }
  return out;
}

/* ------------------------------------------------------------- 書き出し */

export function render(byId, asOf) {
  const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const ids = Object.keys(byId);
  const body = ids.map((id, i) => {
    const rows = byId[id].map(r => `      { on: ${q(r.on)}, note: ${q(r.note)} }`).join(',\n');
    return `    ${id}: [\n${rows}\n    ]${i === ids.length - 1 ? '' : ','}`;
  }).join('\n');

  return `/* ==========================================================================
   公表予定。道具が書き換えるファイルです。手で触らないでください。

     CALENDAR_ICS=<秘密のiCal URL> node tools/fetch-calendar.mjs

   出どころは本人の Google カレンダー。毎日 GitHub Actions が読み直して、
   変化があればこのファイルを差し替えます（.github/workflows/calendar.yml）。

   ─────────────────────────────────────────────────────────────
   1件ずつではなく、分かっている先の予定を全部持ちます。
   1件だけだと、その日を過ぎた瞬間に「次」が無くなって打ち止めになる。
   画面は今日以降で最初の1件を「次」として使い、残りは控えとして待ちます。

   dates は昇順。それぞれ on（YYYY-MM-DD・日本時間）と note（何の分か）。
   ─────────────────────────────────────────────────────────────
   ========================================================================== */
'use strict';

window.PB = window.PB || {};

window.PB.RELEASES = {
  /* いつ読み直したか。画面の脚注に出ます */
  asOf: ${q(asOf)},
  /* どこから読んだか */
  from: 'Google カレンダー', fromEn: 'Google Calendar',
  byId: {
${body}
  }
};
`;
}

/* ------------------------------------------------------------------ 実行 */

/* 返ってきたものが iCal かどうかを見る。
   違うときに何が返ってきたのかを言えないと、直しようがない。
   URL も鍵も本文も出さない ── 出すのは形と、直し方だけ。 */
export function sniff(url, contentType, body) {
  if (/^BEGIN:VCALENDAR/m.test(body)) return null;

  const looksHtml = /^\s*<(!doctype|html)/i.test(body);
  const why = [];

  if (/\/calendar\/embed\?/.test(url)) {
    why.push('URL が calendar/embed です。これは人が見るためのページで、iCal ではありません。');
    why.push('「カレンダーの統合」の中の【非公開URL（iCal形式）】── 末尾が /basic.ics のものを使ってください。');
  } else if (!/\.ics(\?|$)/.test(url)) {
    why.push('URL の末尾が .ics ではありません。');
    why.push('正しい形: https://calendar.google.com/calendar/ical/<カレンダーID>/private-<英数字>/basic.ics');
  } else if (looksHtml) {
    why.push('末尾は .ics ですが、返ってきたのは HTML です。');
    why.push('非公開URLを作り直した直後（前のURLは無効になります）か、URL の途中が欠けている可能性があります。');
  } else {
    why.push('iCal でも HTML でもないものが返っています。');
  }

  return {
    kind: looksHtml ? 'HTML' : 'そのほか',
    contentType: contentType || '(なし)',
    bytes: body.length,
    head: body.slice(0, 60).replace(/\s+/g, ' ').replace(/[\w-]{40,}/g, '…'),
    why
  };
}

async function main() {
  const url = (process.env.CALENDAR_ICS || '').trim().replace(/^['"]|['"]$/g, '');
  if (!url) {
    console.error('CALENDAR_ICS が空です。Google カレンダーの「非公開URL（iCal形式）」を入れてください。');
    process.exit(1);
  }

  const inds = readIndicators(fs.readFileSync(path.join(ROOT, 'data/macro.js'), 'utf8'));
  const wanted = inds.filter(i => i.match);
  console.log(`指標 ${inds.length} 件（うち日付を持つのは ${wanted.length} 件）`);

  const res = await fetch(url, { headers: { 'user-agent': 'playbench/1.0' } });
  if (!res.ok) {
    console.error(`取得できません: HTTP ${res.status}`);
    if (res.status === 404) {
      console.error('URL が違うか、非公開URLを作り直して前のものが無効になっています。');
    }
    process.exit(1);
  }

  const body = await res.text();

  /* 200 でも iCal とはかぎらない。埋め込み用のページなどは
     HTML を 200 で返してくるので、そこで気づけるようにする。 */
  const bad = sniff(url, res.headers.get('content-type'), body);
  if (bad) {
    console.error(`\niCal が返ってきていません（${bad.kind} / ${bad.contentType} / ${bad.bytes} バイト）`);
    console.error(`先頭: ${bad.head}`);
    bad.why.forEach(w => console.error('  ・' + w));
    console.error('\n取り方: Google カレンダー → ⚙設定 → 左でカレンダー名 → 「カレンダーの統合」');
    console.error('        → 【非公開URL（iCal形式）】（公開URLでも、カレンダーIDでもありません）');
    process.exit(1);
  }

  const events = parseIcs(body);
  console.log(`予定 ${events.length} 件を読み込み`);
  if (!events.length) {
    console.error('iCal は取れていますが、予定が1件も入っていません。');
    console.error('別のカレンダーの URL を貼っていないか確かめてください。');
    process.exit(1);
  }

  /* 今日以降だけ残す。過ぎたものは持っていても使わないし、
     ファイルが際限なく伸びる。 */
  const now = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

  const byId = {};
  let dry = [];
  for (const ind of wanted) {
    const rows = pickFor(events, ind.match).filter(r => r.on >= now);
    byId[ind.id] = rows;
    if (!rows.length) dry.push(ind.id);
    console.log(`  ${ind.id.padEnd(10)} ${String(rows.length).padStart(2)} 件` +
                (rows.length ? `  次 ${rows[0].on}` : '  ← 先の予定なし'));
  }

  if (dry.length) {
    console.log(`\n先の予定が無い指標: ${dry.join(', ')}`);
    console.log('カレンダー側に足してください。画面では「予定なし」と出ます。');
  }

  /* 全部空なら書き換えない。取得に失敗しているのに、
     手元の予定を消してしまうのがいちばん困る。 */
  if (Object.values(byId).every(v => !v.length)) {
    console.error('\n1件も拾えませんでした。URL か match の語を確かめてください。書き換えは行いません。');
    process.exit(1);
  }

  const out = path.join(ROOT, 'data/releases.js');
  fs.writeFileSync(out, render(byId, now));
  console.log(`\ndata/releases.js を書き出しました（${now} 時点）`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
