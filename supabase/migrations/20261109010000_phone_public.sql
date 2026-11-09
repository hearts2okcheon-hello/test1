-- 가게 전화번호 공개를 사장님이 고른다. 새 가게는 공개하지 않는 것이 기본 (ADR-010)
alter table stores add column phone_public boolean not null default false;
-- 지금까지 등록한 가게는 공개로 안내하고 받았으므로 그대로 둔다
update stores set phone_public = true where phone is not null;

-- 비공개 번호가 표를 직접 읽어 새지 않도록 전화번호 칸은 RPC 로만 준다
do $$
declare
  cols text;
begin
  select string_agg(quote_ident(column_name), ', ') into cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'stores' and column_name not in ('phone', 'phone_public');
  execute 'revoke select on public.stores from anon, authenticated';
  execute format('grant select (%s) on public.stores to anon, authenticated', cols);
end;
$$;

-- 상세: phone 은 공개한 번호만, manage_phone 은 관리할 수 있는 사람에게만
do $$
declare
  d text;
  old_part text := $o$jsonb_build_object('phone', s.phone, 'intro', s.intro)$o$;
  new_part text := $n$jsonb_build_object('phone', case when s.phone_public then s.phone end, 'intro', s.intro, 'phone_public', s.phone_public, 'manage_phone', case when okc_can_edit_store(p_store_id::text) then s.phone end)$n$;
begin
  d := pg_get_functiondef('public.get_store_detail(uuid)'::regprocedure);
  if position(old_part in d) = 0 then
    raise exception 'get_store_detail 본문이 예상과 다릅니다';
  end if;
  execute replace(d, old_part, new_part);
end;
$$;

drop function register_store(text, text, jsonb, text, text, text, text);
create function register_store(
  p_name text, p_phone text, p_regular_hours jsonb,
  p_category text default null, p_neighborhood text default null,
  p_intro text default null, p_address text default null,
  p_phone_public boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_code owner_codes;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  select c.* into v_code
    from owner_code_members m join owner_codes c on c.id = m.code_id
   where m.user_id = auth.uid()
   order by m.created_at desc limit 1
     for update of c;

  if v_code.id is null then
    if okc_is_anonymous() then
      raise exception 'LOGIN_REQUIRED';
    end if;
    if exists (select 1 from store_members where user_id = auth.uid()) then
      raise exception 'ALREADY_REGISTERED';
    end if;
  elsif v_code.store_id is not null then
    raise exception 'ALREADY_REGISTERED';
  end if;
  perform _okc_check_store_fields(p_name, p_phone, p_intro, p_regular_hours);

  insert into stores (name, category, neighborhood, phone, phone_public, intro, address, regular_hours)
  values (btrim(p_name), nullif(btrim(p_category), ''), nullif(btrim(p_neighborhood), ''),
          _okc_normalize_phone(p_phone), coalesce(p_phone_public, false),
          nullif(btrim(p_intro), ''), nullif(btrim(p_address), ''), p_regular_hours)
  returning id into v_id;

  insert into profiles (id, role) values (auth.uid(), 'owner') on conflict (id) do nothing;
  if v_code.id is not null then
    update owner_codes set store_id = v_id where id = v_code.id;
    insert into store_members (store_id, user_id)
    select v_id, m.user_id from owner_code_members m where m.code_id = v_code.id;
  else
    insert into store_members (store_id, user_id) values (v_id, auth.uid());
  end if;

  insert into events (name, store_id) values ('store_registered', v_id);
  return v_id;
end;
$$;

drop function update_store_profile(uuid, text, text, jsonb, text, text, text, text);
create function update_store_profile(
  p_store_id uuid, p_name text, p_phone text, p_regular_hours jsonb,
  p_category text default null, p_neighborhood text default null,
  p_intro text default null, p_address text default null,
  p_phone_public boolean default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _okc_actor_source(p_store_id);
  perform _okc_check_store_fields(p_name, p_phone, p_intro, p_regular_hours);
  update stores
     set name = btrim(p_name),
         phone = _okc_normalize_phone(p_phone),
         phone_public = coalesce(p_phone_public, phone_public),
         regular_hours = p_regular_hours,
         category = nullif(btrim(p_category), ''),
         neighborhood = nullif(btrim(p_neighborhood), ''),
         intro = nullif(btrim(p_intro), ''),
         address = nullif(btrim(p_address), '')
   where id = p_store_id;
end;
$$;

drop function admin_register_store(text, text, text, jsonb, boolean, text);
create function admin_register_store(
  p_name text,
  p_category text default null,
  p_address text default null,
  p_regular_hours jsonb default null,
  p_is_pilot boolean default true,
  p_phone text default null,
  p_phone_public boolean default false
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
    update stores set phone = _okc_normalize_phone(p_phone), phone_public = coalesce(p_phone_public, false) where id = v_id;
  end if;
  return jsonb_build_object('store_id', v_id);
end;
$$;

do $$
declare
  f text;
  fns text[] := array[
    'register_store(text, text, jsonb, text, text, text, text, boolean)',
    'update_store_profile(uuid, text, text, jsonb, text, text, text, text, boolean)',
    'admin_register_store(text, text, text, jsonb, boolean, text, boolean)'
  ];
begin
  foreach f in array fns loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end;
$$;
