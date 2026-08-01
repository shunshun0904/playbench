/* BGG の XML を読み取る部分だけの検査。通信はしない。
     node test/bgg-parse.mjs

   取得そのものは手元の回線でしか通らないので、せめて「通ったあと正しく
   読めるか」はここで固めておく。数字を1つ取り違えると、それらしい別の値が
   黙って画面に出てしまう。 */
'use strict';

import { attr, num, primaryName, parseThing } from '../tools/fetch-bgg.mjs';

let bad = 0;
const eq = (got, want, what) => {
  const ok = got === want;
  console.log(`   ${ok ? '✅' : '❌'} ${what}: ${JSON.stringify(got)}${ok ? '' : ` （期待 ${JSON.stringify(want)}）`}`);
  if (!ok) bad++;
};

/* BGG の thing?stats=1 が返す形。属性の並びも実物に合わせてある */
const THING = `<?xml version="1.0" encoding="utf-8"?>
<items termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
  <item type="boardgame" id="5">
    <thumbnail>https://example.invalid/t.jpg</thumbnail>
    <name type="alternate" sortindex="1" value="Akvizice"/>
    <name type="primary" sortindex="1" value="Acquire"/>
    <name type="alternate" sortindex="1" value="アクワイア"/>
    <description>Acquire is a game...</description>
    <yearpublished value="1964"/>
    <minplayers value="2"/>
    <maxplayers value="6"/>
    <playingtime value="90"/>
    <statistics page="1">
      <ratings>
        <usersrated value="27886"/>
        <average value="7.32218"/>
        <bayesaverage value="7.14618"/>
        <ranks>
          <rank type="subtype" id="1" name="boardgame" friendlyname="Board Game Rank" value="264" bayesaverage="7.14618"/>
        </ranks>
        <stddev value="1.35479"/>
        <median value="0"/>
        <owned value="30122"/>
        <averageweight value="2.4994"/>
      </ratings>
    </statistics>
  </item>
</items>`;

console.log('── 実物どおりの並び');
const t = parseThing(THING, 5);
eq(t.name, 'Acquire', '正式名（alternate が先にあっても primary を取る）');
eq(t.year, 1964, '発行年');
eq(t.rating, 7.32218, '評価（average）');
eq(t.weight, 2.4994, '重さ（averageweight）');
eq(t.bayes, 7.14618, 'ベイズ平均');
eq(t.ratings, 27886, '評価人数');

/* ここが本題。averageweight を average より前に置いても取り違えないこと。
   タグ名の直後に境界を要求していないと、<average> の検索が
   <averageweight> に当たって、評価点のつもりで複雑さを拾ってしまう。 */
console.log('── averageweight を先に置いた場合（並び順に依存しないこと）');
const SWAPPED = THING
  .replace('        <average value="7.32218"/>\n', '')
  .replace('        <averageweight value="2.4994"/>',
           '        <averageweight value="2.4994"/>\n        <average value="7.32218"/>');
const s = parseThing(SWAPPED, 5);
eq(s.rating, 7.32218, '評価（並び替えても average を取る）');
eq(s.weight, 2.4994, '重さ');

console.log('── 属性の並びが逆の name');
eq(primaryName('<name sortindex="1" value="Imperial" type="primary"/>'), 'Imperial',
   'value が type より先でも取れる');

console.log('── 値が無いとき');
eq(num('<items><item id="1"/></items>', 'averageweight'), null, '無ければ null（0 にしない）');
eq(attr('<yearpublished value=""/>', 'yearpublished'), '', '空文字はそのまま');
eq(num('<yearpublished value=""/>', 'yearpublished'), null, '空文字は数値としては null');

/* 評価が1件も無い新作は average が 0 で返る。0 と「未取得」を混同しないこと */
console.log('── 評価ゼロ件');
eq(num('<ratings><usersrated value="0"/><average value="0"/></ratings>', 'average'), 0,
   '0 は 0 のまま（null にしない）');

console.log(bad ? `\n❌ ${bad} 件` : '\n✅ すべて通過');
process.exit(bad ? 1 : 0);
