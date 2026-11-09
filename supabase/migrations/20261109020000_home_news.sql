-- 홈 검색용 메뉴 이름과, 오늘의 소식 "이웃 제보" 목록 (ADR-011)
-- 제보자 신원(reporter_id)은 돌려주지 않는다.

create function get_store_search_index()
returns table (store_id uuid, menus text[])
language sql stable security definer set search_path = public as $$
  select m.store_id, array_agg(m.name order by m.sort)
    from store_menus m
   group by m.store_id
$$;

create function get_today_reports(p_limit int default 30)
returns table (report_id uuid, store_id uuid, store_name text, kind report_kind, status text, resolved_source text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.store_id, s.name, r.kind, r.status::text, r.resolved_source::text, r.created_at
    from reports r
    join stores s on s.id = r.store_id
   where r.created_at >= okc_today_start()
     and (r.status = 'confirmed' or (r.status = 'pending' and r.expires_at > now()))
   order by r.created_at desc
   limit greatest(1, least(p_limit, 50))
$$;
