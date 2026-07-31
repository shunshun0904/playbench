/* ==========================================================================
   PLAYBENCH ─ アカウント

   プロバイダを差し替えられる作りにしてある。

     LocalProvider     この端末の localStorage だけ。サーバー不要
     SupabaseProvider  Supabase の REST を素の fetch で叩く。ライブラリなし

   assets/config.js に URL と anon キーが入っていれば Supabase、
   空なら Local に落ちる。画面側はどちらでも同じ呼び方で動く。

   画面が知る必要のあること:
     fields  … その画面で出す入力欄（プロバイダによって違う）
     ident   … ログインに使う識別子。Local はハンドル名、Supabase はメール
   ========================================================================== */
'use strict';

window.PB = window.PB || {};

(function () {

  var KEY_USERS = 'pb.users.v1';
  var KEY_SESS = 'pb.session.v1';
  var KEY_SB = 'pb.sb.session.v1';

  /* ------------------------------------------------------------ 補助 */
  function load(key, fallback) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
  }
  function drop(key) { try { localStorage.removeItem(key); } catch (e) {} }

  function err(code, msg) { var e = new Error(msg); e.code = code; return e; }

  function normHandle(h) { return String(h || '').trim().replace(/^@/, '').toLowerCase(); }

  function bytesToHex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf),
      function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function randomHex(n) {
    var a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return bytesToHex(a.buffer);
  }

  /* --------------------------------------------------------- 入力の検査 */
  var RULES = { handle: /^[a-z0-9_]{3,20}$/, displayMax: 24, passMin: 8 };

  function checkHandle(h) {
    if (!h) throw err('handle-required', 'ハンドル名を入れてください');
    if (!RULES.handle.test(h)) {
      throw err('handle-shape', 'ハンドル名は半角の英小文字・数字・_ で 3〜20 文字にしてください');
    }
  }
  function checkPass(p) {
    if (!p) throw err('pass-required', 'パスワードを入れてください');
    if (p.length < RULES.passMin) throw err('pass-short', 'パスワードは ' + RULES.passMin + ' 文字以上にしてください');
  }
  function checkEmail(e) {
    if (!e) throw err('email-required', 'メールアドレスを入れてください');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())) {
      throw err('email-shape', 'メールアドレスの形になっていません');
    }
  }

  /* ============================================== この端末だけのアカウント */
  function LocalProvider() {
    this.kind = 'local';
    this.label = 'この端末';
    this.identKey = 'handle';
    this.fields = { signin: ['handle', 'pass'], signup: ['handle', 'display', 'pass'] };
  }

  LocalProvider.prototype._users = function () { return load(KEY_USERS, {}); };

  LocalProvider.prototype._public = function (u) {
    return {
      id: u.id, handle: u.handle, display: u.display, joined: u.joined,
      stats: u.stats || { played: 0, won: 0, byGame: {} },
      agents: u.agents || []
    };
  };

  LocalProvider.prototype.start = function () { return Promise.resolve(this.user()); };

  LocalProvider.prototype.user = function () {
    var id = load(KEY_SESS, null);
    if (!id) return null;
    var u = this._users()[id];
    return u ? this._public(u) : null;
  };

  /* パスワードは PBKDF2 で伸ばしてから置く。生の文字列を残さないというだけで、
     端末を触れる人からは守れない。画面にもそう書いてある。 */
  function derive(pass, saltHex) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits'])
      .then(function (key) {
        return crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: enc.encode(saltHex), iterations: 120000, hash: 'SHA-256' },
          key, 256);
      }).then(bytesToHex);
  }

  LocalProvider.prototype.signUp = function (o) {
    var self = this;
    return Promise.resolve().then(function () {
      var handle = normHandle(o.handle);
      checkHandle(handle);
      checkPass(o.pass);

      var users = self._users();
      for (var k in users) {
        if (users[k].handle === handle) throw err('handle-taken', 'その名前はこの端末ですでに使われています');
      }
      var salt = randomHex(16);
      return derive(o.pass, salt).then(function (hash) {
        var u = {
          id: 'u_' + randomHex(8), handle: handle,
          display: String(o.display || o.handle).trim().slice(0, RULES.displayMax) || handle,
          salt: salt, hash: hash, joined: new Date().toISOString(),
          stats: { played: 0, won: 0, byGame: {} }, agents: []
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

  LocalProvider.prototype.signOut = function () { drop(KEY_SESS); return Promise.resolve(null); };

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

  LocalProvider.prototype.exportData = function () {
    var u = this.user();
    return u ? JSON.stringify({ exportedAt: new Date().toISOString(), profile: u }, null, 2) : null;
  };

  /* ====================================================== Supabase 版 */
  /* ライブラリは使わず REST をそのまま叩く。
     使う口:
       POST /auth/v1/signup
       POST /auth/v1/token?grant_type=password
       POST /auth/v1/token?grant_type=refresh_token
       POST /auth/v1/logout
       GET  /rest/v1/profiles          （公開読み。ハンドル名の重複確認とランキング）
       PATCH/rest/v1/profiles          （自分の行だけ。RLS で縛る）             */
  function SupabaseProvider(cfg) {
    this.kind = 'supabase';
    this.label = 'Supabase';
    this.identKey = 'email';
    this.fields = { signin: ['email', 'pass'], signup: ['email', 'handle', 'display', 'pass'] };
    this.url = String(cfg.url).replace(/\/+$/, '');
    this.key = cfg.anonKey;
    this._me = null;
    this._sess = load(KEY_SB, null);
  }

  SupabaseProvider.prototype._headers = function (auth) {
    var h = { 'apikey': this.key, 'Content-Type': 'application/json' };
    var tok = auth && this._sess ? this._sess.access_token : null;
    h['Authorization'] = 'Bearer ' + (tok || this.key);
    return h;
  };

  SupabaseProvider.prototype._call = function (path, opt) {
    opt = opt || {};
    return fetch(this.url + path, {
      method: opt.method || 'GET',
      headers: Object.assign(this._headers(opt.auth !== false), opt.headers || {}),
      body: opt.body ? JSON.stringify(opt.body) : undefined
    }).then(function (res) {
      return res.text().then(function (txt) {
        var data = null;
        try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
        if (!res.ok) {
          var msg = (data && (data.msg || data.message || data.error_description || data.error)) || ('通信に失敗しました（' + res.status + '）');
          throw err('supabase-' + res.status, translate(msg, res.status));
        }
        return data;
      });
    }, function () {
      throw err('network', 'サーバーに接続できませんでした。通信状態を確かめてください');
    });
  };

  /* Supabase の英語メッセージを、こちらの言葉に置き換える */
  function translate(msg, status) {
    var m = String(msg);
    if (/Invalid login credentials/i.test(m)) return 'メールアドレスかパスワードが違います';
    if (/Email not confirmed/i.test(m)) return 'メールアドレスの確認がまだ済んでいません。届いた確認メールのリンクを開いてください';
    if (/User already registered|already been registered/i.test(m)) return 'そのメールアドレスはすでに登録されています';
    if (/Password should be at least/i.test(m)) return 'パスワードが短すぎます';
    if (/duplicate key .*profiles_handle/i.test(m) || /profiles_handle_key/i.test(m)) return 'そのハンドル名はすでに使われています';
    if (/rate limit|too many/i.test(m)) return '試行が多すぎます。しばらく置いてからもう一度お願いします';
    if (status === 401 || status === 403) return '権限がありません。設定を確かめてください';
    return m;
  }

  SupabaseProvider.prototype._setSession = function (s) {
    if (!s || !s.access_token) { this._sess = null; drop(KEY_SB); return; }
    s.expires_at = Date.now() + ((s.expires_in || 3600) - 60) * 1000;
    this._sess = s;
    save(KEY_SB, s);
  };

  SupabaseProvider.prototype._fresh = function () {
    var self = this;
    if (!this._sess) return Promise.reject(err('no-session', 'ログインしていません'));
    if (Date.now() < (this._sess.expires_at || 0)) return Promise.resolve(this._sess);
    return this._call('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', auth: false, body: { refresh_token: this._sess.refresh_token }
    }).then(function (s) { self._setSession(s); return s; })
      .catch(function () { self._setSession(null); throw err('no-session', 'ログインの期限が切れました。もう一度ログインしてください'); });
  };

  SupabaseProvider.prototype._profile = function (uid) {
    var self = this;
    return this._call('/rest/v1/profiles?select=*&id=eq.' + encodeURIComponent(uid))
      .then(function (rows) {
        var p = rows && rows[0];
        if (!p) return null;
        self._me = {
          id: p.id, handle: p.handle, display: p.display, joined: p.created_at,
          stats: { played: p.played || 0, won: p.won || 0, byGame: p.by_game || {} },
          agents: []
        };
        return self._me;
      });
  };

  /* 起動時に一度だけ。保存してあるセッションから利用者を取り戻す */
  SupabaseProvider.prototype.start = function () {
    var self = this;
    if (!this._sess) return Promise.resolve(null);
    return this._fresh()
      .then(function (s) { return self._profile(s.user ? s.user.id : self._sess.user.id); })
      .catch(function () { self._me = null; return null; });
  };

  SupabaseProvider.prototype.user = function () { return this._me; };

  SupabaseProvider.prototype.signUp = function (o) {
    var self = this;
    return Promise.resolve().then(function () {
      var handle = normHandle(o.handle);
      var email = String(o.email || '').trim();
      checkEmail(email);
      checkHandle(handle);
      checkPass(o.pass);

      /* 先にハンドル名の空きを見る。登録してから弾かれるのを避ける */
      return self._call('/rest/v1/profiles?select=handle&handle=eq.' + encodeURIComponent(handle), { auth: false })
        .then(function (rows) {
          if (rows && rows.length) throw err('handle-taken', 'そのハンドル名はすでに使われています');
          return self._call('/auth/v1/signup', {
            method: 'POST', auth: false,
            body: {
              email: email, password: o.pass,
              data: { handle: handle, display: String(o.display || handle).trim().slice(0, RULES.displayMax) || handle }
            }
          });
        })
        .then(function (res) {
          /* メール確認が要る設定だと、ここでセッションが返らない */
          if (!res || !res.access_token) {
            throw err('confirm', '確認メールを送りました。届いたリンクを開いてから、ログインしてください');
          }
          self._setSession(res);
          return self._profile(res.user.id);
        });
    });
  };

  SupabaseProvider.prototype.signIn = function (o) {
    var self = this;
    return Promise.resolve().then(function () {
      var email = String(o.email || '').trim();
      checkEmail(email);
      if (!o.pass) throw err('pass-required', 'パスワードを入れてください');
      return self._call('/auth/v1/token?grant_type=password', {
        method: 'POST', auth: false, body: { email: email, password: o.pass }
      }).then(function (res) {
        self._setSession(res);
        return self._profile(res.user.id);
      });
    });
  };

  SupabaseProvider.prototype.signOut = function () {
    var self = this;
    var done = function () { self._setSession(null); self._me = null; return null; };
    if (!this._sess) return Promise.resolve(done());
    return this._call('/auth/v1/logout', { method: 'POST' }).then(done, done);
  };

  SupabaseProvider.prototype.update = function (patch) {
    var self = this;
    if (!this._me) return Promise.reject(err('no-session', 'ログインしていません'));
    var body = {};
    if (patch.display != null) {
      var d = String(patch.display).trim();
      if (!d) return Promise.reject(err('display-required', '表示名を入れてください'));
      body.display = d.slice(0, RULES.displayMax);
    }
    if (patch.stats) {
      body.played = patch.stats.played;
      body.won = patch.stats.won;
      body.by_game = patch.stats.byGame || {};
    }
    return this._fresh().then(function () {
      return self._call('/rest/v1/profiles?id=eq.' + encodeURIComponent(self._me.id), {
        method: 'PATCH', body: body, headers: { 'Prefer': 'return=representation' }
      });
    }).then(function () { return self._profile(self._me.id); });
  };

  /* 退会は auth.users の削除が要るので、クライアントからは行えない。
     消せるのは自分のプロフィール行までで、それは正直に伝える。 */
  SupabaseProvider.prototype.remove = function () {
    return Promise.reject(err('not-supported',
      'アカウントの削除は、いまはこの画面からはできません。Supabase の管理画面から消してください'));
  };

  SupabaseProvider.prototype.exportData = function () {
    var u = this._me;
    return u ? JSON.stringify({ exportedAt: new Date().toISOString(), profile: u }, null, 2) : null;
  };

  /* ============================================================ 窓口 */
  var listeners = [];
  var cfg = (window.PB.CONFIG && window.PB.CONFIG.supabase) || {};
  var provider = (cfg.url && cfg.anonKey) ? new SupabaseProvider(cfg) : new LocalProvider();

  function emit() {
    var u = PB.auth.user();
    listeners.forEach(function (fn) { try { fn(u); } catch (e) {} });
  }

  PB.auth = {
    get kind() { return provider.kind; },
    get label() { return provider.label; },
    get identKey() { return provider.identKey; },
    fields: function () { return provider.fields; },

    use: function (p) { provider = p; return (p.start ? p.start() : Promise.resolve()).then(function () { emit(); return PB.auth; }); },
    start: function () { return (provider.start ? provider.start() : Promise.resolve(provider.user())).then(function (u) { emit(); return u; }); },

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

    rules: RULES,
    LocalProvider: LocalProvider,
    SupabaseProvider: SupabaseProvider
  };

  /* 別タブでの出入りに追随する（Local のとき） */
  window.addEventListener('storage', function (e) {
    if (e.key === KEY_SESS || e.key === KEY_USERS) emit();
  });
})();
