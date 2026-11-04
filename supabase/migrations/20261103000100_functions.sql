-- 옥!소리 RPC (design.md §3, §6)
-- 팻말 규칙과 만료 계산은 여기에만 있다. 화면 코드에서 다시 추론하지 않는다. (ADR-001, ADR-004)
-- 에러는 raise exception '<코드>' 로 던지고, 프론트는 lib/errors.ts 에서 한국어 문구로 바꾼다.

-- ── 시각 도우미 (Asia/Seoul) ─────────────────────────
-- "당일 자정" = 다음 날 00:00(Asia/Seoul). 23:59:59 유효, 00:00:00 만료 (design §3.1)
create or replace function okc_today_start() returns timestamptz
language sql stable as $$
  select ((now() at time zone 'Asia/Seoul')::date)::timestamp at time zone 'Asia/Seoul'
$$;

create or replace function okc_next_midnight() returns timestamptz
language sql stable as $$
  select ((now() at time zone 'Asia/Seoul')::date + 1)::timestamp at time zone 'Asia/Seoul'
$$;

-- 공지가 지금 유효한가. 만료 판단은 이 함수 하나로만 한다
create or replace function okc_notice_valid(p_ended_at timestamptz, p_expires_at timestamptz) returns boolean
language sql stable as $$
  select p_ended_at is null and p_expires_at > now()
$$;

create or replace function okc_is_anonymous() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
$$;

-- 제보에 사장님이 "네"라고 답하면 생기는 공지
create or replace function okc_report_to_notice(p_kind report_kind) returns notice_kind
language sql immutable as $$
  select case p_kind
    when 'seen_closed' then 'closed_today'::notice_kind
    when 'seen_open' then 'open'::notice_kind
    when 'seen_sold_out' then 'sold_out'::notice_kind
  end
$$;

-- "아니요"라고 답하면 생기는 공지 (아니요, 열었어요 / 아니요, 쉬어요 / 아니요, 있어요)
create or replace function okc_report_to_notice_no(p_kind report_kind) returns notice_kind
language sql immutable as $$
  select case p_kind
    when 'seen_closed' then 'open'::notice_kind
    when 'seen_open' then 'closed_today'::notice_kind
    when 'seen_sold_out' then 'open'::notice_kind
  end
$$;

-- ── 내부: 호출자가 이 가게에 공지할 수 있는가 → 출처 ──
create or replace function _okc_actor_source(p_store_id uuid) returns notice_source
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or okc_is_anonymous() then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if exists (select 1 from stores where id = p_store_id and owner_id = auth.uid()) then
    return 'owner';
  end if;
  if okc_is_admin() then
    return 'okcheon';
  end if;
  raise exception 'NOT_OWNER';
end;
$$;

-- ── 내부: 공지 생성 (기존 유효 공지 종료 + 만료 계산) ──
create or replace function _okc_insert_notice(
  p_store_id uuid, p_kind notice_kind, p_at_time time, p_memo text,
  p_source notice_source, p_by uuid, p_from_report_id uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := gen_random_uuid();
  v_expires timestamptz;
begin
  if p_kind = 'late_open' and p_at_time is not null then
    -- 늦게 열어요(○시)는 오픈 시각이 되면 끝난다
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

revoke execute on function _okc_actor_source(uuid) from public, anon, authenticated;
revoke execute on function _okc_insert_notice(uuid, notice_kind, time, text, notice_source, uuid, uuid) from public, anon, authenticated;

-- ── 팻말 규칙 (design §3.3) — 이 함수 하나에만 있다 ──────
-- 1) 유효한 최신 공지  2) 유효한 확인 대기 제보 → checking  3) none
create or replace function current_sign(p_store_id uuid)
returns table (
  sign text, source text, at_time time, memo text, signed_at timestamptz,
  notice_id uuid, report_kind text, agree_count int
)
language sql stable security definer set search_path = public as $$
  select coalesce(n.kind::text, case when r.id is not null then 'checking' end, 'none'),
         coalesce(n.source::text, case when r.id is not null then 'neighbor' end),
         n.at_time, n.memo,
         coalesce(n.created_at, r.created_at),
         n.id,
         r.kind::text,
         coalesce(r.agrees, 0)
    from (select 1) as one
    left join lateral (
      select x.id, x.kind, x.source, x.at_time, x.memo, x.created_at
        from notices x
       where x.store_id = p_store_id and okc_notice_valid(x.ended_at, x.expires_at)
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
    ) r on n.id is null
$$;

-- ── 읽기: 가게별 지금 팻말 ──────────────────────────
create or replace function get_store_signs(p_category text default null)
returns table (
  store_id uuid, name text, category text, address text, regular_hours jsonb,
  sign text, source text, at_time time, memo text, signed_at timestamptz,
  notice_id uuid, report_kind text, agree_count int
)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.category, s.address, s.regular_hours,
         c.sign, c.source, c.at_time, c.memo, c.signed_at, c.notice_id, c.report_kind, c.agree_count
    from stores s
    cross join lateral current_sign(s.id) c
   where p_category is null or s.category = p_category
   order by (c.sign = 'none'), c.signed_at desc nulls last, s.name
$$;

-- ── 읽기: 가게 상세 ────────────────────────────────
create or replace function get_store_detail(p_store_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not exists (select 1 from stores where id = p_store_id) then null else
    jsonb_build_object(
      'store', (select to_jsonb(t) from get_store_signs() t where t.store_id = p_store_id),
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
      ), '[]'::jsonb)
    )
  end
$$;

-- ── 읽기: 오늘의 마을방송 피드 ─────────────────────
-- is_current = 이 공지가 지금 그 가게의 팻말인가 (current_sign 과 같은 기준, T-SIGN-20)
create or replace function get_today_feed(p_limit int default 20)
returns table (
  notice_id uuid, store_id uuid, store_name text, kind text, at_time time,
  memo text, source text, created_at timestamptz, is_current boolean
)
language sql stable security definer set search_path = public as $$
  select n.id, s.id, s.name, n.kind::text, n.at_time, n.memo, n.source::text, n.created_at,
         coalesce(n.id = c.notice_id, false)
    from notices n
    join stores s on s.id = n.store_id
    cross join lateral current_sign(n.store_id) c
   where n.created_at >= okc_today_start()
   order by n.created_at desc
   limit greatest(1, least(p_limit, 50))
$$;

-- ── 쓰기: 사장님·옥천신문 공지 ─────────────────────
create or replace function post_notice(
  p_store_id uuid, p_kind notice_kind, p_at_time time default null, p_memo text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_source notice_source;
begin
  v_source := _okc_actor_source(p_store_id);
  if p_memo is not null and char_length(p_memo) > 40 then
    raise exception 'MEMO_TOO_LONG';
  end if;
  if p_at_time is not null and p_kind not in ('late_open', 'early_close') then
    raise exception 'INVALID_TIME';
  end if;
  return _okc_insert_notice(p_store_id, p_kind, p_at_time, p_memo, v_source, auth.uid(), null);
end;
$$;

create or replace function set_notice_memo(p_notice_id uuid, p_memo text) returns void
language plpgsql security definer set search_path = public as $$
declare
  n notices;
begin
  select * into n from notices where id = p_notice_id;
  if not found or not okc_notice_valid(n.ended_at, n.expires_at) then
    raise exception 'NOT_FOUND';
  end if;
  perform _okc_actor_source(n.store_id);
  if p_memo is not null and char_length(p_memo) > 40 then
    raise exception 'MEMO_TOO_LONG';
  end if;
  update notices set memo = nullif(btrim(p_memo), '') where id = n.id;
end;
$$;

-- 공지 직후 5분 안에만. 밀려난 이전 공지를 되살린다.
create or replace function undo_notice(p_notice_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  n notices;
begin
  select * into n from notices where id = p_notice_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if n.created_by is distinct from auth.uid() then
    raise exception 'NOT_OWNER';
  end if;
  if n.created_at < now() - interval '5 minutes' then
    raise exception 'UNDO_WINDOW_PASSED';
  end if;
  if n.from_report_id is not null or n.ended_at is not null then
    raise exception 'UNDO_NOT_ALLOWED';
  end if;
  update notices set ended_at = null, replaced_by = null
   where replaced_by = n.id and expires_at > now();
  delete from notices where id = n.id;
end;
$$;

create or replace function end_notice(p_notice_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  n notices;
begin
  select * into n from notices where id = p_notice_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  perform _okc_actor_source(n.store_id);
  update notices set ended_at = now() where id = n.id and ended_at is null;
end;
$$;

-- ── 쓰기: 이웃 제보 (익명 로그인 포함) ──────────────
create or replace function post_report(p_store_id uuid, p_kind report_kind) returns uuid
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
  if exists (select 1 from reports
              where store_id = p_store_id and reporter_id = auth.uid()
                and created_at > now() - interval '30 minutes') then
    raise exception 'DUPLICATE_REPORT';
  end if;

  insert into reports (store_id, kind, reporter_id, expires_at)
  values (p_store_id, p_kind, auth.uid(),
          now() + case when p_kind = 'seen_long_line' then interval '1 hour' else interval '3 hours' end)
  returning id into v_id;

  insert into events (name, store_id, props)
  values ('report_created', p_store_id, jsonb_build_object('kind', p_kind));

  return v_id;
end;
$$;

-- 나도 봤어요 (p_on = false 면 취소). 바뀐 동의 수를 돌려준다.
create or replace function agree_report(p_report_id uuid, p_on boolean default true) returns int
language plpgsql security definer set search_path = public as $$
declare
  r reports;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  select * into r from reports where id = p_report_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if r.status <> 'pending' or r.expires_at <= now() then
    raise exception 'ALREADY_RESOLVED';
  end if;
  if r.reporter_id = auth.uid() then
    raise exception 'OWN_REPORT';
  end if;

  if p_on then
    insert into report_agrees (report_id, user_id) values (r.id, auth.uid()) on conflict do nothing;
  else
    delete from report_agrees where report_id = r.id and user_id = auth.uid();
  end if;

  return (select count(*)::int from report_agrees where report_id = r.id);
end;
$$;

-- ── 쓰기: 제보 확인 (사장님 → 출처 owner, 옥천신문 → okcheon) ──
create or replace function answer_report(p_report_id uuid, p_yes boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  r reports;
  v_source notice_source;
  v_kind notice_kind;
begin
  select * into r from reports where id = p_report_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  v_source := _okc_actor_source(r.store_id);
  if r.status <> 'pending' or r.expires_at <= now() then
    raise exception 'ALREADY_RESOLVED';
  end if;

  v_kind := case when p_yes then okc_report_to_notice(r.kind) else okc_report_to_notice_no(r.kind) end;
  if v_kind is null then
    raise exception 'NO_QUESTION';
  end if;

  perform _okc_insert_notice(r.store_id, v_kind, null, null, v_source, auth.uid(), r.id);

  update reports
     set status = (case when p_yes then 'confirmed' else 'rejected' end)::report_status,
         resolved_by = auth.uid(), resolved_source = v_source, resolved_at = now()
   where id = r.id;

  insert into events (name, store_id, props)
  values ('confirm_answered', r.store_id,
          jsonb_build_object('yes', p_yes, 'source', v_source,
                             'minutes', round(extract(epoch from now() - r.created_at) / 60)));
end;
$$;

-- ── 사장님 홈 ─────────────────────────────────────
create or replace function get_owner_home() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_store uuid;
  v_claim text;
begin
  if auth.uid() is null or okc_is_anonymous() then
    return jsonb_build_object('state', 'signed_out');
  end if;

  select id into v_store from stores where owner_id = auth.uid() order by created_at limit 1;

  if v_store is null then
    select s.name into v_claim
      from store_claims c join stores s on s.id = c.store_id
     where c.user_id = auth.uid() and c.status = 'requested'
     order by c.created_at desc limit 1;
    return jsonb_build_object(
      'state', case when v_claim is null then 'no_store' else 'claim_pending' end,
      'claim_store_name', v_claim,
      'is_admin', okc_is_admin());
  end if;

  return jsonb_build_object(
    'state', 'owner',
    'is_admin', okc_is_admin(),
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

-- ── 가게 인증 ─────────────────────────────────────
create or replace function request_claim(p_store_id uuid, p_phone text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_meta jsonb := auth.jwt() -> 'user_metadata';
begin
  if auth.uid() is null or okc_is_anonymous() then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not exists (select 1 from stores where id = p_store_id) then
    raise exception 'NOT_FOUND';
  end if;

  insert into profiles (id, display_name, phone)
  values (auth.uid(),
          coalesce(v_meta ->> 'full_name', v_meta ->> 'name', v_meta ->> 'nickname', auth.jwt() ->> 'email'),
          nullif(btrim(p_phone), ''))
  on conflict (id) do update
     set phone = coalesce(excluded.phone, profiles.phone),
         display_name = coalesce(profiles.display_name, excluded.display_name);

  -- MVP: 1인 1가게 (2번째 가게는 옥천신문이 수동 처리)
  if exists (select 1 from stores where owner_id = auth.uid()) then
    raise exception 'ALREADY_OWNER';
  end if;
  if exists (select 1 from store_claims where user_id = auth.uid() and status = 'requested') then
    raise exception 'CLAIM_PENDING';
  end if;

  insert into store_claims (store_id, user_id) values (p_store_id, auth.uid()) returning id into v_id;
  return v_id;
end;
$$;

create or replace function review_claim(p_claim_id uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  c store_claims;
begin
  if not okc_is_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  select * into c from store_claims where id = p_claim_id for update;
  if not found or c.status <> 'requested' then
    raise exception 'ALREADY_RESOLVED';
  end if;

  update store_claims
     set status = (case when p_approve then 'approved' else 'rejected' end)::claim_status,
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = c.id;

  if p_approve then
    update stores set owner_id = c.user_id where id = c.store_id;
    -- 같은 가게의 다른 요청은 정리
    update store_claims set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
     where store_id = c.store_id and status = 'requested' and id <> c.id;
  end if;
end;
$$;

-- ── 옥천신문 관리자 ────────────────────────────────
-- 가게 등록·수정. p_store_id 가 없으면 새로 등록 (T-ADMIN-04~06)
create or replace function admin_upsert_store(
  p_name text,
  p_category text default null,
  p_address text default null,
  p_regular_hours jsonb default null,
  p_is_pilot boolean default true,
  p_store_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if not okc_is_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  if p_name is null or btrim(p_name) = '' then
    raise exception 'INVALID_NAME';
  end if;

  if p_store_id is null then
    insert into stores (name, category, address, regular_hours, is_pilot)
    values (btrim(p_name), nullif(btrim(p_category), ''), nullif(btrim(p_address), ''),
            p_regular_hours, coalesce(p_is_pilot, true))
    returning id into v_id;
  else
    update stores
       set name = btrim(p_name),
           category = nullif(btrim(p_category), ''),
           address = nullif(btrim(p_address), ''),
           regular_hours = p_regular_hours,
           is_pilot = coalesce(p_is_pilot, is_pilot)
     where id = p_store_id
    returning id into v_id;
    if v_id is null then
      raise exception 'NOT_FOUND';
    end if;
  end if;
  return v_id;
end;
$$;

-- 엇갈림(공지와 다른 제보) · 무응답(30분 넘게 답 없는 제보)
create or replace function admin_get_queue()
returns table (
  store_id uuid, store_name text, report_id uuid, report_kind text,
  report_created_at timestamptz, agree_count int, reason text, notice_kind text
)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, r.id, r.kind::text, r.created_at,
         (select count(*)::int from report_agrees a where a.report_id = r.id),
         case when c.notice_id is not null then 'conflict' else 'no_answer' end,
         case when c.notice_id is not null then c.sign end
    from reports r
    join stores s on s.id = r.store_id
    cross join lateral current_sign(r.store_id) c
   where okc_is_admin()
     and r.status = 'pending' and r.expires_at > now() and r.kind <> 'seen_long_line'
     and ((c.notice_id is not null and c.sign <> okc_report_to_notice(r.kind)::text)
          or (c.notice_id is null and r.created_at < now() - interval '30 minutes'))
   order by r.created_at
$$;

create or replace function admin_list_claims()
returns table (
  claim_id uuid, store_id uuid, store_name text, store_has_owner boolean,
  user_name text, phone text, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select c.id, s.id, s.name, s.owner_id is not null, p.display_name, p.phone, c.created_at
    from store_claims c
    join stores s on s.id = c.store_id
    join profiles p on p.id = c.user_id
   where okc_is_admin() and c.status = 'requested'
   order by c.created_at
$$;

-- 시범 지표 (design §7). 기간은 [p_from, p_to)
create or replace function admin_metrics(p_from timestamptz, p_to timestamptz) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not okc_is_admin() then null else jsonb_build_object(
    'pilot_stores', (select count(*) from stores where is_pilot),
    'verified_pilot_stores', (select count(*) from stores where is_pilot and owner_id is not null),
    'stores_with_owner_notice', (
      select count(distinct n.store_id) from notices n join stores s on s.id = n.store_id
       where s.is_pilot and n.source = 'owner' and n.created_at >= p_from and n.created_at < p_to),
    'owner_notice_store_days', (
      select count(distinct (n.store_id, (n.created_at at time zone 'Asia/Seoul')::date))
        from notices n join stores s on s.id = n.store_id
       where s.is_pilot and n.source = 'owner' and n.created_at >= p_from and n.created_at < p_to),
    'questions_asked', (
      select count(*) from reports
       where kind <> 'seen_long_line' and created_at >= p_from and created_at < p_to),
    'questions_answered_by_owner', (
      select count(*) from reports
       where kind <> 'seen_long_line' and resolved_source = 'owner'
         and created_at >= p_from and created_at < p_to),
    'visitors', (
      select count(distinct anon_id) from events
       where name = 'page_view' and anon_id is not null and created_at >= p_from and created_at < p_to),
    'returning_visitors', (
      select count(*) from (
        select anon_id from events
         where name = 'page_view' and anon_id is not null and created_at >= p_from and created_at < p_to
         group by anon_id
        having count(distinct (created_at at time zone 'Asia/Seoul')::date) >= 2) v)
  ) end
$$;

-- 클라이언트 이벤트는 조회 계열만 받는다 (공지·제보·확인은 서버에서 기록)
create or replace function log_event(p_name text, p_anon_id uuid default null, p_store_id uuid default null)
returns void
language sql security definer set search_path = public as $$
  insert into events (name, anon_id, store_id)
  select p_name, p_anon_id, p_store_id
   where p_name in ('page_view', 'store_view')
$$;
