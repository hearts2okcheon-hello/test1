-- 가게 프로필 사진(이름 앞 동그라미)과 가게 목록 카드에 보일 사진 줄 (ADR-014 보완)
alter table stores add column logo_url text;

-- p_url 이 null 이면 프로필 사진을 뺀다 (첫 글자 동그라미로 돌아간다)
create function set_store_logo(p_store_id uuid, p_url text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _okc_actor_source(p_store_id);
  perform _okc_check_media_url(p_store_id, p_url);
  update stores set logo_url = p_url where id = p_store_id;
end;
$$;
revoke execute on function set_store_logo(uuid, text) from public, anon;
grant execute on function set_store_logo(uuid, text) to authenticated, service_role;

-- 목록에 logo_url 과 card_photos(갤러리 사진 먼저, 그다음 메뉴 사진, 4장까지)를 더한다
drop function get_store_signs(text);
create function get_store_signs(p_category text default null)
returns table (
  store_id uuid, name text, category text, address text, regular_hours jsonb,
  sign text, source text, at_time time, memo text, signed_at timestamptz,
  notice_id uuid, report_kind text, agree_count int, neighborhood text,
  schedule_status text, schedule_basis text, listed boolean, cover_url text,
  logo_url text, card_photos jsonb
)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.category, s.address, s.regular_hours,
         c.sign, c.source, c.at_time, c.memo, c.signed_at, c.notice_id, c.report_kind, c.agree_count,
         s.neighborhood, st.status, st.basis,
         (st.status = 'open' or c.sign <> 'none'),
         (select p.url from store_photos p where p.store_id = s.id order by p.sort, p.created_at limit 1),
         s.logo_url,
         coalesce((
           select jsonb_agg(y.url) from (
             select x.url from (
               select p.url, 0 as grp, p.sort, p.created_at from store_photos p where p.store_id = s.id
               union all
               select m.photo_url, 1, m.sort, null from store_menus m where m.store_id = s.id and m.photo_url is not null
             ) x order by x.grp, x.sort, x.created_at limit 4
           ) y
         ), '[]'::jsonb)
    from stores s
    cross join lateral current_sign(s.id) c
    cross join lateral okc_schedule_status(s.id) st
   where p_category is null or s.category = p_category
   order by (c.sign = 'none'), c.signed_at desc nulls last, s.name
$$;
grant execute on function get_store_signs(text) to anon, authenticated, service_role;
