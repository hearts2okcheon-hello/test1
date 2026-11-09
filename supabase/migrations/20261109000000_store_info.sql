-- 사장님 코드를 더 만들지 않는다. 관리자는 가게 이름과 전화번호로 가게를 관리한다 (ADR-010)
-- 예전 코드 표(owner_codes)와 함수는 지우지 않고 화면에서만 뺐다.

create function admin_list_store_info()
returns table (store_id uuid, name text, phone text, category text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.phone, s.category, s.created_at
    from stores s
   where okc_is_admin() and not okc_is_anonymous()
   order by s.created_at desc
$$;

create function admin_set_store_phone(p_store_id uuid, p_phone text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not okc_is_admin() or okc_is_anonymous() then
    raise exception 'NOT_ADMIN';
  end if;
  update stores set phone = _okc_normalize_phone(p_phone) where id = p_store_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

-- 새 가게 등록. 전화번호는 가게 전화번호로 저장한다 (가게 페이지에 공개된다)
create or replace function admin_register_store(
  p_name text,
  p_category text default null,
  p_address text default null,
  p_regular_hours jsonb default null,
  p_is_pilot boolean default true,
  p_phone text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if not okc_is_admin() or okc_is_anonymous() then
    raise exception 'NOT_ADMIN';
  end if;
  v_id := admin_upsert_store(p_name, p_category, p_address, p_regular_hours, p_is_pilot, null);
  if nullif(btrim(p_phone), '') is not null then
    update stores set phone = _okc_normalize_phone(p_phone) where id = v_id;
  end if;
  return jsonb_build_object('store_id', v_id);
end;
$$;

revoke execute on function public.admin_list_store_info() from public, anon;
grant execute on function public.admin_list_store_info() to authenticated, service_role;
revoke execute on function public.admin_set_store_phone(uuid, text) from public, anon;
grant execute on function public.admin_set_store_phone(uuid, text) to authenticated, service_role;
