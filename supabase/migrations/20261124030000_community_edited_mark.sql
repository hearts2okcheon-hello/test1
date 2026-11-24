-- 고친 동네 이야기에 "수정됨" 표시 (ADR-025 덧붙임, 2026-11-24 사용자 확인)
-- community_posts 에 고친 시각 칸(updated_at)을 하나 더한다. 한 번도 안 고친 글은 비어 있다 — 사장님 소식(store_posts.updated_at)과 같은 방식.
-- 내용이 실제로 바뀐 때에만 시각을 적는다: 고치기 화면에서 그대로 저장한 글에는 "수정됨"이 붙지 않는다.
-- 고치기 전 내용은 보관하지 않는다. 작성자 id 는 여전히 어떤 응답에도 나가지 않는다

alter table community_posts add column updated_at timestamptz;

create or replace function update_community_post(p_post_id uuid, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_body text := btrim(p_body);
begin
  if auth.uid() is null or okc_is_anonymous() then
    raise exception 'LOGIN_REQUIRED';
  end if;
  if v_body is null or v_body = '' then
    raise exception 'INVALID_BODY';
  end if;
  if char_length(v_body) > 500 then
    raise exception 'TEXT_TOO_LONG';
  end if;
  -- set 의 오른쪽에서 p.body 는 고치기 전 내용이다: 내용이 달라질 때만 고친 시각을 새로 적는다
  update community_posts p
     set updated_at = case when p.body is distinct from v_body then now() else p.updated_at end,
         body = v_body
   where p.id = p_post_id and p.deleted_at is null and p.author_id = auth.uid();
  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

-- 글 한 줄에 고친 시각을 더한다. 돌려주는 칸이 바뀌므로 지우고 다시 만든다 (목록과 전체 화면이 같이 쓴다)
drop function get_community_posts(int);
drop function get_community_post(uuid);
drop function _okc_community_rows(uuid, int, int);

create function _okc_community_rows(p_post_id uuid, p_limit int, p_comments int)
returns table (id uuid, anon_name text, body text, created_at timestamptz, is_mine boolean, comment_count int, comments jsonb, like_count int, liked_by_me boolean, updated_at timestamptz)
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
         exists (select 1 from community_likes l where l.post_id = p.id and l.user_id = auth.uid()),
         p.updated_at
    from community_posts p
   where p.deleted_at is null and (p_post_id is null or p.id = p_post_id)
   order by p.created_at desc
   limit p_limit
$$;
revoke execute on function _okc_community_rows(uuid, int, int) from public, anon, authenticated;

create function get_community_posts(p_limit int default 30)
returns table (id uuid, anon_name text, body text, created_at timestamptz, is_mine boolean, comment_count int, comments jsonb, like_count int, liked_by_me boolean, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select * from _okc_community_rows(null, greatest(1, least(p_limit, 50)), 30)
$$;

-- 글 하나 (전체 화면). 댓글은 200개까지
create function get_community_post(p_post_id uuid)
returns table (id uuid, anon_name text, body text, created_at timestamptz, is_mine boolean, comment_count int, comments jsonb, like_count int, liked_by_me boolean, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select * from _okc_community_rows(p_post_id, 1, 200)
$$;

grant execute on function get_community_posts(integer) to anon, authenticated, service_role;
grant execute on function get_community_post(uuid) to anon, authenticated, service_role;
