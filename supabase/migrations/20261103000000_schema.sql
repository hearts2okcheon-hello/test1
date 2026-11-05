-- 옥!소리 스키마 (design.md §4)
-- 쓰기는 모두 RPC(security definer)로만 한다. 테이블에는 읽기 정책만 둔다. (ADR-001)

create type user_role as enum ('owner', 'admin');
create type notice_kind as enum ('open', 'closed_today', 'late_open', 'sold_out', 'early_close');
create type notice_source as enum ('owner', 'okcheon');
create type report_kind as enum ('seen_closed', 'seen_open', 'seen_sold_out', 'seen_long_line');
create type report_status as enum ('pending', 'confirmed', 'rejected', 'expired');

-- 사장님(가게 코드로 연결된 기기)과 옥천신문 관리자
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role user_role not null default 'owner',
  display_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  address text,
  -- { "mon": [["11:00","21:00"]], "sun": null, ... }  null = 정기 휴무
  regular_hours jsonb,
  is_pilot boolean not null default true,
  created_at timestamptz not null default now()
);

-- 가게 코드: 옥천신문이 발급해 전화·방문으로 사장님께 알려 준다 (ADR-006)
create table store_codes (
  store_id uuid primary key references stores(id) on delete cascade,
  code text not null unique check (code ~ '^[0-9]{6}$'),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- 가게 코드를 넣은 기기(사장님·가족). 한 가게에 여러 기기 가능
create table store_members (
  store_id uuid not null references stores(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

-- 코드 입력 시도 (틀린 코드 연속 입력 제한)
create table code_attempts (
  id bigserial primary key,
  user_id uuid not null,
  ok boolean not null,
  created_at timestamptz not null default now()
);

create table notices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  kind notice_kind not null,
  at_time time,
  memo text check (char_length(memo) <= 40),
  source notice_source not null,
  created_by uuid not null references profiles(id),
  from_report_id uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  -- 새 공지에 밀려 끝났을 때 그 공지 id. 되돌리기 때 복원용
  replaced_by uuid
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  kind report_kind not null,
  reporter_id uuid not null,
  status report_status not null default 'pending',
  resolved_by uuid references profiles(id),
  resolved_source notice_source,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table report_agrees (
  report_id uuid not null references reports(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

create table events (
  id bigserial primary key,
  name text not null,
  store_id uuid,
  anon_id uuid,
  props jsonb,
  created_at timestamptz not null default now()
);

create index notices_store_valid on notices (store_id, created_at desc) where ended_at is null;
create index notices_created on notices (created_at desc);
create index reports_store_pending on reports (store_id, created_at desc) where status = 'pending';
create index reports_reporter on reports (reporter_id, store_id, created_at desc);
create index events_name_created on events (name, created_at);
create index store_members_user on store_members (user_id, created_at desc);
create index code_attempts_user on code_attempts (user_id, created_at desc);

-- ── RLS ──────────────────────────────────────────────
alter table profiles enable row level security;
alter table stores enable row level security;
alter table store_codes enable row level security;
alter table store_members enable row level security;
alter table code_attempts enable row level security;
alter table notices enable row level security;
alter table reports enable row level security;
alter table report_agrees enable row level security;
alter table events enable row level security;

create or replace function okc_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

create policy "가게는 누구나 본다" on stores for select using (true);
-- 가게 등록·수정은 admin_upsert_store RPC로만 (T-ADMIN-03)

create policy "공지는 누구나 본다" on notices for select using (true);

create policy "본인 프로필" on profiles for select using (id = auth.uid() or okc_is_admin());

-- store_codes · store_members · code_attempts · reports · report_agrees · events:
-- 정책 없음 = 직접 접근 불가. 가게 코드·제보자 id 비노출 (T-REPORT-13, T-AUTH)
