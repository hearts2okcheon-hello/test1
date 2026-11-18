-- 관리자 화면 보강
--  1) 가게 정보: 가게 이름·번호 아래에 등록한 주민 이름·사는 곳과 가게 주소
--  2) 게시물 작성자 확인: 카카오 닉네임 + 옥!소리 이름·닉네임 + 계정(이메일) + 전화번호
-- 둘 다 관리자에게만 준다. 작성자 확인은 지금처럼 사유를 기록해야 볼 수 있다

drop function admin_list_store_info();
create function admin_list_store_info()
returns table (store_id uuid, name text, phone text, category text, created_at timestamptz, address text, owner_name text, owner_area text)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.phone, s.category, s.created_at, s.address, o.display_name, o.area
    from stores s
    left join lateral (
      select p.display_name, p.area
        from store_members m join profiles p on p.id = m.user_id
       where m.store_id = s.id
       order by m.created_at desc limit 1
    ) o on true
   where okc_is_admin() and not okc_is_anonymous()
   order by s.created_at desc
$$;
revoke execute on function admin_list_store_info() from public, anon;
grant execute on function admin_list_store_info() to authenticated, service_role;

-- 작성 계정 정보 (관리자 확인용). 부르는 쪽에서 관리자 확인과 사유 기록을 먼저 한다
create function _okc_author_info(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nickname', (select coalesce(u.raw_user_meta_data ->> 'nickname', u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'preferred_username') from auth.users u where u.id = p_user),
    'email', (select u.email from auth.users u where u.id = p_user),
    'account', left(p_user::text, 8),
    'name', (select p.display_name from profiles p where p.id = p_user),
    'oksori_nickname', (select p.nickname from profiles p where p.id = p_user),
    'phone', (select p.phone from profiles p where p.id = p_user),
    'post_count', (select count(*) from community_posts where author_id = p_user),
    'comment_count', (select count(*) from community_comments where author_id = p_user)
  )
$$;
revoke execute on function _okc_author_info(uuid) from public, anon, authenticated;

create or replace function admin_reveal_community_author(p_post_id uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
begin
  if not okc_is_admin() or okc_is_anonymous() then
    raise exception 'NOT_ADMIN';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 200 then
    raise exception 'REASON_REQUIRED';
  end if;
  select author_id into v_author from community_posts where id = p_post_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  insert into community_author_views (post_id, admin_id, reason) values (p_post_id, auth.uid(), btrim(p_reason));
  return _okc_author_info(v_author);
end;
$$;

create or replace function admin_reveal_community_comment_author(p_comment_id uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c community_comments;
begin
  if not okc_is_admin() or okc_is_anonymous() then
    raise exception 'NOT_ADMIN';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 200 then
    raise exception 'REASON_REQUIRED';
  end if;
  select * into c from community_comments where id = p_comment_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  insert into community_author_views (post_id, comment_id, admin_id, reason) values (c.post_id, c.id, auth.uid(), btrim(p_reason));
  return _okc_author_info(c.author_id);
end;
$$;
