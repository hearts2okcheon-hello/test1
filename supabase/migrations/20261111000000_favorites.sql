-- 가게 즐겨찾기 (ADR-013). 주민은 로그인 없이 익명 세션으로 별을 누른다.
-- 즐겨찾기한 가게가 문을 열거나, 재료가 떨어지거나, 임시휴무를 걸면 알림을 보내는 데 쓴다.

create table store_favorites (
  user_id uuid not null,
  store_id uuid not null references stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, store_id)
);
create index store_favorites_store on store_favorites (store_id);

alter table store_favorites enable row level security;
revoke all on store_favorites from public, anon, authenticated;

create function toggle_favorite(p_store_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not exists (select 1 from stores where id = p_store_id) then
    raise exception 'NOT_FOUND';
  end if;
  if p_on then
    if (select count(*) from store_favorites where user_id = auth.uid()) >= 50 then
      raise exception 'TOO_MANY_ITEMS';
    end if;
    insert into store_favorites (user_id, store_id) values (auth.uid(), p_store_id) on conflict do nothing;
  else
    delete from store_favorites where user_id = auth.uid() and store_id = p_store_id;
  end if;
end;
$$;

-- 내 즐겨찾기 가게 id (최근에 누른 순)
create function get_my_favorites() returns setof uuid
language sql stable security definer set search_path = public as $$
  select store_id from store_favorites where user_id = auth.uid() order by created_at desc
$$;

revoke execute on function toggle_favorite(uuid, boolean) from public, anon;
grant execute on function toggle_favorite(uuid, boolean) to authenticated, service_role;
revoke execute on function get_my_favorites() from public, anon;
grant execute on function get_my_favorites() to authenticated, service_role;
