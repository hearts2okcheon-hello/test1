-- 가게에 붙이는 옥천신문 기사 (ADR-020)
-- 옥천신문(관리자)이 가게에 기사를 붙이면, 가게 목록의 가게 칸에서 펼쳐 볼 수 있다.
-- 제목·사진·올라온 시각은 붙일 때 기사 화면에서 읽어 온 값을 그대로 둔다 (옥천신문 사이트가 느리거나 닫혀도 목록은 보인다)

create table store_articles (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  -- 옥천신문 기사 번호 (articleView.html?idxno=)
  article_id text not null check (article_id ~ '^[0-9]{1,12}$'),
  title text not null check (char_length(title) between 1 and 200),
  -- 옥천신문 사진 주소만
  image_url text check (image_url like 'https://cdn.okinews.com/%'),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,
  unique (store_id, article_id)
);
alter table store_articles enable row level security;
-- 정책을 두지 않는다. 표는 직접 읽거나 쓸 수 없고 아래 함수로만 다룬다
revoke all on store_articles from public, anon, authenticated;

-- 붙이기 (관리자). 같은 기사를 다시 붙이면 제목·사진·시각만 바뀐다. 가게마다 5개까지 (가정)
create function admin_link_store_article(p_store_id uuid, p_article_id text, p_title text, p_image_url text default null,
                                         p_published_at timestamptz default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
begin
  if not okc_is_admin() or okc_is_anonymous() then
    raise exception 'NOT_ADMIN';
  end if;
  if not exists (select 1 from stores where id = p_store_id) then
    raise exception 'NOT_FOUND';
  end if;
  if p_article_id is null or p_article_id !~ '^[0-9]{1,12}$' or v_title = ''
     or (p_image_url is not null and p_image_url not like 'https://cdn.okinews.com/%') then
    raise exception 'INVALID_ARTICLE';
  end if;
  if (select count(*) from store_articles where store_id = p_store_id and article_id <> p_article_id) >= 5 then
    raise exception 'TOO_MANY_ARTICLES';
  end if;
  insert into store_articles (store_id, article_id, title, image_url, published_at, created_by)
  values (p_store_id, p_article_id, left(v_title, 200), p_image_url, p_published_at, auth.uid())
  on conflict (store_id, article_id) do update
    set title = excluded.title, image_url = excluded.image_url, published_at = excluded.published_at;
end;
$$;

-- 떼기 (관리자). 옥천신문 기사 자체와는 상관없다
create function admin_unlink_store_article(p_store_id uuid, p_article_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not okc_is_admin() or okc_is_anonymous() then
    raise exception 'NOT_ADMIN';
  end if;
  delete from store_articles where store_id = p_store_id and article_id = p_article_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

-- 읽기: 가게에 붙인 기사 모두, 새로 올라온 기사가 먼저. 누가 붙였는지는 내보내지 않는다
create function get_store_articles()
returns table (store_id uuid, article_id text, title text, image_url text, published_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.store_id, a.article_id, a.title, a.image_url, a.published_at
    from store_articles a
   order by a.published_at desc nulls last, a.created_at desc, a.article_id desc
$$;

revoke execute on function public.admin_link_store_article(uuid, text, text, text, timestamptz) from public, anon;
grant execute on function public.admin_link_store_article(uuid, text, text, text, timestamptz) to authenticated, service_role;
revoke execute on function public.admin_unlink_store_article(uuid, text) from public, anon;
grant execute on function public.admin_unlink_store_article(uuid, text) to authenticated, service_role;
-- 주민은 로그인 없이 본다
revoke execute on function public.get_store_articles() from public;
grant execute on function public.get_store_articles() to anon, authenticated, service_role;
