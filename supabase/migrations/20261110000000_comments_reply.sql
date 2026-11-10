-- 1) 사장님 소식·공지마다 주민 댓글  2) 동네 이야기 댓글  3) 이웃 제보에 "열었어요 / 오늘 쉬어요 + 쪽지"로 한 번에 답하기
-- 작성자 id 는 어떤 공개 응답에도 내보내지 않는다.

-- ── 1. 소식·공지 댓글: 기존 주민 댓글 표에 글 번호를 붙인다 (없으면 가게 전체 댓글) ──
alter table store_comments add column post_id uuid references store_posts(id) on delete cascade;
create index store_comments_post on store_comments (post_id, created_at) where deleted_at is null and post_id is not null;

drop function post_store_comment(uuid, text);
create function post_store_comment(p_store_id uuid, p_body text, p_post_id uuid default null) returns uuid
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
  if p_post_id is not null and not exists (
    select 1 from store_posts where id = p_post_id and store_id = p_store_id and deleted_at is null
  ) then
    raise exception 'NOT_FOUND';
  end if;
  if btrim(coalesce(p_body, '')) = '' or char_length(btrim(p_body)) > 200 then
    raise exception 'INVALID_BODY';
  end if;
  if exists (select 1 from store_comments where author_id = auth.uid() and created_at > now() - interval '30 seconds')
     or (select count(*) from store_comments where author_id = auth.uid() and created_at > now() - interval '1 day') >= 30 then
    raise exception 'COMMENT_TOO_FAST';
  end if;
  insert into store_comments (store_id, author_id, body, post_id)
  values (p_store_id, auth.uid(), btrim(p_body), p_post_id)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function post_store_comment(uuid, text, uuid) from public, anon;
grant execute on function post_store_comment(uuid, text, uuid) to authenticated, service_role;

-- 상세: 소식마다 댓글 수·댓글(오래된 순 20개), 가게 전체 댓글은 글 번호 없는 것만
do $$
declare
  d text;
  like_part text := $o$'liked_by_me', exists (select 1 from post_likes l where l.post_id = p.id and l.user_id = auth.uid())$o$;
  like_new text := $n$'liked_by_me', exists (select 1 from post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
                   'comment_count', (select count(*) from store_comments pc where pc.post_id = p.id and pc.deleted_at is null),
                   'comments', coalesce((
                     select jsonb_agg(y.j order by y.created_at) from (
                       select pc.created_at, jsonb_build_object(
                                'id', pc.id, 'body', pc.body, 'created_at', pc.created_at,
                                'is_mine', coalesce(pc.author_id = auth.uid(), false)) as j
                         from store_comments pc
                        where pc.post_id = p.id and pc.deleted_at is null
                        order by pc.created_at desc limit 20) y
                   ), '[]'::jsonb)$n$;
  store_part text := 'c.store_id = p_store_id and c.deleted_at is null';
begin
  d := pg_get_functiondef('public.get_store_detail(uuid)'::regprocedure);
  if position(like_part in d) = 0 or position(store_part in d) = 0 then
    raise exception 'get_store_detail 본문이 예상과 다릅니다';
  end if;
  d := replace(d, like_part, like_new);
  d := replace(d, store_part, store_part || ' and c.post_id is null');
  execute d;
end;
$$;

-- ── 2. 동네 이야기 댓글 ──────────────────────────────
create table community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references community_posts(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  anon_name text not null,
  body text not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index community_comments_post on community_comments (post_id, created_at) where deleted_at is null;
create index community_comments_author on community_comments (author_id, created_at desc);
alter table community_comments enable row level security;
revoke all on community_comments from public, anon, authenticated;

-- 관리자 열람 기록에 댓글도 남긴다
alter table community_author_views add column comment_id uuid references community_comments(id) on delete cascade;

drop function get_community_posts(int);
create function get_community_posts(p_limit int default 30)
returns table (id uuid, anon_name text, body text, created_at timestamptz, is_mine boolean, comment_count int, comments jsonb)
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
              order by c.created_at desc limit 30) y
         ), '[]'::jsonb)
    from community_posts p
   where p.deleted_at is null
   order by p.created_at desc
   limit greatest(1, least(p_limit, 50))
$$;

-- 글쓴이는 "글쓴이", 같은 사람은 한 글 안에서 같은 익명 이름을 쓴다
create function post_community_comment(p_post_id uuid, p_body text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_body text := btrim(p_body);
  v_post community_posts;
  v_name text;
  v_id uuid;
begin
  if auth.uid() is null or okc_is_anonymous() then
    raise exception 'LOGIN_REQUIRED';
  end if;
  select * into v_post from community_posts where id = p_post_id and deleted_at is null;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_body is null or v_body = '' then
    raise exception 'INVALID_BODY';
  end if;
  if char_length(v_body) > 200 then
    raise exception 'TEXT_TOO_LONG';
  end if;
  if exists (select 1 from community_comments where author_id = auth.uid() and created_at > now() - interval '15 seconds')
     or (select count(*) from community_comments where author_id = auth.uid() and created_at > now() - interval '1 day') >= 50 then
    raise exception 'COMMENT_TOO_FAST';
  end if;
  if v_post.author_id = auth.uid() then
    v_name := '글쓴이';
  else
    select anon_name into v_name from community_comments
     where post_id = p_post_id and author_id = auth.uid() order by created_at limit 1;
    v_name := coalesce(v_name, '익명의 오소리 ' || (100 + floor(random() * 900))::int);
  end if;
  insert into community_comments (post_id, author_id, anon_name, body)
  values (p_post_id, auth.uid(), v_name, v_body)
  returning id into v_id;
  return v_id;
end;
$$;

create function delete_community_comment(p_comment_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update community_comments
     set deleted_at = now()
   where id = p_comment_id and deleted_at is null
     and (author_id = auth.uid() or (okc_is_admin() and not okc_is_anonymous()));
  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

create function admin_reveal_community_comment_author(p_comment_id uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c community_comments;
  v_name text;
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
  select coalesce(u.raw_user_meta_data ->> 'nickname', u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'preferred_username')
    into v_name from auth.users u where u.id = c.author_id;
  return jsonb_build_object(
    'nickname', v_name,
    'account', left(c.author_id::text, 8),
    'post_count', (select count(*) from community_posts where author_id = c.author_id),
    'comment_count', (select count(*) from community_comments where author_id = c.author_id)
  );
end;
$$;

-- ── 3. 이웃 제보에 한 번에 답하기 ─────────────────────
-- 사장님이 "열었어요 / 오늘 쉬어요"와 한 줄 쪽지를 고르면 팻말을 바꾸고, 기다리던 제보를 모두 맞다/아니다로 정리한다
create function reply_reports(p_store_id uuid, p_open boolean, p_memo text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_source notice_source;
  v_memo text := nullif(btrim(p_memo), '');
  v_first uuid;
  v_notice uuid;
begin
  v_source := _okc_actor_source(p_store_id);
  if p_open is null then
    raise exception 'INVALID_KIND';
  end if;
  if v_memo is not null and char_length(v_memo) > 40 then
    raise exception 'MEMO_TOO_LONG';
  end if;
  perform 1 from reports
   where store_id = p_store_id and status = 'pending' and expires_at > now() and kind <> 'seen_long_line'
   for update;
  select id into v_first from reports
   where store_id = p_store_id and status = 'pending' and expires_at > now() and kind <> 'seen_long_line'
   order by created_at desc limit 1;
  if v_first is null then
    raise exception 'ALREADY_RESOLVED';
  end if;

  v_notice := _okc_insert_notice(p_store_id, (case when p_open then 'open' else 'closed_today' end)::notice_kind,
                                 null, v_memo, v_source, auth.uid(), v_first);

  -- "열려 있었어요"는 열었을 때, 나머지(문 닫힘·재료 소진)는 쉴 때 맞는 제보
  with done as (
    update reports
       set status = (case when (kind = 'seen_open') = p_open then 'confirmed' else 'rejected' end)::report_status,
           resolved_by = auth.uid(), resolved_source = v_source, resolved_at = now()
     where store_id = p_store_id and status = 'pending' and expires_at > now() and kind <> 'seen_long_line'
     returning status, created_at
  )
  insert into events (name, store_id, props)
  select 'confirm_answered', p_store_id,
         jsonb_build_object('yes', status = 'confirmed', 'source', v_source, 'via', 'reply',
                            'minutes', round(extract(epoch from now() - created_at) / 60))
    from done;

  return v_notice;
end;
$$;

do $$
declare
  f text;
  write_fns text[] := array[
    'post_community_comment(uuid, text)', 'delete_community_comment(uuid)',
    'admin_reveal_community_comment_author(uuid, text)', 'reply_reports(uuid, boolean, text)'
  ];
begin
  foreach f in array write_fns loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end;
$$;
