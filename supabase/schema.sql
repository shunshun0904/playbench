-- ==========================================================================
-- PLAYBENCH ─ Supabase の初期設定
--
-- Supabase の管理画面 → SQL Editor に貼って一度だけ実行する。
--
-- 考え方:
--   auth.users        Supabase が持つ認証の本体。メールとパスワード。触らない
--   public.profiles   こちらが持つ公開の名札。ハンドル名・表示名・成績
--
-- メールアドレスは profiles に置かない。公開読みを許すテーブルなので、
-- 置いた時点で誰でも読めてしまう。
-- ==========================================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  handle     text unique not null,
  display    text not null,
  played     integer not null default 0,
  won        integer not null default 0,
  by_game    jsonb   not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint handle_shape check (handle ~ '^[a-z0-9_]{3,20}$'),
  constraint display_len  check (char_length(display) between 1 and 24),
  constraint counts_sane  check (played >= 0 and won >= 0 and won <= played)
);

-- ハンドル名の空き確認を速くする（登録前に引く）
create index if not exists profiles_handle_idx on public.profiles (handle);

alter table public.profiles enable row level security;

-- 誰でも読める。ランキングに出すため、そして登録前の空き確認のため
drop policy if exists "profiles are readable by anyone" on public.profiles;
create policy "profiles are readable by anyone"
  on public.profiles for select
  using (true);

-- 書き換えられるのは自分の行だけ
drop policy if exists "own profile is updatable" on public.profiles;
create policy "own profile is updatable"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 自分の行だけ消せる
drop policy if exists "own profile is deletable" on public.profiles;
create policy "own profile is deletable"
  on public.profiles for delete
  using (auth.uid() = id);

-- insert のポリシーは置かない。行は下のトリガが作る（security definer）ので、
-- クライアントから勝手な行を挿す口は開けないでおく。

-- ==========================================================================
-- 登録されたら名札を1枚作る。
-- ハンドル名と表示名は、signup のときに data: {...} で渡したものが
-- raw_user_meta_data に入ってくる。
-- ==========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  h text := lower(coalesce(new.raw_user_meta_data->>'handle', ''));
  d text := coalesce(nullif(trim(new.raw_user_meta_data->>'display'), ''), h);
begin
  -- ハンドル名が無い／形が違うときは、衝突しない名前を機械的に割り当てる。
  -- ここで例外を投げると登録そのものが落ちるため、落とさずに通す。
  if h !~ '^[a-z0-9_]{3,20}$' then
    h := 'player_' || substr(replace(new.id::text, '-', ''), 1, 8);
    d := h;
  end if;

  begin
    insert into public.profiles (id, handle, display) values (new.id, h, left(d, 24));
  exception when unique_violation then
    insert into public.profiles (id, handle, display)
    values (new.id, h || '_' || substr(replace(new.id::text, '-', ''), 1, 4), left(d, 24));
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
