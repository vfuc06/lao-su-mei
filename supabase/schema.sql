-- ====================================================================
-- CƠ SỞ DỮ LIỆU DỰ ÁN: LÃO SƯ MEI (BẢN 2) - SUPABASE POSTGRESQL SCHEMA
-- Hướng dẫn: Mở Supabase -> Chọn dự án -> Vào SQL Editor -> Dán toàn bộ file này -> Bấm Run
-- ====================================================================

-- 1. HỒ SƠ NGƯỜI DÙNG (Profiles)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  settings jsonb not null default '{
    "speechRate": 1.0,
    "autoPlay": true,
    "showPinyin": true,
    "showVi": true,
    "passThreshold": 80,
    "strictness": "strict",
    "dailyNewCards": 10,
    "estimatedLevel": 1
  }'::jsonb,
  created_at timestamptz not null default now()
);

-- 2. NỘI DUNG TỪ VỰNG (Vocab Cards)
create table if not exists public.vocab_cards (
  id bigint generated always as identity primary key,
  deck text not null check (deck in ('hsk', 'workplace')),
  hsk_level smallint check (hsk_level between 1 and 4),
  category text, -- dùng phân nhóm cho bộ công sở
  hanzi text not null,
  pinyin text not null,
  vi text not null,
  example_hanzi text,
  example_pinyin text,
  example_vi text,
  sort int default 0,
  check ((deck = 'hsk') = (hsk_level is not null)),
  unique (deck, hanzi, pinyin)
);

-- 3. NHÓM MẪU CÂU (Phrase Groups)
create table if not exists public.phrase_groups (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('daily', 'workplace')),
  slug text unique not null,
  emoji text,
  title_vi text not null,
  sort int default 0
);

-- 4. CẶP HỎI - ĐÁP MẪU CÂU (Phrase Pairs)
create table if not exists public.phrase_pairs (
  id bigint generated always as identity primary key,
  group_id bigint not null references public.phrase_groups on delete cascade,
  sort int default 0,
  q_hanzi text not null,
  q_pinyin text not null,
  q_vi text not null,
  a_hanzi text not null,
  a_pinyin text not null,
  a_vi text not null,
  note_vi text
);

-- 5. TIẾN TRÌNH ÔN TỪ VỰNG (SM-2 Spaced Repetition)
create table if not exists public.user_card_progress (
  user_id uuid references auth.users on delete cascade,
  card_id bigint references public.vocab_cards on delete cascade,
  ease real not null default 2.5,
  interval_days int not null default 0,
  repetitions int not null default 0,
  lapses int not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  primary key (user_id, card_id)
);

-- 6. TIẾN TRÌNH LUYỆN MẪU CÂU & SHADOWING
create table if not exists public.user_phrase_progress (
  user_id uuid references auth.users on delete cascade,
  pair_id bigint references public.phrase_pairs on delete cascade,
  favorited boolean not null default false,
  best_score smallint not null default 0,
  attempts int not null default 0,
  passed boolean not null default false,
  last_practiced_at timestamptz,
  primary key (user_id, pair_id)
);

-- 7. PHIÊN HỘI THOẠI AI (Chat Sessions)
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  mode text not null check (mode in ('daily', 'workplace')),
  scenario text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  summary jsonb
);

-- 8. LƯỢT HỘI THOẠI (Chat Turns)
create table if not exists public.chat_turns (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.chat_sessions on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('user', 'ai')),
  content jsonb not null,
  created_at timestamptz not null default now()
);

-- 9. SỔ LỖI (Mistakes) - Ghi lại câu nói sai ở chế độ Gia sư nghiêm
create table if not exists public.mistakes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  session_id uuid references public.chat_sessions on delete set null,
  user_said text not null,
  correct_hanzi text not null,
  correct_pinyin text,
  correct_vi text,
  explanation text,
  error_type text,
  attempts int not null default 0,
  best_score smallint not null default 0,
  passed boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- 10. HOẠT ĐỘNG THEO NGÀY (Daily Activity & Quota)
create table if not exists public.daily_activity (
  user_id uuid references auth.users on delete cascade,
  day date not null,
  ai_turns int not null default 0,
  cards_reviewed int not null default 0,
  shadowing_done int not null default 0,
  speaking_seconds int not null default 0,
  primary key (user_id, day)
);

-- ====================================================================
-- BẢO MẬT: BẬT ROW LEVEL SECURITY (RLS)
-- ====================================================================
alter table public.profiles enable row level security;
alter table public.vocab_cards enable row level security;
alter table public.phrase_groups enable row level security;
alter table public.phrase_pairs enable row level security;
alter table public.user_card_progress enable row level security;
alter table public.user_phrase_progress enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_turns enable row level security;
alter table public.mistakes enable row level security;
alter table public.daily_activity enable row level security;

-- Policies: Nội dung ai cũng đọc được
drop policy if exists "public read vocab_cards" on public.vocab_cards;
create policy "public read vocab_cards" on public.vocab_cards for select using (true);

drop policy if exists "public read phrase_groups" on public.phrase_groups;
create policy "public read phrase_groups" on public.phrase_groups for select using (true);

drop policy if exists "public read phrase_pairs" on public.phrase_pairs;
create policy "public read phrase_pairs" on public.phrase_pairs for select using (true);

-- Policies: Dữ liệu cá nhân chỉ chủ tài khoản được xem & sửa
drop policy if exists "own profiles" on public.profiles;
create policy "own profiles" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own user_card_progress" on public.user_card_progress;
create policy "own user_card_progress" on public.user_card_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own user_phrase_progress" on public.user_phrase_progress;
create policy "own user_phrase_progress" on public.user_phrase_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own chat_sessions" on public.chat_sessions;
create policy "own chat_sessions" on public.chat_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own chat_turns" on public.chat_turns;
create policy "own chat_turns" on public.chat_turns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own mistakes" on public.mistakes;
create policy "own mistakes" on public.mistakes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own daily_activity" on public.daily_activity;
create policy "own daily_activity" on public.daily_activity for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ====================================================================
-- INDEX TỐI ƯU HIỆU NĂNG
-- ====================================================================
create index if not exists idx_user_card_progress_due on public.user_card_progress (user_id, due_at);
create index if not exists idx_mistakes_user_passed on public.mistakes (user_id, passed);
create index if not exists idx_phrase_pairs_group_sort on public.phrase_pairs (group_id, sort);
create index if not exists idx_daily_activity_day on public.daily_activity (user_id, day);

-- ====================================================================
-- TRIGGER: TỰ TẠO PROFILE KHI ĐĂNG KÝ MỚI
-- ====================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, settings)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    '{
      "speechRate": 1.0,
      "autoPlay": true,
      "showPinyin": true,
      "showVi": true,
      "passThreshold": 80,
      "strictness": "strict",
      "dailyNewCards": 10,
      "estimatedLevel": 1
    }'::jsonb
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

