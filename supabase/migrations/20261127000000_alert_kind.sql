-- 알림 목록에 알림 종류와 "아직 할 일이 남았는지"를 함께 준다 (ADR-030). 테이블·칸은 그대로다.
-- 종류는 보낼 때 붙인 tag 로 안다: open-가게 = 오픈 시간 확인, report-가게 = 이웃 제보(사장님께),
-- store-가게 = 즐겨찾는 가게 소식 (제목이 💬 로 시작하면 제보 답장)

-- 오늘 오픈 시간 확인이 아직 필요한가: 오늘 올린 팻말 공지도, 오늘 걸린 임시휴무도, 오늘 늦게 연다는 일정도 없을 때.
-- enqueue_open_reminders 가 알림을 보낼지 정할 때 보는 것과 같은 조건이다 ('오늘'은 서울 날짜)
create function _okc_open_check_pending(p_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from notices n
                      where n.store_id = p_store
                        and (n.created_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date)
     and not exists (select 1 from temp_closures c
                      where c.store_id = p_store and c.canceled_at is null
                        and (now() at time zone 'Asia/Seoul')::date between c.start_date and c.end_date)
     and not exists (select 1 from store_day_plans d
                      where d.store_id = p_store and d.day = (now() at time zone 'Asia/Seoul')::date and d.kind = 'late_open')
$$;
revoke execute on function _okc_open_check_pending(uuid) from public, anon, authenticated;

-- 내가 받은 알림 (최근 30일, 새것부터) + 종류(kind) + 할 일이 남았는지(needs_action)
drop function get_my_alerts(int);
create function get_my_alerts(p_limit int default 50)
returns table (id bigint, title text, body text, url text, created_at timestamptz, is_read boolean, kind text, needs_action boolean)
language sql stable security definer set search_path = public as $$
  select o.id, o.title, o.body, o.url, o.created_at, o.read_at is not null, k.kind,
         -- 누를 곳("영업 상태 설정")은 할 일이 남은 가장 새 오픈 시간 확인에만 보인다:
         -- 오늘 온 알림이고, 같은 가게의 더 새 알림이 없고, 지금도 그 가게 사장님이고, 아직 오늘 소식이 없을 때
         coalesce(
           s.store_id is not null
           and (o.created_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date
           and not exists (select 1 from push_outbox x where x.user_id = o.user_id and x.tag = o.tag and x.id > o.id)
           and _okc_open_check_pending(s.store_id),
           false)
    from push_outbox o
   cross join lateral (
     select case when o.tag like 'open-%' then 'open_check'
                 when o.tag like 'report-%' then 'report'
                 when o.tag like 'store-%' and o.title like '💬%' then 'reply'
                 when o.tag like 'store-%' then 'favorite'
                 else 'other' end as kind
   ) k
    left join lateral (
     -- tag 뒤의 가게 번호를 글자로 견준다 (모양이 틀린 tag 가 있어도 오류가 나지 않는다)
     select m.store_id from store_members m
      where k.kind = 'open_check' and m.user_id = o.user_id and m.store_id::text = substring(o.tag from 6)
      limit 1
   ) s on true
   where o.user_id = auth.uid() and o.created_at > now() - interval '30 days'
   order by o.created_at desc, o.id desc
   limit greatest(1, least(coalesce(p_limit, 50), 100))
$$;
revoke execute on function get_my_alerts(integer) from public, anon;
grant execute on function get_my_alerts(integer) to authenticated, service_role;
