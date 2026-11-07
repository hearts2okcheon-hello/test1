-- 관리자: 코드·가게 지우기, 지우면 안 되는 코드 보호, 새 가게를 등록하며 코드와 연결 (ADR-008)
-- 어떤 번호를 보호하는지와 비밀번호는 저장소에 넣지 않고 DB에서 직접 설정한다.

alter table owner_codes add column protected boolean not null default false;

-- 정책 없음 = 직접 접근 불가. 비밀번호는 해시로만 둔다
create table okc_secrets (
  key text primary key,
  hash text not null,
  updated_at timestamptz not null default now()
);
alter table okc_secrets enable row level security;
revoke all on okc_secrets from public, anon, authenticated;

-- 'OK' / 'WRONG_PASSWORD' / 'TOO_MANY_ATTEMPTS'. 10분 안에 5번 틀리면 잠시 막는다.
-- 틀린 기록이 남도록 예외를 던지지 않고 값으로 돌려준다.
create function _okc_check_delete_password(p_password text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_hash text;
begin
  if (select count(*) from code_attempts
       where user_id = auth.uid() and not ok and created_at > now() - interval '10 minutes') >= 5 then
    return 'TOO_MANY_ATTEMPTS';
  end if;
  select hash into v_hash from okc_secrets where key = 'protected_delete';
  if v_hash is null or p_password is null or extensions.crypt(p_password, v_hash) <> v_hash then
    insert into code_attempts (user_id, ok) values (auth.uid(), false);
    return 'WRONG_PASSWORD';
  end if;
  return 'OK';
end;
$$;

-- 화면이 사진을 먼저 지우기 전에 비밀번호를 확인한다
create function admin_verify_delete_password(p_password text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_result text;
begin
  if not okc_is_admin() or okc_is_anonymous() then
    raise exception 'NOT_ADMIN';
  end if;
  v_result := _okc_check_delete_password(p_password);
  if v_result <> 'OK' then
    return jsonb_build_object('ok', false, 'error', v_result);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- 코드를 지운다. 가게는 남고, 그 코드로 연결된 기기는 끊어진다
create function admin_delete_code(p_phone text, p_password text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row owner_codes;
  v_result text;
begin
  if not okc_is_admin() or okc_is_anonymous() then
    raise exception 'NOT_ADMIN';
  end if;
  select * into v_row from owner_codes where phone = _okc_normalize_phone(p_phone);
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_row.protected then
    v_result := _okc_check_delete_password(p_password);
    if v_result <> 'OK' then
      return jsonb_build_object('ok', false, 'error', v_result);
    end if;
  end if;
  if v_row.store_id is not null then
    delete from store_members where store_id = v_row.store_id;
  end if;
  delete from owner_codes where id = v_row.id;
  return jsonb_build_object('ok', true);
end;
$$;

-- 가게를 지운다. 소식·메뉴·사진 기록·공지·제보도 함께 지워지고, 코드는 "가게 등록 전"으로 돌아간다.
-- 보호된 코드와 연결된 가게는 비밀번호가 필요하다 (코드의 연결이 바뀌므로)
create function admin_delete_store(p_store_id uuid, p_password text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_result text;
begin
  if not okc_is_admin() or okc_is_anonymous() then
    raise exception 'NOT_ADMIN';
  end if;
  if not exists (select 1 from stores where id = p_store_id) then
    raise exception 'NOT_FOUND';
  end if;
  if exists (select 1 from owner_codes where store_id = p_store_id and protected) then
    v_result := _okc_check_delete_password(p_password);
    if v_result <> 'OK' then
      return jsonb_build_object('ok', false, 'error', v_result);
    end if;
  end if;
  delete from stores where id = p_store_id;
  return jsonb_build_object('ok', true);
end;
$$;

-- 새 가게 등록 + (번호를 넣으면) 코드 연결을 한 번에. 연결에 실패하면 가게도 만들지 않는다.
-- 사장님 번호를 가게 전화번호로 공개하지는 않는다.
create function admin_register_store(
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
  v_code jsonb;
begin
  if not okc_is_admin() or okc_is_anonymous() then
    raise exception 'NOT_ADMIN';
  end if;
  v_id := admin_upsert_store(p_name, p_category, p_address, p_regular_hours, p_is_pilot, null);
  if nullif(btrim(p_phone), '') is not null then
    v_code := admin_issue_code(p_phone, v_id);
  end if;
  return jsonb_build_object('store_id', v_id, 'code', v_code ->> 'code', 'phone', v_code ->> 'phone');
end;
$$;

-- 보호된 코드는 새 코드로 바꿀 수 없다
create or replace function admin_reissue_code(p_phone text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row owner_codes;
begin
  if not okc_is_admin() or okc_is_anonymous() then
    raise exception 'NOT_ADMIN';
  end if;
  if exists (select 1 from owner_codes where phone = _okc_normalize_phone(p_phone) and protected) then
    raise exception 'PROTECTED_CODE';
  end if;
  update owner_codes set code = _okc_new_code(), created_by = auth.uid(), created_at = now()
   where phone = _okc_normalize_phone(p_phone)
  returning * into v_row;
  if v_row.id is null then
    raise exception 'NOT_FOUND';
  end if;
  delete from owner_code_members where code_id = v_row.id;
  if v_row.store_id is not null then
    delete from store_members where store_id = v_row.store_id;
  end if;
  return jsonb_build_object('phone', v_row.phone, 'code', v_row.code);
end;
$$;

drop function admin_list_owner_codes();
create function admin_list_owner_codes()
returns table (
  phone text, code text, code_created_at timestamptz,
  store_id uuid, store_name text, member_count int, protected boolean
)
language sql stable security definer set search_path = public as $$
  select c.phone, c.code, c.created_at, s.id, s.name,
         (select count(*)::int from owner_code_members m where m.code_id = c.id),
         c.protected
    from owner_codes c
    left join stores s on s.id = c.store_id
   where okc_is_admin() and not okc_is_anonymous()
   order by c.created_at desc
$$;

revoke execute on function _okc_check_delete_password(text) from public, anon, authenticated;

do $$
declare
  f text;
  fns text[] := array[
    'admin_verify_delete_password(text)',
    'admin_delete_code(text, text)',
    'admin_delete_store(uuid, text)',
    'admin_register_store(text, text, text, jsonb, boolean, text)',
    'admin_list_owner_codes()'
  ];
begin
  foreach f in array fns loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end;
$$;
