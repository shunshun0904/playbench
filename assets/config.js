/* ==========================================================================
   PLAYBENCH ─ 接続先の設定

   ここが空のあいだは「この端末だけ」のアカウント（LocalProvider）で動く。
   Supabase の URL と anon キーを入れると、そちらへ切り替わる。

   anon キーは公開してよいキー。ブラウザに配る前提で作られていて、
   実際の権限は Supabase 側の RLS（行レベルセキュリティ）で決まる。
   秘密にすべきなのは service_role キーのほうで、それはここに書かない。

   立ち上げ手順は supabase/README.md を参照。
   ========================================================================== */
'use strict';

window.PB = window.PB || {};

/* すでに入っていれば、そちらを優先する（検査で差し込むため） */
window.PB.CONFIG = window.PB.CONFIG || {
  supabase: {
    url: 'https://keevclphgxpqhmszcwyk.supabase.co',      // 例: https://xxxxxxxxxxxx.supabase.co
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlZXZjbHBoZ3hwcWhtc3pjd3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NjcwNTMsImV4cCI6MjEwMTE0MzA1M30.fSPOBuv3IMFqWrrB677pFEdmqe0av5rliDeM9DZGVi0'   // 例: eyJhbGciOi...
  }
};
