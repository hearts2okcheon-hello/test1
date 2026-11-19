-- 가게 캘린더 통합 (ADR-015): 휴무 · 늦게 열기 · 일찍 닫기 · 외출을 기간으로 넣고, 고치고, 지운다.
-- 표는 그대로 쓴다. 휴무는 임시휴무(temp_closures) 한 줄, 나머지는 날짜마다 store_day_plans 한 줄.
-- 팻말·알림 규칙도 그대로다 (새 휴무는 set_temp_closure 로 넣으므로 즐겨찾기 알림이 지금처럼 간다)

-- p_kind: closed(휴무) | late_open(p_from 에 열어요) | early_close(p_to 에 닫아요) | out(p_from~p_to 외출)
-- 고칠 때는 예전 일정을 함께 넘긴다: 휴무였으면 p_closure_id, 날짜별 일정이었으면 p_plan_ids.
-- 돌려주는 값: 일정이 들어간 날 수 (휴무인 날은 건너뛰므로 고른 기간보다 적을 수 있다)
create function save_schedule(
  p_store_id uuid, p_kind text, p_start date, p_end date,
  p_from time default null, p_to time default null, p_note text default null,
  p_closure_id uuid default null, p_plan_ids uuid[] default null
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_note text := nullif(btrim(p_note), '');
  v_old temp_closures;
  v_hours jsonb;
  v_day date;
  v_dow text;
  v_rest boolean;
  v_n int := 0;
begin
  perform _okc_actor_source(p_store_id);
  if p_start is null or p_end is null or p_end < p_start then
    raise exception 'INVALID_DATES';
  end if;

  -- 고치는 중인 예전 일정 (이 가게 것만)
  if p_closure_id is not null then
    select * into v_old from temp_closures where id = p_closure_id and store_id = p_store_id and canceled_at is null;
    if not found then
      raise exception 'NOT_FOUND';
    end if;
  end if;
  if p_plan_ids is not null then
    delete from store_day_plans where store_id = p_store_id and id = any (p_plan_ids);
  end if;

  if p_kind = 'closed' then
    -- 시작일은 오늘부터. 이미 시작한 휴무를 고칠 때만 원래 시작일을 그대로 둘 수 있다
    if (p_start < v_today and p_start is distinct from v_old.start_date) or p_end < v_today or p_end > p_start + 90 then
      raise exception 'INVALID_DATES';
    end if;
    if char_length(v_note) > 200 then
      raise exception 'TEXT_TOO_LONG';
    end if;
    if exists (select 1 from temp_closures c
                where c.store_id = p_store_id and c.canceled_at is null and c.id is distinct from p_closure_id
                  and c.start_date <= p_end and c.end_date >= p_start) then
      raise exception 'CLOSURE_OVERLAP';
    end if;
    -- 쉬는 날에 걸려 있던 늦게 열기·일찍 닫기·외출은 뜻이 없어지므로 지운다
    delete from store_day_plans where store_id = p_store_id and day between p_start and p_end;
    if p_closure_id is not null then
      update temp_closures set start_date = p_start, end_date = p_end, reason = v_note where id = p_closure_id;
    else
      perform set_temp_closure(p_store_id, p_start, p_end, v_note);
    end if;
    return p_end - p_start + 1;
  end if;

  if p_start < v_today or p_end > (v_today + interval '1 month')::date then
    raise exception 'INVALID_DATES';
  end if;
  if char_length(v_note) > 40 then
    raise exception 'MEMO_TOO_LONG';
  end if;
  if p_kind = 'late_open' then
    if p_from is null then raise exception 'INVALID_TIME'; end if;
    p_to := null;
  elsif p_kind = 'early_close' then
    if p_to is null then raise exception 'INVALID_TIME'; end if;
    p_from := null;
  elsif p_kind = 'out' then
    if p_from is null or p_to is null or p_from >= p_to then raise exception 'INVALID_TIME'; end if;
  else
    raise exception 'INVALID_KIND';
  end if;

  -- 휴무였던 일정을 다른 유형으로 바꾸면 그 휴무는 취소한다
  if p_closure_id is not null then
    update temp_closures set canceled_at = now() where id = p_closure_id;
  end if;

  select regular_hours into v_hours from stores where id = p_store_id;
  for v_day in select d::date from generate_series(p_start::timestamp, p_end::timestamp, interval '1 day') d loop
    v_dow := lower(to_char(v_day, 'Dy'));
    -- 쉬는 요일 (영업시간에 그 요일이 비어 있음)
    v_rest := case when v_hours is null or not (v_hours ? v_dow) then false
                   when jsonb_typeof(v_hours -> v_dow) = 'array' then jsonb_array_length(v_hours -> v_dow) = 0
                   else true end;
    -- 휴무(임시휴무 · 쉬는 요일)인 날은 건너뛴다
    continue when v_rest or exists (select 1 from temp_closures c
                                     where c.store_id = p_store_id and c.canceled_at is null and v_day between c.start_date and c.end_date);
    insert into store_day_plans (store_id, day, kind, start_time, end_time, note, created_by)
    values (p_store_id, v_day, p_kind, p_from, p_to, v_note, auth.uid())
    on conflict (store_id, day, kind) do update
      set start_time = excluded.start_time, end_time = excluded.end_time, note = excluded.note,
          created_by = excluded.created_by, created_at = now();
    v_n := v_n + 1;
  end loop;
  if v_n = 0 then
    raise exception 'DAY_CLOSED';
  end if;
  return v_n;
end;
$$;

-- 묶여 있는 날짜별 일정(늦게 열기·일찍 닫기·외출)을 한 번에 지운다
create function clear_day_plans(p_store_id uuid, p_plan_ids uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_n int;
begin
  perform _okc_actor_source(p_store_id);
  delete from store_day_plans where store_id = p_store_id and id = any (p_plan_ids);
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'NOT_FOUND';
  end if;
  return v_n;
end;
$$;

do $$
declare
  f text;
  fns text[] := array['save_schedule(uuid, text, date, date, time, time, text, uuid, uuid[])', 'clear_day_plans(uuid, uuid[])'];
begin
  foreach f in array fns loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end;
$$;
