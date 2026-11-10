-- 소통광장 주요 뉴스(옥천신문 기사)의 조회수·공감을 옥!소리 안에서 직접 센다.
-- 옥천신문은 조회수·공감을 공개하지 않으므로, 화면에는 "옥!소리에서 센 숫자"라고 밝힌다.

create table news_stats (
  article_id text primary key check (article_id ~ '^[0-9]{1,12}$'),
  views int not null default 0
);

create table news_likes (
  article_id text not null check (article_id ~ '^[0-9]{1,12}$'),
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);

-- 정책 없음 = 직접 접근 불가. RPC 로만 읽고 쓴다
alter table news_stats enable row level security;
alter table news_likes enable row level security;
revoke all on news_stats, news_likes from public, anon, authenticated;

-- 기사를 눌러 옥천신문으로 갈 때 1 올린다. 로그인 없이도 센다 (같은 기기 중복은 화면에서 하루 한 번으로 막는다)
create function record_news_view(p_article_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_article_id is null or p_article_id !~ '^[0-9]{1,12}$' then
    raise exception 'NOT_FOUND';
  end if;
  insert into news_stats (article_id, views) values (p_article_id, 1)
  on conflict (article_id) do update set views = news_stats.views + 1;
end;
$$;

-- 공감 켜기/끄기. 익명 세션 포함, 한 사람 한 번
create function toggle_news_like(p_article_id text, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_article_id is null or p_article_id !~ '^[0-9]{1,12}$' then
    raise exception 'NOT_FOUND';
  end if;
  if p_on then
    insert into news_likes (article_id, user_id) values (p_article_id, auth.uid()) on conflict do nothing;
  else
    delete from news_likes where article_id = p_article_id and user_id = auth.uid();
  end if;
end;
$$;

create function get_news_stats(p_article_ids text[])
returns table (article_id text, views int, likes int, liked_by_me boolean)
language sql stable security definer set search_path = public as $$
  select a.id,
         coalesce((select s.views from news_stats s where s.article_id = a.id), 0),
         (select count(*)::int from news_likes l where l.article_id = a.id),
         exists (select 1 from news_likes l where l.article_id = a.id and l.user_id = auth.uid())
    from unnest(p_article_ids[1:20]) as a(id)
$$;

revoke execute on function toggle_news_like(text, boolean) from public, anon;
grant execute on function toggle_news_like(text, boolean) to authenticated, service_role;
grant execute on function record_news_view(text) to anon, authenticated, service_role;
grant execute on function get_news_stats(text[]) to anon, authenticated, service_role;
