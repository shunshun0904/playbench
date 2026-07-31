/* ==========================================================================
   PLAYBENCH ─ アカウント

   いまは「この端末の中だけ」のアカウント（local プロバイダ）。
   サーバーへは何も送らない。ブラウザの localStorage に入るだけ。

   ここは差し替え口として作ってある。実際のサーバー（Supabase など）を
   使うことになったら、下の LocalProvider と同じ形の実装を足して
   PB.auth.use(provider) を呼べば、画面側は一切変えずに切り替わる。

   断り書き ── local プロバイダは「同じ端末を使う人どうしの取り違えを防ぐ」
   ためのもので、暗号的な保護ではない。端末を触れる人は localStorage を
   読める。だから画面にもそう書いてある。
   ========================================================================== */
'use strict';

window.PB = window.PB || {};

(function () {

  var KEY_USERS = 'pb.users.v1';
  var KEY_SESS = 'pb.session.v1';

  /* ------------------------------------------------------------ 補助 */
  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }
  function err(code, msg) {
    var e = new Error(msg);
    e.code = code;
    return e;
  }
  function normHandle(h) {
    return String(h || '').trim().replace(/^@/, '').toLowerCase();
  }
  function bytesToHex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf),
      function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function randomHex(n) {
    var a = new Uint8Array(n);
    (crypto.getRandomValues ? crypto : window.msCrypto).getRandomValues(a);
    return bytesToHex(a.buffer);
  }

  /* パスワードは PBKDF2 で伸ばしてから保存する。
     生の文字列を置かないというだけの意味で、端末を握られたら守れない。 */
  function derive(pass, saltHex) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits'])
      .then(function (key) {
        return crypto.subtle.deriveBits({
          name: 'PBKDF2',
          salt: enc.encode(saltHex),
          iterations: 120000,
          hash: 'SHA-256'
        }, key, 256);
      })
      .then(bytesToHex);
  }

  /* --------------------------------------------------------- 検証 */
  var RULES = {
    handle: /^[a-z0-9_]{3,20}$/,
    displayMax: 24,
    passMin: 8
  };

  function checkHandle(h) {
    if (!h) throw err('handle-required', 'ハンドル名を入れてください');
    if (!RULES.handle.test(h)) {
      throw err('handle-shape', 'ハンドル名は半角の英小文字・数字・_ で 3〜20 文字にしてください');
    }
  }
  function checkPass(p) {
    if (!p) throw err('pass-required', 'パスワードを入れてください');
    if (p.length < RULES.passMin) {
      throw err('pass-short', 'パスワードは ' + RULES.passMin + ' 文字以上にしてください');
    }
  }

  /* ============================================== この端末だけのアカウント */
  function LocalProvider() {
    this.kind = 'local';
    this.label = 'この端末';
  }

  LocalProvider.prototype._users = function () { return load(KEY_USERS, {}); };

  LocalProvider.prototype.user = function () {
    var id = load(KEY_SESS, null);
    if (!id) return null;
    var u = this._users()[id];
    if (!u) return null;
    return this._public(u);
  };

  LocalProvider.prototype._public = function (u) {
    return {
      id: u.id,
      handle: u.handle,
      display: u.display,
      joined: u.joined,
      stats: u.stats || { played: 0, won: 0, byGame: {} },
      agents: u.agents || []
    };
  };

  LocalProvider.prototype.signUp = function (o) {
    var self = this;
    return Promise.resolve().then(function () {
      var handle = normHandle(o.handle);
      checkHandle(handle);
      checkPass(o.pass);

      var users = self._users();
      for (var k in users) {
        if (users[k].handle === handle) {
          throw err('handle-taken', 'その名前はこの端末ですでに使われています');
        }
      }
      var salt = randomHex(16);
      return derive(o.pass, salt).then(function (hash) {
        var u = {
          id: 'u_' + randomHex(8),
          handle: handle,
          display: String(o.display || o.handle).trim().slice(0, RULES.displayMax) || handle,
          salt: salt,
          hash: hash,
          joined: new Date().toISOString(),
          stats: { played: 0, won: 0, byGame: {} },
          agents: []
        };
        users[u.id] = u;
        if (!save(KEY_USERS, users)) {
          throw err('storage', 'この端末に保存できませんでした（プライベートモードかもしれません）');
        }
        save(KEY_SESS, u.id);
        return self._public(u);
      });
    });
  };

  LocalProvider.prototype.signIn = function (o) {
    var self = this;
    return Promise.resolve().then(function () {
      var handle = normHandle(o.handle);
      if (!handle) throw err('handle-required', 'ハンドル名を入れてください');
      if (!o.pass) throw err('pass-required', 'パスワードを入れてください');

      var users = self._users(), found = null;
      for (var k in users) if (users[k].handle === handle) found = users[k];
      if (!found) throw err('no-user', 'その名前のアカウントがこの端末に見つかりません');

      return derive(o.pass, found.salt).then(function (hash) {
        if (hash !== found.hash) throw err('bad-pass', 'パスワードが違います');
        save(KEY_SESS, found.id);
        return self._public(found);
      });
    });
  };

  LocalProvider.prototype.signOut = function () {
    try { localStorage.removeItem(KEY_SESS); } catch (e) {}
    return Promise.resolve(null);
  };

  LocalProvider.prototype.update = function (patch) {
    var self = this;
    return Promise.resolve().then(function () {
      var id = load(KEY_SESS, null);
      if (!id) throw err('no-session', 'ログインしていません');
      var users = self._users(), u = users[id];
      if (!u) throw err('no-session', 'ログインしていません');

      if (patch.display != null) {
        var d = String(patch.display).trim();
        if (!d) throw err('display-required', '表示名を入れてください');
        u.display = d.slice(0, RULES.displayMax);
      }
      if (patch.stats) u.stats = patch.stats;
      users[id] = u;
      save(KEY_USERS, users);
      return self._public(u);
    });
  };

  LocalProvider.prototype.remove = function () {
    var self = this;
    return Promise.resolve().then(function () {
      var id = load(KEY_SESS, null);
      if (!id) return null;
      var users = self._users();
      delete users[id];
      save(KEY_USERS, users);
      return self.signOut();
    });
  };

  /* 持ち出せること。閉じ込めない */
  LocalProvider.prototype.exportData = function () {
    var u = this.user();
    if (!u) return null;
    return JSON.stringify({ exportedAt: new Date().toISOString(), profile: u }, null, 2);
  };

  /* ============================================================ 窓口 */
  var listeners = [];
  var provider = new LocalProvider();

  function emit() {
    var u = PB.auth.user();
    listeners.forEach(function (fn) {
      try { fn(u); } catch (e) { /* 1つ壊れても他を止めない */ }
    });
  }

  PB.auth = {
    get kind() { return provider.kind; },
    get label() { return provider.label; },

    /* 実サーバーへ切り替えるときの差し込み口 */
    use: function (p) { provider = p; emit(); return PB.auth; },

    user: function () { return provider.user(); },

    signUp: function (o) { return provider.signUp(o).then(function (u) { emit(); return u; }); },
    signIn: function (o) { return provider.signIn(o).then(function (u) { emit(); return u; }); },
    signOut: function () { return provider.signOut().then(function () { emit(); return null; }); },
    update: function (p) { return provider.update(p).then(function (u) { emit(); return u; }); },
    remove: function () { return provider.remove().then(function () { emit(); return null; }); },
    exportData: function () { return provider.exportData ? provider.exportData() : null; },

    onChange: function (fn) {
      listeners.push(fn);
      return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
    },

    rules: RULES
  };

  /* 別タブでの出入りに追随する */
  window.addEventListener('storage', function (e) {
    if (e.key === KEY_SESS || e.key === KEY_USERS) emit();
  });
})();
