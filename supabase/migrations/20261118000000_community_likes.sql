-- 동네 이야기 공감 + 글 하나를 전체 화면으로 보기
-- 공감은 사장님 소식 공감(post_likes)과 같은 방식: 한 사람이 한 글에 한 번, 누가 눌렀는지는 내보내지 않는다

create table community_likes (
  post_id uuid not null references community_posts(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table community_likes enable row level security;
revoke all on community_likes from public, anon, authenticated;

create function toggle_community_like(p_post_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not exists (select 1 from community_posts p where p.id = p_post_id and p.deleted_at is null) then
    raise exception 'NOT_FOUND';
  end if;
  if p_on then
    insert into community_likes (post_id, user_id) values (p_post_id, auth.uid()) on conflict do nothing;
  else
    delete from community_likes where post_id = p_post_id and user_id = auth.uid();
  end if;
end;
$$;

-- 글 한 줄을 만드는 곳은 여기 하나 (목록과 전체 화면이 같이 쓴다). p_comments: 함께 줄 댓글 수
create function _okc_community_rows(p_post_id uuid, p_limit int, p_comments int)
returns table (id uuid, anon_name text, body text, created_at timestamptz, is_mine boolean, comment_count int, comments jsonb, like_count int, liked_by_me boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.anon_name, p.body, p.created_at, coalesce(p.author_id = auth.uid(), false),
         (select count(*)::int from community_comments c where c.post_id = p.id and c.deleted_at is null),
         coalesce((
           select jsonb_agg(y.j order by y.created_at) from (
             select c.created_at, jsonb_build_object(
                      'id', c.id, 'anon_name', c.anon_name, 'body', c.body, 'created_at', c.created_at,
                      'is_mine', coalesce(c.author_id = auth.uid(), false)) as j
               from community_comments c
              where c.post_id = p.id and c.deleted_at is null
              order by c.created_at desc limit p_comments) y
         ), '[]'::jsonb),
         (select count(*)::int from community_likes l where l.post_id = p.id),
         exists (select 1 from community_likes l where l.post_id = p.id and l.user_id = auth.uid())
    from community_posts p
   where p.deleted_at is null and (p_post_id is null or p.id = p_post_id)
   order by p.created_at desc
   limit p_limit
$$;
revoke execute on function _okc_community_rows(uuid, int, int) from public, anon, authenticated;

drop function get_community_posts(int);
create function get_community_posts(p_limit int default 30)
returns table (id uuid, anon_name text, body text, created_at timestamptz, is_mine boolean, comment_count int, comments jsonb, like_count int, liked_by_me boolean)
language sql stable security definer set search_path = public as $$
  select * from _okc_community_rows(null, greatest(1, least(p_limit, 50)), 30)
$$;

-- 글 하나 (전체 화면). 댓글은 200개까지
create function get_community_post(p_post_id uuid)
returns table (id uuid, anon_name text, body text, created_at timestamptz, is_mine boolean, comment_count int, comments jsonb, like_count int, liked_by_me boolean)
language sql stable security definer set search_path = public as $$
  select * from _okc_community_rows(p_post_id, 1, 200)
$$;

revoke execute on function toggle_community_like(uuid, boolean) from public, anon;
grant execute on function toggle_community_like(uuid, boolean) to authenticated, service_role;
grant execute on function get_community_posts(integer) to anon, authenticated, service_role;
grant execute on function get_community_post(uuid) to anon, authenticated, service_role;
