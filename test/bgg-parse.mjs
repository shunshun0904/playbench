/* BGG の XML を読み取る部分だけの検査。通信はしない。
     node test/bgg-parse.mjs

   取得そのものは手元の回線でしか通らないので、せめて「通ったあと正しく
   読めるか」はここで固めておく。数字を1つ取り違えると、それらしい別の値が
   黙って画面に出てしまう。 */
'use strict';

import {
  attr, num, primaryName, parseThing,
  splitItems, decode, boardGameRank, playerPoll, links, parsePick, sameTitle
} from '../tools/fetch-bgg.mjs';

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

/* ══════════════════ recommend.html 用に広げて読むぶん ══════════════════
   人数・時間・対象年齢・ランク・人数投票・分類。
   ここを取り違えると、初心者に重いゲームを勧めるような形で黙って出る。 */

/* 2件まとめて返ってきた形。実物どおり <poll> と <link> も入れてある */
const MULTI = `<?xml version="1.0" encoding="utf-8"?>
<items termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
  <item type="boardgame" id="163412">
    <name type="alternate" sortindex="1" value="パッチワーク"/>
    <name type="primary" sortindex="1" value="Patchwork"/>
    <yearpublished value="2014"/>
    <minplayers value="2"/>
    <maxplayers value="2"/>
    <poll name="suggested_numplayers" title="User Suggested Number of Players" totalvotes="612">
      <results numplayers="1">
        <result value="Best" numvotes="1"/>
        <result value="Recommended" numvotes="6"/>
        <result value="Not Recommended" numvotes="380"/>
      </results>
      <results numplayers="2">
        <result value="Best" numvotes="588"/>
        <result value="Recommended" numvotes="18"/>
        <result value="Not Recommended" numvotes="2"/>
      </results>
    </poll>
    <playingtime value="30"/>
    <minplaytime value="15"/>
    <maxplaytime value="30"/>
    <minage value="8"/>
    <link type="boardgamecategory" id="1009" value="Abstract Strategy"/>
    <link type="boardgamecategory" id="1010" value="Puzzle"/>
    <link type="boardgamemechanic" id="2002" value="Tile Placement"/>
    <link type="boardgamedesigner" id="1" value="Uwe Rosenberg"/>
    <statistics page="1"><ratings>
      <usersrated value="102000"/>
      <average value="7.61"/>
      <bayesaverage value="7.42"/>
      <ranks>
        <rank type="subtype" id="1" name="boardgame" friendlyname="Board Game Rank" value="76" bayesaverage="7.42"/>
        <rank type="family" id="5497" name="strategygames" friendlyname="Strategy Rank" value="120" bayesaverage="7.40"/>
      </ranks>
      <averageweight value="1.62"/>
    </ratings></statistics>
  </item>
  <item type="boardgame" id="999999">
    <name type="primary" sortindex="1" value="Sea Salt &amp; Paper"/>
    <yearpublished value="2022"/>
    <minplayers value="2"/>
    <maxplayers value="4"/>
    <playingtime value="30"/>
    <minplaytime value="30"/>
    <maxplaytime value="45"/>
    <minage value="8"/>
    <statistics page="1"><ratings>
      <usersrated value="9000"/>
      <average value="7.4"/>
      <bayesaverage value="7.0"/>
      <ranks>
        <rank type="subtype" id="1" name="boardgame" friendlyname="Board Game Rank" value="Not Ranked"/>
      </ranks>
      <averageweight value="1.4"/>
    </ratings></statistics>
  </item>
</items>`;

console.log('── まとめて引いたものを item ごとに切る');
const items = splitItems(MULTI);
eq(items.length, 2, '2件に切れる（<items> は切り目にしない）');

const p = parsePick(items[0]);
console.log('── 広げて読むぶん');
eq(p.id, 163412, 'id は item 自身の属性から取る');
eq(p.name, 'Patchwork', '正式名');
eq(p.minPlayers, 2, '最少人数');
eq(p.maxPlayers, 2, '最大人数');
eq(p.minTime, 15, '最短時間');
eq(p.maxTime, 30, '最長時間');
eq(p.minAge, 8, '対象年齢');
eq(p.weight, 1.62, '重さ');
eq(p.rating, 7.61, '評価');
eq(p.ratings, 102000, '評価人数');

/* ここが肝。<rank> は複数あり、家族別ランクが先に来ることもある。
   name="boardgame" を見ずに拾うと、別の順位が総合順位の顔で出る。 */
eq(p.rank, 76, '総合ランク（家族別ランクと取り違えない）');
eq(boardGameRank(items[1]), null, '"Not Ranked" は null（0 にも文字列にもしない）');

/* 人数投票は生の票数のまま残す。割合に丸めると母数が読めなくなる */
console.log('── 人数投票');
eq(JSON.stringify(p.poll['2']), '[588,18,2]', '2人の [ベスト,推奨,非推奨]');
eq(JSON.stringify(p.poll['1']), '[1,6,380]', '1人の票（0票の行は落とさない）');
eq(playerPoll(items[1]), null, '投票が無ければ null');

console.log('── 分類とメカニクス');
eq(JSON.stringify(p.categories), '["Abstract Strategy","Puzzle"]', 'カテゴリだけを拾う');
eq(JSON.stringify(p.mechanics), '["Tile Placement"]', 'デザイナーの link を混ぜない');

/* 実体参照。題が "&amp;" のまま残ると、名前の突き合わせで外れて
   毎回 search をやり直すことになる */
console.log('── 実体参照');
eq(decode('Sea Salt &amp; Paper'), 'Sea Salt & Paper', '&amp; を戻す');
eq(decode('&amp;lt;b&amp;gt;'), '&lt;b&gt;', '二重エスケープを1段だけ戻す');
eq(parsePick(items[1]).name, 'Sea Salt & Paper', '取り出した題も戻っている');

console.log('── 題の突き合わせ');
eq(sameTitle('Sea Salt & Paper', 'Sea Salt &amp; Paper'), true, '実体参照ごしでも一致');
eq(sameTitle('Sushi Go!', 'Sushi Go!'), true, '記号の違いは無視');
eq(sameTitle('CATAN', 'Catan'), true, '大文字小文字は無視');
eq(sameTitle('Pandemic', 'Wingspan'), false, '別物は弾く');
/* 一覧には Pandemic と Pandemic Legacy の両方が載っている。
   前方一致を許すと、id を書き間違えたとき黙って続編を掴む */
eq(sameTitle('Pandemic', 'Pandemic Legacy: Season 1'), false, '続編を本編として通さない');
eq(sameTitle('Azul', 'Azul: Summer Pavilion'), false, '拡張・続編は別物として弾く');
eq(sameTitle('', 'Azul'), false, '題が空なら一致にしない');

console.log(bad ? `\n❌ ${bad} 件` : '\n✅ すべて通過');
process.exit(bad ? 1 : 0);
