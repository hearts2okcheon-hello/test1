-- 내 정보(프로필) · 가게 번호 · 외출 중 · 사장님 캘린더 (ADR-014)

-- ── 1. 내 정보 ───────────────────────────────────────
-- 이름은 display_name, 전화번호는 phone 을 그대로 쓴다
alter table profiles
  add column area text check (char_length(area) <= 20),
  add column avatar_url text,
  add column registered_at timestamptz,
  add column store_notice_ack_at timestamptz;

-- 프로필 사진은 store-media/avatars/<내 id>/ 아래에만
create policy "내 프로필 사진 올리기" on storage.objects for insert to authenticated
  with check (bucket_id = 'store-media' and (storage.foldername(name))[1] = 'avatars'
              and (storage.foldername(name))[2] = auth.uid()::text and not okc_is_anonymous());
create policy "내 프로필 사진 확인" on storage.objects for select to authenticated
  using (bucket_id = 'store-media' and (storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text);
create policy "내 프로필 사진 지우기" on storage.objects for delete to authenticated
  using (bucket_id = 'store-media' and (storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text);

create function save_my_profile(p_name text, p_area text, p_phone text, p_avatar_url text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_area text := btrim(coalesce(p_area, ''));
  v_phone text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if okc_is_anonymous() then
    raise exception 'LOGIN_REQUIRED';
  end if;
  if v_name = '' or char_length(v_name) > 20 then
    raise exception 'INVALID_MY_NAME';
  end if;
  if v_area = '' or char_length(v_area) > 20 then
    raise exception 'INVALID_AREA';
  end if;
  v_phone := _okc_normalize_phone(p_phone);
  if p_avatar_url is not null
     and position('/storage/v1/object/public/store-media/avatars/' || auth.uid()::text || '/' in p_avatar_url) = 0 then
    raise exception 'INVALID_PHOTO';
  end if;
  insert into profiles (id, display_name, area, phone, avatar_url, registered_at)
  values (auth.uid(), v_name, v_area, v_phone, p_avatar_url, now())
  on conflict (id) do update
    set display_name = excluded.display_name, area = excluded.area, phone = excluded.phone,
        avatar_url = excluded.avatar_url, registered_at = coalesce(profiles.registered_at, now());
end;
$$;

-- "가게 등록 시 연락이 가요" 안내를 확인했다 (다시 띄우지 않는다)
create function ack_store_notice() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or okc_is_anonymous() then
    raise exception 'LOGIN_REQUIRED';
  end if;
  insert into profiles (id, store_notice_ack_at) values (auth.uid(), now())
  on conflict (id) do update set store_notice_ack_at = coalesce(profiles.store_notice_ack_at, now());
end;
$$;

create or replace function get_owner_home() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_store uuid;
  v_code owner_codes;
  v_profile jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('state', 'no_store', 'is_admin', false, 'signed_in', false);
  end if;

  select jsonb_build_object('name', p.display_name, 'area', p.area, 'phone', p.phone, 'avatar_url', p.avatar_url,
                            'registered', p.registered_at is not null, 'store_ack', p.store_notice_ack_at is not null)
    into v_profile from profiles p where p.id = auth.uid();
  v_profile := coalesce(v_profile, jsonb_build_object('name', null, 'area', null, 'phone', null, 'avatar_url', null,
                                                      'registered', false, 'store_ack', false));

  select c.* into v_code
    from owner_code_members m join owner_codes c on c.id = m.code_id
   where m.user_id = auth.uid()
   order by m.created_at desc limit 1;

  if v_code.id is not null and v_code.store_id is null then
    return jsonb_build_object('state', 'needs_store', 'is_admin', okc_is_admin(),
                              'code', v_code.code, 'phone', v_code.phone, 'profile', v_profile);
  end if;

  select store_id into v_store from store_members where user_id = auth.uid() order by created_at desc limit 1;

  if v_store is null then
    if not okc_is_anonymous() and not okc_is_admin() then
      return jsonb_build_object('state', 'needs_store', 'is_admin', false, 'code', null, 'phone', null, 'profile', v_profile);
    end if;
    return jsonb_build_object('state', 'no_store', 'is_admin', okc_is_admin(), 'signed_in', not okc_is_anonymous());
  end if;

  return jsonb_build_object(
    'state', 'owner',
    'is_admin', okc_is_admin(),
    'profile', v_profile,
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

-- ── 2. 가게 번호(선택)와 공개 여부 ───────────────────────
-- 새 칸은 표 직접 읽기 권한이 없다 (20261109010000 에서 칸별로만 허용). get_store_detail 로만 준다
alter table stores
  add column store_phone text check (store_phone ~ '^0[0-9]{8,10}$'),
  add column store_phone_public boolean not null default false;

drop function register_store(text, text, jsonb, text, text, text, text, boolean);
create function register_store(
  p_name text, p_phone text, p_regular_hours jsonb, p_category text default null, p_neighborhood text default null,
  p_intro text default null, p_address text default null, p_phone_public boolean default false,
  p_store_phone text default null, p_store_phone_public boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_code owner_codes;
  v_id uuid;
  v_store_phone text := case when btrim(coalesce(p_store_phone, '')) = '' then null else _okc_normalize_phone(p_store_phone) end;
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
    if okc_is_anonymous() then
      raise exception 'LOGIN_REQUIRED';
    end if;
    if exists (select 1 from store_members where user_id = auth.uid()) then
      raise exception 'ALREADY_REGISTERED';
    end if;
  elsif v_code.store_id is not null then
    raise exception 'ALREADY_REGISTERED';
  end if;
  perform _okc_check_store_fields(p_name, p_phone, p_intro, p_regular_hours);

  insert into stores (name, category, neighborhood, phone, phone_public, store_phone, store_phone_public, intro, address, regular_hours)
  values (btrim(p_name), nullif(btrim(p_category), ''), nullif(btrim(p_neighborhood), ''),
          _okc_normalize_phone(p_phone), coalesce(p_phone_public, false),
          v_store_phone, v_store_phone is not null and coalesce(p_store_phone_public, false),
          nullif(btrim(p_intro), ''), nullif(btrim(p_address), ''), p_regular_hours)
  returning id into v_id;

  insert into profiles (id, role) values (auth.uid(), 'owner') on conflict (id) do nothing;
  if v_code.id is not null then
    update owner_codes set store_id = v_id where id = v_code.id;
    insert into store_members (store_id, user_id)
    select v_id, m.user_id from owner_code_members m where m.code_id = v_code.id;
  else
    insert into store_members (store_id, user_id) values (v_id, auth.uid());
  end if;

  insert into events (name, store_id) values ('store_registered', v_id);
  return v_id;
end;
$$;

drop function update_store_profile(uuid, text, text, jsonb, text, text, text, text, boolean);
create function update_store_profile(
  p_store_id uuid, p_name text, p_phone text, p_regular_hours jsonb, p_category text default null, p_neighborhood text default null,
  p_intro text default null, p_address text default null, p_phone_public boolean default null,
  p_store_phone text default null, p_store_phone_public boolean default false
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_store_phone text := case when btrim(coalesce(p_store_phone, '')) = '' then null else _okc_normalize_phone(p_store_phone) end;
begin
  perform _okc_actor_source(p_store_id);
  perform _okc_check_store_fields(p_name, p_phone, p_intro, p_regular_hours);
  update stores
     set name = btrim(p_name),
         phone = _okc_normalize_phone(p_phone),
         phone_public = coalesce(p_phone_public, phone_public),
         store_phone = v_store_phone,
         store_phone_public = v_store_phone is not null and coalesce(p_store_phone_public, false),
         regular_hours = p_regular_hours,
         category = nullif(btrim(p_category), ''),
         neighborhood = nullif(btrim(p_neighborhood), ''),
         intro = nullif(btrim(p_intro), ''),
         address = nullif(btrim(p_address), '')
   where id = p_store_id;
end;
$$;

-- ── 3. 외출 중 ───────────────────────────────────────
-- 돌아오는 시각을 고르면 그 시각에 공지가 끝난다 (늦게 열어요와 같다)
create or replace function _okc_insert_notice(
  p_store_id uuid, p_kind notice_kind, p_at_time time, p_memo text,
  p_source notice_source, p_by uuid, p_from_report_id uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := gen_random_uuid();
  v_expires timestamptz;
begin
  if p_kind in ('late_open', 'out') and p_at_time is not null then
    v_expires := ((now() at time zone 'Asia/Seoul')::date + p_at_time) at time zone 'Asia/Seoul';
    if v_expires <= now() then
      raise exception 'INVALID_TIME';
    end if;
  else
    v_expires := okc_next_midnight();
  end if;

  insert into profiles (id) values (p_by) on conflict do nothing;

  update notices set ended_at = now(), replaced_by = v_id
   where store_id = p_store_id and okc_notice_valid(ended_at, expires_at);

  insert into notices (id, store_id, kind, at_time, memo, source, created_by, from_report_id, expires_at)
  values (v_id, p_store_id, p_kind, p_at_time, nullif(btrim(p_memo), ''), p_source, p_by, p_from_report_id, v_expires);

  insert into events (name, store_id, props)
  values ('notice_created', p_store_id,
          jsonb_build_object('kind', p_kind, 'source', p_source, 'from_report', p_from_report_id is not null));

  return v_id;
end;
$$;

create or replace function post_notice(p_store_id uuid, p_kind notice_kind, p_at_time time default null, p_memo text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_source notice_source;
begin
  v_source := _okc_actor_source(p_store_id);
  if p_memo is not null and char_length(p_memo) > 40 then
    raise exception 'MEMO_TOO_LONG';
  end if;
  if p_at_time is not null and p_kind not in ('late_open', 'early_close', 'out') then
    raise exception 'INVALID_TIME';
  end if;
  return _okc_insert_notice(p_store_id, p_kind, p_at_time, p_memo, v_source, auth.uid(), null);
end;
$$;

-- ── 4. 사장님 캘린더: 날짜별 늦게 열기 · 일찍 닫기 · 외출 ─────
-- 그날 휴무는 임시휴무(temp_closures)에 하루짜리로 넣는다 (팻말·알림 규칙을 그대로 쓴다)
create table store_day_plans (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('late_open', 'early_close', 'out')),
  start_time time,
  end_time time,
  note text check (char_length(note) <= 40),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (store_id, day, kind),
  check ((kind = 'late_open' and start_time is not null and end_time is null)
      or (kind = 'early_close' and start_time is null and end_time is not null)
      or (kind = 'out' and start_time is not null and end_time is not null and start_time < end_time))
);
create index store_day_plans_store_day on store_day_plans (store_id, day);
alter table store_day_plans enable row level security;
revoke all on store_day_plans from public, anon, authenticated;

-- p_kind: closed(휴무) | late_open(p_start 에 열어요) | early_close(p_end 에 닫아요) | out(p_start~p_end 외출)
create function set_day_plan(p_store_id uuid, p_day date, p_kind text, p_start time default null, p_end time default null, p_note text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_note text := nullif(btrim(p_note), '');
  v_closed boolean;
  v_id uuid;
begin
  perform _okc_actor_source(p_store_id);
  if p_day is null or p_day < v_today or p_day > (v_today + interval '1 month')::date then
    raise exception 'INVALID_DATES';
  end if;
  if char_length(v_note) > 40 then
    raise exception 'MEMO_TOO_LONG';
  end if;
  v_closed := exists (select 1 from temp_closures c
                       where c.store_id = p_store_id and c.canceled_at is null and p_day between c.start_date and c.end_date);

  if p_kind = 'closed' then
    if v_closed then
      raise exception 'CLOSURE_OVERLAP';
    end if;
    delete from store_day_plans where store_id = p_store_id and day = p_day;
    return set_temp_closure(p_store_id, p_day, p_day, v_note);
  end if;

  if v_closed then
    raise exception 'DAY_CLOSED';
  end if;
  if p_kind = 'late_open' then
    if p_start is null then raise exception 'INVALID_TIME'; end if;
    p_end := null;
  elsif p_kind = 'early_close' then
    if p_end is null then raise exception 'INVALID_TIME'; end if;
    p_start := null;
  elsif p_kind = 'out' then
    if p_start is null or p_end is null or p_start >= p_end then raise exception 'INVALID_TIME'; end if;
  else
    raise exception 'INVALID_KIND';
  end if;

  insert into store_day_plans (store_id, day, kind, start_time, end_time, note, created_by)
  values (p_store_id, p_day, p_kind, p_start, p_end, v_note, auth.uid())
  on conflict (store_id, day, kind) do update
    set start_time = excluded.start_time, end_time = excluded.end_time, note = excluded.note,
        created_by = excluded.created_by, created_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

create function clear_day_plan(p_plan_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_store uuid;
begin
  select store_id into v_store from store_day_plans where id = p_plan_id;
  if v_store is null then
    raise exception 'NOT_FOUND';
  end if;
  perform _okc_actor_source(v_store);
  delete from store_day_plans where id = p_plan_id;
end;
$$;

-- 영업 상태 (한 곳에서만 계산). 외출 중 공지와 오늘의 캘린더 일정을 반영한다
create or replace function okc_schedule_status(p_store_id uuid) returns table (status text, basis text)
language plpgsql stable security definer set search_path = public as $$
declare
  c record;
  v_hours jsonb;
  v_now timestamp := now() at time zone 'Asia/Seoul';
  v_time time := v_now::time;
  v_today text := lower(to_char(v_now, 'Dy'));
  v_yesterday text := lower(to_char(v_now - interval '1 day', 'Dy'));
  r jsonb;
  a time;
  b time;
  v_has_today boolean := false;
  v_late time;
  v_early time;
  v_out boolean;
begin
  select * into c from current_sign(p_store_id);
  if c.sign in ('temp_closed', 'closed_today') then
    return query select 'temp_closed'::text, 'notice'::text; return;
  elsif c.sign = 'open' then
    return query select 'open'::text, 'notice'::text; return;
  elsif c.sign in ('late_open', 'sold_out', 'out') then
    return query select 'closed'::text, 'notice'::text; return;
  elsif c.sign = 'early_close' and c.at_time is not null and v_time >= c.at_time then
    return query select 'closed'::text, 'notice'::text; return;
  end if;

  select regular_hours into v_hours from stores where id = p_store_id;
  if v_hours is null or not (v_hours ? v_today) then
    return query select 'unknown'::text, 'hours'::text; return;
  end if;

  select max(p.start_time) filter (where p.kind = 'late_open'),
         min(p.end_time) filter (where p.kind = 'early_close'),
         coalesce(bool_or(p.kind = 'out' and v_time >= p.start_time and v_time < p.end_time), false)
    into v_late, v_early, v_out
    from store_day_plans p where p.store_id = p_store_id and p.day = v_now::date;

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
      a := greatest((r ->> 0)::time, coalesce(v_late, (r ->> 0)::time));
      b := (r ->> 1)::time;
      if (r ->> 0)::time < b then
        b := least(b, coalesce(v_early, b));
        if v_time >= a and v_time < b and not v_out then
          return query select 'open'::text, 'hours'::text; return;
        end if;
      elsif v_time >= a and (v_early is null or v_time < v_early) and not v_out then
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
