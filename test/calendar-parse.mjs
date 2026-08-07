/* ==========================================================================
   ICS の読み取りを、作り物のカレンダーで確かめる。通信はしない。

     node test/calendar-parse.mjs

   見るのは3つ。
     ・日付が日本時間の日に寄るか（UTC のままだと前日にずれる）
     ・match に当たる予定だけを拾うか（私用の予定を混ぜない）
     ・折り返し・取り消し済み・全角括弧を取り違えないか
   ========================================================================== */
import assert from 'node:assert';
import { parseIcs, pickFor, noteOf, toDay, readIndicators, render, sniff } from '../tools/fetch-calendar.mjs';

let bad = 0;
const ok = (name, fn) => {
  try { fn(); console.log('  ✅ ' + name); }
  catch (e) { console.log('  ❌ ' + name + ' ── ' + e.message); bad++; }
};

console.log('── 日付');
ok('終日はそのまま', () => assert.equal(toDay('20260817'), '2026-08-17'));
ok('JST 表記はそのまま', () => assert.equal(toDay('20260817T213000'), '2026-08-17'));
/* 米国CPI は日本時間 21:30 ＝ UTC 12:30。UTC の日付をそのまま使うと合うが、
   ミシガン大の 23:00 JST は UTC では前日 14:00 なので、寄せないとずれる。 */
ok('UTC は +9 して日本の日に寄せる', () => {
  assert.equal(toDay('20260814T140000Z'), '2026-08-14');   // = 8/14 23:00 JST
  assert.equal(toDay('20260813T150000Z'), '2026-08-14');   // = 8/14 00:00 JST
});

console.log('── 件名から「何の分か」');
ok('全角括弧', () => assert.equal(noteOf('米国CPI 発表（2026年7月分）'), '2026年7月分'));
ok('半角括弧', () => assert.equal(noteOf('US CPI (July 2026)'), 'July 2026'));
ok('速報値は間を空ける', () =>
  assert.equal(noteOf('ミシガン大学消費者信頼感指数 発表（2026年8月速報値）'), '2026年8月 速報値'));
ok('括弧が無ければ空', () => assert.equal(noteOf('米ベージュブック公表'), ''));

const ICS = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT',
  'DTSTART;TZID=Asia/Tokyo:20260812T213000',
  'SUMMARY:米国CPI 発表（2026年7月分）',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART;TZID=Asia/Tokyo:20260916T213000',
  'SUMMARY:米国CPI 発表（2026年8',
  ' 月分）',                                  /* 折り返し */
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART;TZID=Asia/Tokyo:20261014T213000',
  'SUMMARY:米国CPI 発表（2026年9月分）',
  'STATUS:CANCELLED',                        /* 取り消し済み */
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART;VALUE=DATE:20260819',
  'SUMMARY:ヒゲ脱毛 12週間',                  /* 私用。拾ってはいけない */
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART;TZID=Asia/Tokyo:20260902T085000',
  'SUMMARY:日本・マネタリーベース公表（2026年8月分）',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART;TZID=Asia/Tokyo:20260904T063000',
  'SUMMARY:米国・マネタリーベース公表（2026年8月分）',
  'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n');

console.log('── ICS の読み取り');
const ev = parseIcs(ICS);
ok('取り消し済みは飛ばす', () => assert.equal(ev.length, 5));
ok('折り返しをほどく', () =>
  assert.ok(ev.some(e => e.summary === '米国CPI 発表（2026年8月分）'), '折り返した件名が復元されていない'));

console.log('── 振り分け');
const cpi = pickFor(ev, ['米国CPI']);
ok('米国CPI は2件（取り消し済みを除く）', () => assert.equal(cpi.length, 2));
ok('昇順に並ぶ', () => assert.deepEqual(cpi.map(r => r.on), ['2026-08-12', '2026-09-16']));
ok('「何の分か」が付く', () => assert.equal(cpi[0].note, '2026年7月分'));

/* ここがいちばん大事 ── 日本と米国のマネタリーベースを取り違えない。
   どちらの件名にも「マネタリーベース」が入っているので、
   1語だけの照合だと両方に当たってしまう。 */
ok('日本と米国のマネタリーベースを混ぜない', () => {
  const jp = pickFor(ev, ['日本', 'マネタリーベース']);
  const us = pickFor(ev, ['米国', 'マネタリーベース']);
  assert.deepEqual(jp.map(r => r.on), ['2026-09-02']);
  assert.deepEqual(us.map(r => r.on), ['2026-09-04']);
});

ok('私用の予定は拾わない', () => {
  for (const words of [['米国CPI'], ['日本', 'マネタリーベース'], ['米国', 'マネタリーベース']]) {
    assert.ok(!pickFor(ev, words).some(r => r.on === '2026-08-19'), 'ヒゲ脱毛を拾っている');
  }
});

console.log('── data/macro.js からの読み取り');
const inds = readIndicators(`
  { id: 'fedfunds',
    release: { match: ['FOMC', '政策金利'] },
    title: 'x' },
  { id: 'dgs10',
    release: { daily: true, note: '毎営業日（H.15）' },
    title: 'y' },
`);
ok('match と daily を見分ける', () => {
  assert.deepEqual(inds.map(i => i.id), ['fedfunds', 'dgs10']);
  assert.deepEqual(inds[0].match, ['FOMC', '政策金利']);
  assert.equal(inds[1].daily, true);
  assert.equal(inds[1].match, undefined);
});

console.log('── 書き出し');
const js = render({ cpi }, '2026-08-06');
ok('そのまま読める JavaScript になる', () => {
  assert.ok(/window\.PB\.RELEASES = \{/.test(js));
  assert.ok(js.includes("{ on: '2026-08-12', note: '2026年7月分' }"));
  assert.ok(js.includes("asOf: '2026-08-06'"));
  new Function('window', js)({ PB: {} });   // 構文が通ること
});

console.log('── 返ってきたものの見分け');
/* 200 が返っても iCal とはかぎらない。実際、埋め込み用のページは
   HTML を 200 で返してくる。そこで止まれることを見ておく。 */
const ICAL_URL = 'https://calendar.google.com/calendar/ical/x%40group.calendar.google.com/private-abc/basic.ics';
ok('本物の iCal は通す', () => assert.equal(sniff(ICAL_URL, 'text/calendar', ICS), null));
ok('埋め込みページは止める', () => {
  const r = sniff('https://calendar.google.com/calendar/embed?src=x', 'text/html', '<!DOCTYPE html><html>…');
  assert.ok(r, '素通りしている');
  assert.equal(r.kind, 'HTML');
  assert.ok(r.why.some(w => w.includes('embed')), 'embed だと言っていない');
});
ok('.ics でない URL は止める', () => {
  const r = sniff('https://calendar.google.com/calendar/u/0?cid=xxx', 'text/html', '<html>');
  assert.ok(r && r.why.some(w => w.includes('.ics')), '.ics の話が出ていない');
});
ok('.ics なのに HTML なら、そう言う', () => {
  const r = sniff(ICAL_URL, 'text/html', '<!doctype html><title>Error</title>');
  assert.ok(r && r.why.some(w => w.includes('HTML')), 'HTML だと言っていない');
});
ok('長い文字列は伏せる（鍵を出さない）', () => {
  const r = sniff('https://x/y.ics', 'text/html', '<html>' + 'a'.repeat(80));
  assert.ok(!/a{40}/.test(r.head), '長い連なりがそのまま出ている');
});

console.log(bad ? `\n❌ ${bad} 件` : '\n✅ すべて通過');
process.exit(bad ? 1 : 0);
