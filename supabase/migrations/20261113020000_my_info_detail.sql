-- 가게 상세에 가게 번호와 캘린더 일정을 더하고, 새 함수 권한과 알림 문구를 맞춘다 (ADR-014)

-- 비공개 번호는 관리할 수 있는 사람에게만 (manage_*)
create or replace function get_store_detail(p_store_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not exists (select 1 from stores where id = p_store_id) then null else
    jsonb_build_object(
      'store', (select to_jsonb(t) from get_store_signs() t where t.store_id = p_store_id),
      'profile', (select jsonb_build_object(
                    'phone', case when s.phone_public then s.phone end,
                    'intro', s.intro,
                    'phone_public', s.phone_public,
                    'manage_phone', case when okc_can_edit_store(p_store_id::text) then s.phone end,
                    'store_phone', case when s.store_phone_public then s.store_phone end,
                    'store_phone_public', s.store_phone_public,
                    'manage_store_phone', case when okc_can_edit_store(p_store_id::text) then s.store_phone end)
                    from stores s where s.id = p_store_id),
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
                   'liked_by_me', exists (select 1 from post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
                   'comment_count', (select count(*) from store_comments pc where pc.post_id = p.id and pc.deleted_at is null),
                   'comments', coalesce((
                     select jsonb_agg(y.j order by y.created_at) from (
                       select pc.created_at, jsonb_build_object(
                                'id', pc.id, 'body', pc.body, 'created_at', pc.created_at,
                                'is_mine', coalesce(pc.author_id = auth.uid(), false)) as j
                         from store_comments pc
                        where pc.post_id = p.id and pc.deleted_at is null
                        order by pc.created_at desc limit 20) y
                   ), '[]'::jsonb)
                 ) as j
            from store_posts p
           where p.store_id = p_store_id and p.deleted_at is null
           order by p.created_at desc limit 20) x
      ), '[]'::jsonb),
      'comment_count', (select count(*) from store_comments c where c.store_id = p_store_id and c.deleted_at is null and c.post_id is null),
      'comments', coalesce((
        select jsonb_agg(x.j order by x.created_at desc) from (
          select c.created_at, jsonb_build_object(
                   'id', c.id, 'body', c.body, 'created_at', c.created_at,
                   'is_mine', coalesce(c.author_id = auth.uid(), false)
                 ) as j
            from store_comments c
           where c.store_id = p_store_id and c.deleted_at is null and c.post_id is null
           order by c.created_at desc limit 30) x
      ), '[]'::jsonb),
      'closures', coalesce((
        select jsonb_agg(jsonb_build_object('id', c.id, 'start_date', c.start_date, 'end_date', c.end_date, 'reason', c.reason) order by c.start_date)
          from temp_closures c
         where c.store_id = p_store_id and c.canceled_at is null
           and c.end_date >= (now() at time zone 'Asia/Seoul')::date
      ), '[]'::jsonb),
      'plans', coalesce((
        select jsonb_agg(jsonb_build_object('id', d.id, 'day', d.day, 'kind', d.kind,
                                            'start_time', d.start_time, 'end_time', d.end_time, 'note', d.note)
                         order by d.day, d.kind)
          from store_day_plans d
         where d.store_id = p_store_id and d.day >= (now() at time zone 'Asia/Seoul')::date
      ), '[]'::jsonb)
    )
  end
$$;

do $$
declare
  f text;
  fns text[] := array[
    'save_my_profile(text, text, text, text)', 'ack_store_notice()',
    'register_store(text, text, jsonb, text, text, text, text, boolean, text, boolean)',
    'update_store_profile(uuid, text, text, jsonb, text, text, text, text, boolean, text, boolean)',
    'set_day_plan(uuid, date, text, time, time, text)', 'clear_day_plan(uuid)'];
begin
  foreach f in array fns loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end;
$$;

-- 사장님 알림을 누르면 내 가게 화면(/owner/store)으로 간다 (/owner 는 내 정보)
create or replace function _okc_push_on_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'seen_long_line' then
    return null;
  end if;
  insert into push_outbox (user_id, title, body, url, tag)
  select m.user_id, '🔔 이웃 제보가 왔어요',
         s.name || ': "' || case new.kind when 'seen_closed' then '문 닫혀 있었어요' when 'seen_open' then '열려 있었어요' else '재료 다 떨어졌대요' end
                || '" 눌러서 답해 주세요',
         '/owner/store', 'report-' || s.id
    from store_members m join stores s on s.id = m.store_id
   where m.store_id = new.store_id;
  return null;
end;
$$;

create or replace function enqueue_open_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare
  v_now timestamp := now() at time zone 'Asia/Seoul';
  v_day text := lower(to_char(v_now, 'Dy'));
  v_n int;
begin
  with due as (
    select s.id, s.name, (s.regular_hours -> v_day -> 0 ->> 0) as open_at
      from stores s
     where exists (select 1 from store_members m where m.store_id = s.id)
       and jsonb_typeof(s.regular_hours -> v_day -> 0) = 'array'
       and v_now::time - (s.regular_hours -> v_day -> 0 ->> 0)::time between interval '0' and interval '59 minutes'
       and not exists (select 1 from notices n where n.store_id = s.id and (n.created_at at time zone 'Asia/Seoul')::date = v_now::date)
       and not exists (select 1 from temp_closures c where c.store_id = s.id and c.canceled_at is null and v_now::date between c.start_date and c.end_date)
       -- 캘린더에 오늘 늦게 연다고 적어 둔 가게는 묻지 않는다
       and not exists (select 1 from store_day_plans d where d.store_id = s.id and d.day = v_now::date and d.kind = 'late_open')
       and not exists (select 1 from push_reminders r where r.store_id = s.id and r.day = v_now::date)
  ), marked as (
    insert into push_reminders (store_id, day) select id, v_now::date from due
    on conflict do nothing
    returning store_id
  ), queued as (
    insert into push_outbox (user_id, title, body, url, tag)
    select m.user_id, '사장님, 오늘 문 여셨나요?',
           d.name || ' 평소 여는 시간(' || d.open_at || ')이 지났어요. 눌러서 바로 알려 주세요',
           '/owner/store', 'open-' || d.id
      from due d join marked k on k.store_id = d.id join store_members m on m.store_id = d.id
    returning 1
  )
  select count(*) into v_n from queued;

  if exists (select 1 from push_outbox where sent_at is null and created_at > now() - interval '1 day') then
    perform _okc_kick_push();
  end if;
  return v_n;
end;
$$;

-- 제보 답장 알림 문구에 외출 중 추가
create or replace function _okc_push_on_report_reply() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_kind notice_kind;
  v_memo text;
  v_what text;
  v_targets uuid[];
begin
  if old.status <> 'pending' or new.status not in ('confirmed', 'rejected') or new.kind = 'seen_long_line' then
    return null;
  end if;

  select name into v_name from stores where id = new.store_id;
  select n.kind, n.memo into v_kind, v_memo from notices n
   where n.store_id = new.store_id and n.created_at = now() and n.ended_at is null
   order by n.created_at desc limit 1;

  v_what := case v_kind
    when 'open' then '오늘 문 열었어요'
    when 'closed_today' then '오늘 쉬어요'
    when 'sold_out' then '재료가 다 떨어졌어요'
    when 'early_close' then '일찍 닫았어요'
    when 'late_open' then '늦게 열어요'
    when 'out' then '잠깐 외출 중이에요'
    else case when new.status = 'confirmed' then '제보가 맞대요' else '제보와 다르대요' end
  end;

  select array_agg(distinct w.user_id) into v_targets from (
    select new.reporter_id as user_id
    union
    select a.user_id from report_agrees a where a.report_id = new.id
  ) w where w.user_id is distinct from new.resolved_by;
  if v_targets is null then
    return null;
  end if;

  delete from push_outbox o using unnest(v_targets) as t(user_id)
   where o.user_id = t.user_id and o.tag = 'store-' || new.store_id and o.created_at = now()
     and o.sent_at is null and o.title not like '💬%';

  insert into push_outbox (user_id, title, body, url, tag)
  select t.user_id,
         '💬 ' || case when new.resolved_source = 'okcheon' then '옥천신문이 확인했어요' else '사장님이 답했어요' end,
         v_name || ': "' || v_what || '"' || coalesce(' · ' || v_memo, ''),
         '/stores/' || new.store_id, 'store-' || new.store_id
    from unnest(v_targets) as t(user_id)
   where not exists (select 1 from push_outbox o
                      where o.user_id = t.user_id and o.tag = 'store-' || new.store_id
                        and o.created_at = now() and o.title like '💬%');
  return null;
end;
$$;
revoke execute on function enqueue_open_reminders() from public, anon, authenticated;
revoke execute on function _okc_push_on_report() from public, anon, authenticated;
revoke execute on function _okc_push_on_report_reply() from public, anon, authenticated;
