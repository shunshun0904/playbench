/* tools/fetch-bgg.mjs を通信なしで動かすための差し替え。
   test/bgg-fetch.mjs が --import でこれを先に読ませる。

   道具の側にはテスト用の分岐を1つも置かない。ここで
   fetch と setTimeout を差し替えるだけで、道具はそのまま走る。 */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/* 待ち時間は詰める。BGG への 1.5 秒は本物の通信のための約束であって、
   作り物の応答を相手に守っても意味がない（検査が2分かかるだけ）。 */
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms, ...rest) => realSetTimeout(fn, ms > 5 ? 1 : ms, ...rest);

/* 一覧を読み込んで、id → 題名の対応を作る */
const picks = (() => {
  const sandbox = { PB: {} };
  new Function('window', fs.readFileSync(path.join(ROOT, 'data', 'picks.js'), 'utf8'))(sandbox);
  return sandbox.PB.PICKS;
})();

const works = (() => {
  const sandbox = { PB: {} };
  new Function('window', fs.readFileSync(path.join(ROOT, 'data', 'works.js'), 'utf8'))(sandbox);
  return sandbox.PB.WORKS;
})();

const nameById = new Map();
picks.forEach(p => { if (p.bggId) nameById.set(String(p.bggId), p.name); });
works.forEach((w, i) => { if (w.bggName) nameById.set(String(700000 + i), w.bggName); });

/* わざと1件、id が別のゲームを指している状態を作る。
   道具が名前で気づいて引き直せるかを見るため。 */
nameById.set('178900', 'A Completely Different Game');

/* 題名 → 検索で返す id。検索されたぶんだけ増やす */
const searched = new Map();
let nextId = 900000;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function itemXml(id, name) {
  return `<item type="boardgame" id="${id}">
    <name type="alternate" sortindex="1" value="alt"/>
    <name type="primary" sortindex="1" value="${esc(name)}"/>
    <yearpublished value="2017"/>
    <minplayers value="2"/><maxplayers value="4"/>
    <poll name="suggested_numplayers" title="User Suggested Number of Players" totalvotes="100">
      <results numplayers="2">
        <result value="Best" numvotes="60"/>
        <result value="Recommended" numvotes="30"/>
        <result value="Not Recommended" numvotes="10"/>
      </results>
      <results numplayers="3">
        <result value="Best" numvotes="20"/>
        <result value="Recommended" numvotes="60"/>
        <result value="Not Recommended" numvotes="20"/>
      </results>
    </poll>
    <playingtime value="45"/><minplaytime value="30"/><maxplaytime value="45"/>
    <minage value="10"/>
    <link type="boardgamecategory" id="1" value="Abstract Strategy"/>
    <link type="boardgamemechanic" id="2" value="Tile Placement"/>
    <link type="boardgamedesigner" id="3" value="Someone"/>
    <statistics page="1"><ratings>
      <usersrated value="12345"/><average value="7.5"/><bayesaverage value="7.2"/>
      <ranks><rank type="subtype" id="1" name="boardgame" friendlyname="Board Game Rank" value="120" bayesaverage="7.2"/></ranks>
      <averageweight value="2.1"/>
    </ratings></statistics>
  </item>`;
}

const seen = [];

globalThis.fetch = async (url) => {
  const u = String(url);
  seen.push(u);

  const body = (() => {
    if (u.includes('/search?')) {
      const q = decodeURIComponent((u.match(/query=([^&]*)/) || [])[1] || '');
      if (!searched.has(q)) {
        const id = String(nextId++);
        searched.set(q, id);
        nameById.set(id, q);          // 引き直したぶんは正しい題を返す
      }
      return `<?xml version="1.0"?><items total="1"><item type="boardgame" id="${searched.get(q)}"><name type="primary" value="${esc(q)}"/></item></items>`;
    }
    if (u.includes('/thing?')) {
      const ids = ((u.match(/id=([^&]*)/) || [])[1] || '').split(',').filter(Boolean);
      const items = ids.filter(id => nameById.has(id)).map(id => itemXml(id, nameById.get(id)));
      return `<?xml version="1.0"?><items>${items.join('')}</items>`;
    }
    return '<?xml version="1.0"?><items></items>';
  })();

  return {
    ok: true, status: 200, statusText: 'OK',
    text: async () => body
  };
};

/* 道具が終わったところで、呼ばれた URL を吐く。検査はこれを読む */
process.on('exit', () => {
  seen.forEach(u => console.log('STUB ' + u));
});
