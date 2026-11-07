-- 가게 페이지 확장 (ADR-007)
-- 1) 가게 코드 → 전화번호마다 하나인 사장님 코드 (예: 타-00000)
-- 2) 코드를 넣은 사장님이 직접 가게를 등록·수정한다
-- 3) 메뉴·사진·소식·공감·댓글·임시휴무
-- 4) 영업 상태(영업중·영업종료·정기휴일·임시휴무)는 okc_schedule_status 한 곳에서 계산한다
-- 실제 전화번호는 이 파일(저장소)에 넣지 않는다. 관리자 화면에서 발급한다.

-- ── 스키마 ─────────────────────────────────────────
drop function if exists redeem_store_code(text);
drop function if exists admin_issue_store_code(uuid, boolean);
drop function if exists admin_list_store_codes();
drop table if exists store_codes;

alter table stores
  add column neighborhood text,
  add column phone text,
  add column intro text check (char_length(intro) <= 500);

-- 전화번호 하나에 코드 하나, 코드 하나에 가게 하나.
-- 코드는 전화번호에서 계산하지 않는 무작위 값이다 (가게 전화번호가 공개돼도 코드는 알 수 없다)
create table owner_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique check (phone ~ '^0[0-9]{8,10}$'),
  code text not null unique check (code ~ '^[가나다라마바사아자차카타파하]-[0-9]{5}$'),
  store_id uuid unique references stores(id) on delete set null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- 코드를 넣은 기기. 가게를 등록하기 전에도 "이 기기는 이 코드의 주인"임을 기억한다
create table owner_code_members (
  code_id uuid not null references owner_codes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (code_id, user_id)
);

create table store_menus (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  price int check (price between 0 and 10000000),
  photo_url text,
  sort int not null default 0
);

create table store_photos (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  category text not null check (category in ('store', 'food', 'daily')),
  url text not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table store_posts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  kind text not null default 'news' check (kind in ('news', 'notice')),
  body text not null check (char_length(body) between 1 and 500),
  image_url text,
  source notice_source not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

create table post_likes (
  post_id uuid not null references store_posts(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table store_comments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  author_id uuid not null,
  body text not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table temp_closures (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text check (char_length(reason) <= 200),
  source notice_source not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  canceled_at timestamptz,
  check (end_date >= start_date)
);

create index owner_code_members_user on owner_code_members (user_id, created_at desc);
create index store_menus_store on store_menus (store_id, sort);
create index store_photos_store on store_photos (store_id, sort);
create index store_posts_store on store_posts (store_id, created_at desc) where deleted_at is null;
create index store_posts_created on store_posts (created_at desc) where deleted_at is null;
create index store_comments_store on store_comments (store_id, created_at desc) where deleted_at is null;
create index store_comments_author on store_comments (author_id, created_at desc);
create index temp_closures_store on temp_closures (store_id, start_date) where canceled_at is null;

-- 정책 없음 = 직접 접근 불가. 모두 RPC 로 읽고 쓴다 (전화번호·코드·작성자 id 비노출)
alter table owner_codes enable row level security;
alter table owner_code_members enable row level security;
alter table store_menus enable row level security;
alter table store_photos enable row level security;
alter table store_posts enable row level security;
alter table post_likes enable row level security;
alter table store_comments enable row level security;
alter table temp_closures enable row level security;

-- ── 사진 저장소 ────────────────────────────────────
create or replace function okc_can_edit_store(p_store text) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from store_members m where m.store_id::text = p_store and m.user_id = auth.uid())
    or (okc_is_admin() and not okc_is_anonymous() and exists (select 1 from stores s where s.id::text = p_store))
  )
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-media', 'store-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 경로는 <가게 id>/<파일>. 자기 가게 폴더에만 올리고 지운다
create policy "가게 사진 올리기" on storage.objects for insert to authenticated
  with check (bucket_id = 'store-media' and okc_can_edit_store((storage.foldername(name))[1]));
create policy "가게 사진 확인" on storage.objects for select to authenticated
  using (bucket_id = 'store-media' and okc_can_edit_store((storage.foldername(name))[1]));
create policy "가게 사진 지우기" on storage.objects for delete to authenticated
  using (bucket_id = 'store-media' and okc_can_edit_store((storage.foldername(name))[1]));

-- ── 내부 도우미 ────────────────────────────────────
create or replace function _okc_normalize_phone(p text) returns text
language plpgsql immutable set search_path = public as $$
declare
  v text := regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g');
begin
  if v !~ '^0[0-9]{8,10}$' then
    raise exception 'INVALID_PHONE';
  end if;
  return v;
end;
$$;

-- "타00000", "타-00000", "타 00000" → "타-00000". 형식이 다르면 null
create or replace function _okc_normalize_code(p text) returns text
language sql immutable set search_path = public as $$
  select case when v ~ '^[가나다라마바사아자차카타파하][0-9]{5}$' then substr(v, 1, 1) || '-' || substr(v, 2) end
    from (select regexp_replace(coalesce(p, ''), '[^가-힣0-9]', '', 'g') as v) t
$$;

-- 가~하 14글자 × 숫자 5자리 = 140만 개. gen_random_uuid 의 난수를 쓴다
create or replace function _okc_new_code() returns text
language plpgsql volatile set search_path = public as $$
declare
  letters constant text := '가나다라마바사아자차카타파하';
  n bigint;
  v text;
begin
  loop
    n := ('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint % 1400000;
    v := substr(letters, (n / 100000)::int + 1, 1) || '-' || lpad((n % 100000)::text, 5, '0');
    exit when not exists (select 1 from owner_codes where code = v);
  end loop;
  return v;
end;
$$;

-- 영업시간 형식 검사. 잘못된 값이 들어가면 영업 상태 계산이 모든 가게에서 깨진다
create or replace function _okc_check_hours(p jsonb) returns void
language plpgsql immutable set search_path = public as $$
declare
  k text;
  v jsonb;
  r jsonb;
  open_days int := 0;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'INVALID_HOURS';
  end if;
  for k, v in select * from jsonb_each(p) loop
    if k not in ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun') then
      raise exception 'INVALID_HOURS';
    end if;
    if jsonb_typeof(v) = 'null' then
      continue;
    end if;
    if jsonb_typeof(v) <> 'array' then
      raise exception 'INVALID_HOURS';
    end if;
    for r in select * from jsonb_array_elements(v) loop
      if jsonb_typeof(r) <> 'array' or jsonb_array_length(r) <> 2
         or (r ->> 0) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
         or (r ->> 1) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
        raise exception 'INVALID_HOURS';
      end if;
      open_days := open_days + 1;
    end loop;
  end loop;
  if open_days = 0 then
    raise exception 'INVALID_HOURS';
  end if;
end;
$$;

-- 이 가게 폴더에 올린 사진만 받는다 (다른 사이트 주소를 넣지 못하게)
create or replace function _okc_check_media_url(p_store_id uuid, p_url text) returns void
language plpgsql immutable set search_path = public as $$
begin
  if p_url is not null and position('/storage/v1/object/public/store-media/' || p_store_id::text || '/' in p_url) = 0 then
    raise exception 'INVALID_PHOTO';
  end if;
end;
$$;

-- ── 팻말 규칙 (design §3.3) — 이 함수 하나에만 있다 ──────
-- 1) 임시휴무보다 나중에 올린 유효한 공지  2) 오늘 걸린 임시휴무  3) 유효한 공지
-- 4) 유효한 확인 대기 제보 → checking  5) none
create or replace function current_sign(p_store_id uuid)
returns table (
  sign text, source text, at_time time, memo text, signed_at timestamptz,
  notice_id uuid, report_kind text, agree_count int
)
language sql stable security definer set search_path = public as $$
  select coalesce(n.kind::text,
                  case when cl.id is not null then 'temp_closed' end,
                  case when r.id is not null then 'checking' end,
                  'none'),
         coalesce(n.source::text, cl.source::text, case when r.id is not null then 'neighbor' end),
         n.at_time,
         case when n.id is not null then n.memo else cl.reason end,
         coalesce(n.created_at, cl.created_at, r.created_at),
         n.id,
         r.kind::text,
         coalesce(r.agrees, 0)
    from (select 1) as one
    left join lateral (
      select c.id, c.source, c.reason, c.created_at
        from temp_closures c
       where c.store_id = p_store_id and c.canceled_at is null
         and (now() at time zone 'Asia/Seoul')::date between c.start_date and c.end_date
       order by c.created_at desc
       limit 1
    ) cl on true
    left join lateral (
      select x.id, x.kind, x.source, x.at_time, x.memo, x.created_at
        from notices x
       where x.store_id = p_store_id and okc_notice_valid(x.ended_at, x.expires_at)
         and (cl.id is null or x.created_at > cl.created_at)
       order by x.created_at desc
       limit 1
    ) n on true
    left join lateral (
      -- 줄이 길어요는 상태가 아니라서 팻말을 바꾸지 않는다
      select y.id, y.kind, y.created_at,
             (select count(*)::int from report_agrees a where a.report_id = y.id) as agrees
        from reports y
       where y.store_id = p_store_id and y.status = 'pending' and y.expires_at > now()
         and y.kind <> 'seen_long_line'
       order by y.created_at desc
       limit 1
    ) r on n.id is null and cl.id is null
$$;

-- ── 영업 상태 (ADR-007) — 이 함수 하나에만 있다 ──────
-- status: open 영업중 · closed 영업종료 · regular_holiday 정기휴일 · temp_closed 임시휴무 · unknown 정보 없음
-- basis:  notice 사장님·옥천신문이 알림 · hours 등록한 영업시간으로 계산 (화면에 함께 표시한다)
-- 이웃 제보는 확정이 아니므로 상태를 바꾸지 않는다
create or replace function okc_schedule_status(p_store_id uuid)
returns table (status text, basis text)
language plpgsql stable security definer set search_path = public as $$
declare
  c record;
  v_hours jsonb;
  v_now timestamp := now() at time zone 'Asia/Seoul';
  v_time time := (now() at time zone 'Asia/Seoul')::time;
  v_today text := lower(to_char(now() at time zone 'Asia/Seoul', 'Dy'));
  v_yesterday text := lower(to_char((now() at time zone 'Asia/Seoul') - interval '1 day', 'Dy'));
  r jsonb;
  a time;
  b time;
  v_has_today boolean := false;
begin
  select * into c from current_sign(p_store_id);
  if c.sign in ('temp_closed', 'closed_today') then
    return query select 'temp_closed'::text, 'notice'::text; return;
  elsif c.sign = 'open' then
    return query select 'open'::text, 'notice'::text; return;
  elsif c.sign in ('late_open', 'sold_out') then
    return query select 'closed'::text, 'notice'::text; return;
  elsif c.sign = 'early_close' and c.at_time is not null and v_time >= c.at_time then
    return query select 'closed'::text, 'notice'::text; return;
  end if;

  select regular_hours into v_hours from stores where id = p_store_id;
  if v_hours is null or not (v_hours ? v_today) then
    return query select 'unknown'::text, 'hours'::text; return;
  end if;

  -- 어제 자정을 넘겨 이어지는 영업 (예: 18:00~02:00)
  if jsonb_typeof(v_hours -> v_yesterday) = 'array' then
    for r in select * from jsonb_array_elements(v_hours -> v_yesterday) loop
      a := (r ->> 0)::time; b := (r ->> 1)::time;
      if a >= b and v_time < b then
        return query select 'open'::text, 'hours'::text; return;
      end if;
    end loop;
  end if;

  if jsonb_typeof(v_hours -> v_today) = 'array' then
    for r in select * from jsonb_array_elements(v_hours -> v_today) loop
      v_has_today := true;
      a := (r ->> 0)::time; b := (r ->> 1)::time;
      if (a < b and v_time >= a and v_time < b) or (a >= b and v_time >= a) then
        return query select 'open'::text, 'hours'::text; return;
      end if;
    end loop;
  end if;

  if not v_has_today then
    return query select 'regular_holiday'::text, 'hours'::text; return;
  end if;
  return query select 'closed'::text, 'hours'::text;
end;
$$;

-- ── 읽기: 가게별 지금 팻말 ──────────────────────────
-- listed = 마을방송 "오늘 우리 동네 가게"에 뜨는가: 영업중이거나 오늘 알릴 소식이 있는 가게
drop function if exists get_store_signs(text);
create function get_store_signs(p_category text default null)
returns table (
  store_id uuid, name text, category text, address text, regular_hours jsonb,
  sign text, source text, at_time time, memo text, signed_at timestamptz,
  notice_id uuid, report_kind text, agree_count int,
  neighborhood text, schedule_status text, schedule_basis text, listed boolean, cover_url text
)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.category, s.address, s.regular_hours,
         c.sign, c.source, c.at_time, c.memo, c.signed_at, c.notice_id, c.report_kind, c.agree_count,
         s.neighborhood, st.status, st.basis,
         (st.status = 'open' or c.sign <> 'none'),
         (select p.url from store_photos p where p.store_id = s.id order by p.sort, p.created_at limit 1)
    from stores s
    cross join lateral current_sign(s.id) c
    cross join lateral okc_schedule_status(s.id) st
   where p_category is null or s.category = p_category
   order by (c.sign = 'none'), c.signed_at desc nulls last, s.name
$$;

-- ── 읽기: 가게 상세 ────────────────────────────────
create or replace function get_store_detail(p_store_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not exists (select 1 from stores where id = p_store_id) then null else
    jsonb_build_object(
      'store', (select to_jsonb(t) from get_store_signs() t where t.store_id = p_store_id),
      'profile', (select jsonb_build_object('phone', s.phone, 'intro', s.intro) from stores s where s.id = p_store_id),
      'can_manage', okc_can_edit_store(p_store_id::text),
      'reports', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', r.id,
                 'kind', r.kind,
                 'status', case when r.status = 'pending' and r.expires_at <= now() then 'expired' else r.status::text end,
                 'created_at', r.created_at,
                 'resolved_source', r.resolved_source,
                 'resolved_at', r.resolved_at,
                 'agree_count', (select count(*) from report_agrees a where a.report_id = r.id),
                 'agreed_by_me', exists (select 1 from report_agrees a where a.report_id = r.id and a.user_id = auth.uid()),
                 'is_mine', coalesce(r.reporter_id = auth.uid(), false)
               ) order by r.created_at desc)
          from reports r
         where r.store_id = p_store_id and r.created_at >= okc_today_start()
      ), '[]'::jsonb),
      'menus', coalesce((
        select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'price', m.price, 'photo_url', m.photo_url) order by m.sort)
          from store_menus m where m.store_id = p_store_id
      ), '[]'::jsonb),
      'photos', coalesce((
        select jsonb_agg(jsonb_build_object('id', p.id, 'category', p.category, 'url', p.url) order by p.sort, p.created_at)
          from store_photos p where p.store_id = p_store_id
      ), '[]'::jsonb),
      'posts', coalesce((
        select jsonb_agg(x.j order by x.created_at desc) from (
          select p.created_at, jsonb_build_object(
                   'id', p.id, 'kind', p.kind, 'body', p.body, 'image_url', p.image_url, 'source', p.source,
                   'created_at', p.created_at, 'updated_at', p.updated_at,
                   'like_count', (select count(*) from post_likes l where l.post_id = p.id),
                   'liked_by_me', exists (select 1 from post_likes l where l.post_id = p.id and l.user_id = auth.uid())
                 ) as j
            from store_posts p
           where p.store_id = p_store_id and p.deleted_at is null
           order by p.created_at desc limit 20) x
      ), '[]'::jsonb),
      'comment_count', (select count(*) from store_comments c where c.store_id = p_store_id and c.deleted_at is null),
      'comments', coalesce((
        select jsonb_agg(x.j order by x.created_at desc) from (
          select c.created_at, jsonb_build_object(
                   'id', c.id, 'body', c.body, 'created_at', c.created_at,
                   'is_mine', coalesce(c.author_id = auth.uid(), false)
                 ) as j
            from store_comments c
           where c.store_id = p_store_id and c.deleted_at is null
           order by c.created_at desc limit 30) x
      ), '[]'::jsonb),
      -- 지금 걸려 있거나 앞으로 잡힌 임시휴무
      'closures', coalesce((
        select jsonb_agg(jsonb_build_object('id', c.id, 'start_date', c.start_date, 'end_date', c.end_date, 'reason', c.reason) order by c.start_date)
          from temp_closures c
         where c.store_id = p_store_id and c.canceled_at is null
           and c.end_date >= (now() at time zone 'Asia/Seoul')::date
      ), '[]'::jsonb)
    )
  end
$$;

-- ── 읽기: 오늘의 마을방송 피드 ─────────────────────
-- 공지 + 사장님 소식 + 임시휴무(오늘 올렸거나 오늘 시작)
drop function if exists get_today_feed(int);
create function get_today_feed(p_limit int default 20)
returns table (
  notice_id uuid, store_id uuid, store_name text, kind text, at_time time,
  memo text, source text, created_at timestamptz, is_current boolean,
  item_type text, item_id uuid, image_url text, closure_start date, closure_end date
)
language sql stable security definer set search_path = public as $$
  select * from (
    select n.id, s.id, s.name, n.kind::text, n.at_time, n.memo, n.source::text, n.created_at,
           coalesce(n.id = c.notice_id, false),
           'notice'::text, n.id, null::text, null::date, null::date
      from notices n
      join stores s on s.id = n.store_id
      cross join lateral current_sign(n.store_id) c
     where n.created_at >= okc_today_start()
    union all
    select null::uuid, s.id, s.name, p.kind, null::time, p.body, p.source::text, p.created_at,
           true, 'post'::text, p.id, p.image_url, null::date, null::date
      from store_posts p
      join stores s on s.id = p.store_id
     where p.created_at >= okc_today_start() and p.deleted_at is null
    union all
    select null::uuid, s.id, s.name, 'temp_closed'::text, null::time, t.reason, t.source::text,
           greatest(t.created_at, okc_today_start()),
           true, 'closure'::text, t.id, null::text, t.start_date, t.end_date
      from temp_closures t
      join stores s on s.id = t.store_id
     where t.canceled_at is null
       and (t.created_at >= okc_today_start() or t.start_date = (now() at time zone 'Asia/Seoul')::date)
  ) f (notice_id, store_id, store_name, kind, at_time, memo, source, created_at, is_current,
       item_type, item_id, image_url, closure_start, closure_end)
   order by f.created_at desc
   limit greatest(1, least(p_limit, 50))
$$;

-- ── 사장님 홈 ─────────────────────────────────────
create or replace function get_owner_home() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_store uuid;
  v_code owner_codes;
begin
  if auth.uid() is null then
    return jsonb_build_object('state', 'no_store', 'is_admin', false);
  end if;

  select c.* into v_code
    from owner_code_members m join owner_codes c on c.id = m.code_id
   where m.user_id = auth.uid()
   order by m.created_at desc limit 1;

  -- 코드는 넣었지만 아직 가게를 등록하지 않았다
  if v_code.id is not null and v_code.store_id is null then
    return jsonb_build_object('state', 'needs_store', 'is_admin', okc_is_admin(),
                              'code', v_code.code, 'phone', v_code.phone);
  end if;

  -- 가장 최근에 코드를 넣은 가게
  select store_id into v_store from store_members where user_id = auth.uid() order by created_at desc limit 1;

  if v_store is null then
    return jsonb_build_object('state', 'no_store', 'is_admin', okc_is_admin());
  end if;

  return jsonb_build_object(
    'state', 'owner',
    'is_admin', okc_is_admin(),
    'code', (select c.code from owner_codes c where c.store_id = v_store),
    'store', (select to_jsonb(t) from get_store_signs() t where t.store_id = v_store),
    'notice', (
      select jsonb_build_object('id', n.id, 'kind', n.kind, 'at_time', n.at_time, 'memo', n.memo,
                                'source', n.source, 'created_at', n.created_at,
                                'created_by_me', n.created_by = auth.uid(),
                                'from_report', n.from_report_id is not null)
        from notices n
       where n.id = (select c.notice_id from current_sign(v_store) c)),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'kind', r.kind, 'created_at', r.created_at,
               'agree_count', (select count(*) from report_agrees a where a.report_id = r.id))
             order by r.created_at desc)
        from reports r
       where r.store_id = v_store and r.status = 'pending' and r.expires_at > now()
         and r.kind <> 'seen_long_line'), '[]'::jsonb)
  );
end;
$$;

-- ── 사장님 코드 ────────────────────────────────────
-- 코드를 넣으면 이 기기가 코드의 주인이 된다. 가게가 아직 없으면 등록 화면으로 간다.
-- 틀린 코드는 기록해야 하므로 예외 대신 {ok:false, error} 를 돌려준다 (예외면 기록까지 롤백됨).
create function redeem_store_code(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_code owner_codes;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- 10분 안에 5번 틀리면 잠시 막는다
  if (select count(*) from code_attempts
       where user_id = auth.uid() and not ok and created_at > now() - interval '10 minutes') >= 5 then
    return jsonb_build_object('ok', false, 'error', 'TOO_MANY_ATTEMPTS');
  end if;

  select * into v_code from owner_codes where code = _okc_normalize_code(p_code);
  if not found then
    insert into code_attempts (user_id, ok) values (auth.uid(), false);
    return jsonb_build_object('ok', false, 'error', 'INVALID_CODE');
  end if;

  insert into code_attempts (user_id, ok) values (auth.uid(), true);
  insert into profiles (id, role) values (auth.uid(), 'owner') on conflict (id) do nothing;
  insert into owner_code_members (code_id, user_id) values (v_code.id, auth.uid())
  on conflict (code_id, user_id) do update set created_at = now();

  if v_code.store_id is not null then
    insert into store_members (store_id, user_id) values (v_code.store_id, auth.uid())
    on conflict (store_id, user_id) do update set created_at = now();
    select name into v_name from stores where id = v_code.store_id;
  end if;

  insert into events (name, store_id) values ('owner_joined', v_code.store_id);

  return jsonb_build_object('ok', true, 'store_id', v_code.store_id, 'store_name', v_name,
                            'needs_store', v_code.store_id is null);
end;
$$;

-- 전화번호를 넣으면 그 번호의 코드가 나온다. 없으면 새로 만든다. 항상 같은 번호 = 같은 코드.
-- p_store_id: 옥천신문이 먼저 등록해 둔 가게를 이 코드에 연결할 때
create function admin_issue_code(p_phone text, p_store_id uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_phone text;
  v_row owner_codes;
  v_created boolean := false;
begin
  if not okc_is_admin() or okc_is_anonymous() then
    raise exception 'NOT_ADMIN';
  end if;
  v_phone := _okc_normalize_phone(p_phone);

  select * into v_row from owner_codes where phone = v_phone;
  if not found then
    insert into owner_codes (phone, code, created_by)
    values (v_phone, _okc_new_code(), auth.uid())
    returning * into v_row;
    v_created := true;
  end if;

  if p_store_id is not null then
    if not exists (select 1 from stores where id = p_store_id) then
      raise exception 'NOT_FOUND';
    end if;
    if v_row.store_id is not null and v_row.store_id <> p_store_id then
      raise exception 'CODE_HAS_STORE';
    end if;
    if exists (select 1 from owner_codes where store_id = p_store_id and id <> v_row.id) then
      raise exception 'STORE_HAS_CODE';
    end if;
    update owner_codes set store_id = p_store_id where id = v_row.id returning * into v_row;
    insert into store_members (store_id, user_id)
    select p_store_id, m.user_id from owner_code_members m where m.code_id = v_row.id
    on conflict do nothing;
  end if;

  return jsonb_build_object('phone', v_row.phone, 'code', v_row.code, 'created', v_created,
                            'store_id', v_row.store_id,
                            'store_name', (select name from stores where id = v_row.store_id));
end;
$$;

-- 코드가 샜을 때: 새 코드로 바꾸고 연결된 기기를 모두 끊는다. 전화번호당 코드 하나는 그대로
create function admin_reissue_code(p_phone text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row owner_codes;
begin
  if not okc_is_admin() or okc_is_anonymous() then
    raise exception 'NOT_ADMIN';
  end if;
  update owner_codes set code = _okc_new_code(), created_by = auth.uid(), created_at = now()
   where phone = _okc_normalize_phone(p_phone)
  returning * into v_row;
  if v_row.id is null then
    raise exception 'NOT_FOUND';
  end if;
  delete from owner_code_members where code_id = v_row.id;
  if v_row.store_id is not null then
    delete from store_members where store_id = v_row.store_id;
  end if;
  return jsonb_build_object('phone', v_row.phone, 'code', v_row.code);
end;
$$;

create function admin_list_owner_codes()
returns table (
  phone text, code text, code_created_at timestamptz,
  store_id uuid, store_name text, member_count int
)
language sql stable security definer set search_path = public as $$
  select c.phone, c.code, c.created_at, s.id, s.name,
         (select count(*)::int from owner_code_members m where m.code_id = c.id)
    from owner_codes c
    left join stores s on s.id = c.store_id
   where okc_is_admin() and not okc_is_anonymous()
   order by c.created_at desc
$$;

-- ── 가게 등록·수정 (사장님) ────────────────────────
create function _okc_check_store_fields(p_name text, p_phone text, p_intro text, p_hours jsonb) returns void
language plpgsql immutable set search_path = public as $$
begin
  if p_name is null or btrim(p_name) = '' or char_length(btrim(p_name)) > 40 then
    raise exception 'INVALID_NAME';
  end if;
  perform _okc_normalize_phone(p_phone);
  if char_length(p_intro) > 500 then
    raise exception 'TEXT_TOO_LONG';
  end if;
  perform _okc_check_hours(p_hours);
end;
$$;

create function register_store(
  p_name text, p_phone text, p_regular_hours jsonb,
  p_category text default null, p_neighborhood text default null,
  p_intro text default null, p_address text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_code owner_codes;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  select c.* into v_code
    from owner_code_members m join owner_codes c on c.id = m.code_id
   where m.user_id = auth.uid()
   order by m.created_at desc limit 1
     for update of c;
  if v_code.id is null then
    raise exception 'NOT_OWNER';
  end if;
  if v_code.store_id is not null then
    raise exception 'ALREADY_REGISTERED';
  end if;
  perform _okc_check_store_fields(p_name, p_phone, p_intro, p_regular_hours);

  insert into stores (name, category, neighborhood, phone, intro, address, regular_hours)
  values (btrim(p_name), nullif(btrim(p_category), ''), nullif(btrim(p_neighborhood), ''),
          _okc_normalize_phone(p_phone), nullif(btrim(p_intro), ''), nullif(btrim(p_address), ''), p_regular_hours)
  returning id into v_id;

  update owner_codes set store_id = v_id where id = v_code.id;
  insert into store_members (store_id, user_id)
  select v_id, m.user_id from owner_code_members m where m.code_id = v_code.id;

  insert into events (name, store_id) values ('store_registered', v_id);
  return v_id;
end;
$$;

create function update_store_profile(
  p_store_id uuid, p_name text, p_phone text, p_regular_hours jsonb,
  p_category text default null, p_neighborhood text default null,
  p_intro text default null, p_address text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _okc_actor_source(p_store_id);
  perform _okc_check_store_fields(p_name, p_phone, p_intro, p_regular_hours);
  update stores
     set name = btrim(p_name),
         phone = _okc_normalize_phone(p_phone),
         regular_hours = p_regular_hours,
         category = nullif(btrim(p_category), ''),
         neighborhood = nullif(btrim(p_neighborhood), ''),
         intro = nullif(btrim(p_intro), ''),
         address = nullif(btrim(p_address), '')
   where id = p_store_id;
end;
$$;

-- 메뉴·갤러리를 통째로 저장한다 (화면에 보이는 그대로)
-- p_menus: [{name, price, photo_url}]  p_photos: [{category, url}]
create function save_store_media(p_store_id uuid, p_menus jsonb, p_photos jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  e jsonb;
  i int := 0;
begin
  perform _okc_actor_source(p_store_id);
  if jsonb_typeof(p_menus) <> 'array' or jsonb_typeof(p_photos) <> 'array'
     or jsonb_array_length(p_menus) > 20 or jsonb_array_length(p_photos) > 60 then
    raise exception 'TOO_MANY_ITEMS';
  end if;

  delete from store_menus where store_id = p_store_id;
  for e in select * from jsonb_array_elements(p_menus) loop
    perform _okc_check_media_url(p_store_id, e ->> 'photo_url');
    if btrim(coalesce(e ->> 'name', '')) = '' then
      raise exception 'INVALID_MENU';
    end if;
    insert into store_menus (store_id, name, price, photo_url, sort)
    values (p_store_id, btrim(e ->> 'name'), (e ->> 'price')::int, e ->> 'photo_url', i);
    i := i + 1;
  end loop;

  i := 0;
  delete from store_photos where store_id = p_store_id;
  for e in select * from jsonb_array_elements(p_photos) loop
    if e ->> 'url' is null then
      raise exception 'INVALID_PHOTO';
    end if;
    perform _okc_check_media_url(p_store_id, e ->> 'url');
    insert into store_photos (store_id, category, url, sort)
    values (p_store_id, e ->> 'category', e ->> 'url', i);
    i := i + 1;
  end loop;
end;
$$;

-- ── 소식·공지 (페이스북처럼 수정·삭제 가능) ────────
-- p_post_id 가 없으면 새 글
create function save_store_post(
  p_store_id uuid, p_body text, p_kind text default 'news',
  p_image_url text default null, p_post_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_source notice_source;
  v_id uuid;
begin
  v_source := _okc_actor_source(p_store_id);
  if btrim(coalesce(p_body, '')) = '' or char_length(btrim(p_body)) > 500 then
    raise exception 'INVALID_BODY';
  end if;
  if p_kind not in ('news', 'notice') then
    raise exception 'INVALID_BODY';
  end if;
  perform _okc_check_media_url(p_store_id, p_image_url);
  insert into profiles (id) values (auth.uid()) on conflict do nothing;

  if p_post_id is null then
    insert into store_posts (store_id, kind, body, image_url, source, created_by)
    values (p_store_id, p_kind, btrim(p_body), p_image_url, v_source, auth.uid())
    returning id into v_id;
    insert into events (name, store_id, props) values ('post_created', p_store_id, jsonb_build_object('kind', p_kind));
  else
    update store_posts
       set kind = p_kind, body = btrim(p_body), image_url = p_image_url, updated_at = now()
     where id = p_post_id and store_id = p_store_id and deleted_at is null
    returning id into v_id;
    if v_id is null then
      raise exception 'NOT_FOUND';
    end if;
  end if;
  return v_id;
end;
$$;

create function delete_store_post(p_post_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_store uuid;
begin
  select store_id into v_store from store_posts where id = p_post_id and deleted_at is null;
  if v_store is null then
    raise exception 'NOT_FOUND';
  end if;
  perform _okc_actor_source(v_store);
  update store_posts set deleted_at = now() where id = p_post_id;
end;
$$;

-- 공감 (p_on = false 면 취소). 바뀐 수를 돌려준다
create function toggle_post_like(p_post_id uuid, p_on boolean default true) returns int
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not exists (select 1 from store_posts where id = p_post_id and deleted_at is null) then
    raise exception 'NOT_FOUND';
  end if;
  if p_on then
    insert into post_likes (post_id, user_id) values (p_post_id, auth.uid()) on conflict do nothing;
  else
    delete from post_likes where post_id = p_post_id and user_id = auth.uid();
  end if;
  return (select count(*)::int from post_likes where post_id = p_post_id);
end;
$$;

-- ── 주민 댓글 ──────────────────────────────────────
-- 작성자 id 는 어떤 응답에도 내보내지 않는다. 도배 방지: 30초에 1개, 하루 30개
create function post_store_comment(p_store_id uuid, p_body text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not exists (select 1 from stores where id = p_store_id) then
    raise exception 'NOT_FOUND';
  end if;
  if btrim(coalesce(p_body, '')) = '' or char_length(btrim(p_body)) > 200 then
    raise exception 'INVALID_BODY';
  end if;
  if exists (select 1 from store_comments where author_id = auth.uid() and created_at > now() - interval '30 seconds')
     or (select count(*) from store_comments where author_id = auth.uid() and created_at > now() - interval '1 day') >= 30 then
    raise exception 'COMMENT_TOO_FAST';
  end if;
  insert into store_comments (store_id, author_id, body)
  values (p_store_id, auth.uid(), btrim(p_body))
  returning id into v_id;
  return v_id;
end;
$$;

-- 쓴 사람·그 가게 사장님·옥천신문이 지울 수 있다
create function delete_store_comment(p_comment_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  c store_comments;
begin
  select * into c from store_comments where id = p_comment_id and deleted_at is null;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if c.author_id is distinct from auth.uid() then
    perform _okc_actor_source(c.store_id);
  end if;
  update store_comments set deleted_at = now() where id = c.id;
end;
$$;

-- ── 임시휴무 ───────────────────────────────────────
create function set_temp_closure(p_store_id uuid, p_start date, p_end date, p_reason text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_source notice_source;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_id uuid;
begin
  v_source := _okc_actor_source(p_store_id);
  if p_start is null or p_end is null or p_start < v_today or p_end < p_start or p_end > p_start + 90 then
    raise exception 'INVALID_DATES';
  end if;
  if char_length(p_reason) > 200 then
    raise exception 'TEXT_TOO_LONG';
  end if;
  if exists (select 1 from temp_closures
              where store_id = p_store_id and canceled_at is null
                and start_date <= p_end and end_date >= p_start) then
    raise exception 'CLOSURE_OVERLAP';
  end if;
  insert into profiles (id) values (auth.uid()) on conflict do nothing;
  insert into temp_closures (store_id, start_date, end_date, reason, source, created_by)
  values (p_store_id, p_start, p_end, nullif(btrim(p_reason), ''), v_source, auth.uid())
  returning id into v_id;
  insert into events (name, store_id, props)
  values ('closure_created', p_store_id, jsonb_build_object('source', v_source, 'days', p_end - p_start + 1));
  return v_id;
end;
$$;

create function cancel_temp_closure(p_closure_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  c temp_closures;
begin
  select * into c from temp_closures where id = p_closure_id and canceled_at is null;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  perform _okc_actor_source(c.store_id);
  update temp_closures set canceled_at = now() where id = c.id;
end;
$$;

-- ── 옥천신문: 게시물 관리 ──────────────────────────
create function admin_list_content() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not okc_is_admin() or okc_is_anonymous() then null else jsonb_build_object(
    'posts', coalesce((
      select jsonb_agg(x.j order by x.created_at desc) from (
        select p.created_at, jsonb_build_object('id', p.id, 'store_id', s.id, 'store_name', s.name, 'kind', p.kind,
                 'body', p.body, 'image_url', p.image_url, 'created_at', p.created_at) as j
          from store_posts p join stores s on s.id = p.store_id
         where p.deleted_at is null order by p.created_at desc limit 50) x
    ), '[]'::jsonb),
    'comments', coalesce((
      select jsonb_agg(x.j order by x.created_at desc) from (
        select c.created_at, jsonb_build_object('id', c.id, 'store_id', s.id, 'store_name', s.name,
                 'body', c.body, 'created_at', c.created_at) as j
          from store_comments c join stores s on s.id = c.store_id
         where c.deleted_at is null order by c.created_at desc limit 50) x
    ), '[]'::jsonb)
  ) end
$$;

-- ── 권한 ───────────────────────────────────────────
-- 내부 함수는 아무도 직접 못 부른다. 쓰기·관리자 RPC 는 로그인(익명 포함)한 사람만.
revoke execute on function _okc_normalize_phone(text) from public, anon, authenticated;
revoke execute on function _okc_normalize_code(text) from public, anon, authenticated;
revoke execute on function _okc_new_code() from public, anon, authenticated;
revoke execute on function _okc_check_hours(jsonb) from public, anon, authenticated;
revoke execute on function _okc_check_media_url(uuid, text) from public, anon, authenticated;
revoke execute on function _okc_check_store_fields(text, text, text, jsonb) from public, anon, authenticated;

do $$
declare
  f text;
  write_fns text[] := array[
    'redeem_store_code(text)',
    'admin_issue_code(text, uuid)',
    'admin_reissue_code(text)',
    'admin_list_owner_codes()',
    'admin_list_content()',
    'register_store(text, text, jsonb, text, text, text, text)',
    'update_store_profile(uuid, text, text, jsonb, text, text, text, text)',
    'save_store_media(uuid, jsonb, jsonb)',
    'save_store_post(uuid, text, text, text, uuid)',
    'delete_store_post(uuid)',
    'toggle_post_like(uuid, boolean)',
    'post_store_comment(uuid, text)',
    'delete_store_comment(uuid)',
    'set_temp_closure(uuid, date, date, text)',
    'cancel_temp_closure(uuid)'
  ];
begin
  foreach f in array write_fns loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end;
$$;
