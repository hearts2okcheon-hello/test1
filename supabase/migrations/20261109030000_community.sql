-- 소통광장 동네 이야기: 화면에는 익명, 작성 계정은 관리자만 사유를 남기고 확인한다 (ADR-012)
-- 주민은 카카오 로그인 후 쓴다. 작성자 id 는 어떤 공개 응답에도 넣지 않는다.

create table community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  anon_name text not null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index community_posts_recent on community_posts (created_at desc) where deleted_at is null;

-- 관리자가 작성 계정을 확인한 기록
create table community_author_views (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references community_posts(id) on delete cascade,
  admin_id uuid not null references auth.users(id),
  reason text not null check (char_length(btrim(reason)) between 1 and 200),
  created_at timestamptz not null default now()
);

-- 정책 없음 = 직접 접근 불가
alter table community_posts enable row level security;
alter table community_author_views enable row level security;
revoke all on community_posts, community_author_views from public, anon, authenticated;

create function get_community_posts(p_limit int default 30)
returns table (id uuid, anon_name text, body text, created_at timestamptz, is_mine boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.anon_name, p.body, p.created_at, coalesce(p.author_id = auth.uid(), false)
    from community_posts p
   where p.deleted_at is null
   order by p.created_at desc
   limit greatest(1, least(p_limit, 50))
$$;

create function post_community(p_body text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_body text := btrim(p_body);
  v_id uuid;
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
  if exists (select 1 from community_posts where author_id = auth.uid() and created_at > now() - interval '30 seconds')
     or (select count(*) from community_posts where author_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then
    raise exception 'COMMENT_TOO_FAST';
  end if;
  insert into community_posts (author_id, anon_name, body)
  values (auth.uid(), '익명의 오소리 ' || (100 + floor(random() * 900))::int, v_body)
  returning id into v_id;
  return v_id;
end;
$$;

create function delete_community_post(p_post_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update community_posts
     set deleted_at = now()
   where id = p_post_id and deleted_at is null
     and (author_id = auth.uid() or (okc_is_admin() and not okc_is_anonymous()));
  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

create function admin_list_community(p_limit int default 50)
returns table (id uuid, anon_name text, body text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.anon_name, p.body, p.created_at
    from community_posts p
   where p.deleted_at is null and okc_is_admin() and not okc_is_anonymous()
   order by p.created_at desc
   limit greatest(1, least(p_limit, 100))
$$;

-- 사유를 남겨야 작성 계정을 볼 수 있다. 실명이 아니라 카카오 닉네임과 작성 수를 돌려준다
create function admin_reveal_community_author(p_post_id uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
  v_name text;
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
  select coalesce(u.raw_user_meta_data ->> 'nickname', u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'preferred_username')
    into v_name from auth.users u where u.id = v_author;
  return jsonb_build_object(
    'nickname', v_name,
    'account', left(v_author::text, 8),
    'post_count', (select count(*) from community_posts where author_id = v_author)
  );
end;
$$;

do $$
declare
  f text;
  write_fns text[] := array[
    'post_community(text)', 'delete_community_post(uuid)',
    'admin_list_community(integer)', 'admin_reveal_community_author(uuid, text)'
  ];
begin
  foreach f in array write_fns loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end;
$$;
