-- 닉네임 · 관리자 주민 정보 · 계정 삭제 (ADR-014 보완)
alter table profiles add column nickname text check (char_length(nickname) <= 20);

-- 닉네임을 안 정하면 "익명의 오소리 NNN" 을 만들어 준다 (이미 있으면 그대로)
drop function save_my_profile(text, text, text, text);
create function save_my_profile(p_name text, p_area text, p_phone text, p_avatar_url text default null, p_nickname text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_area text := btrim(coalesce(p_area, ''));
  v_nick text := nullif(btrim(coalesce(p_nickname, '')), '');
  v_phone text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if okc_is_anonymous() then
    raise exception 'LOGIN_REQUIRED';
  end if;
  if v_name = '' or char_length(v_name) > 20 then
    raise exception 'INVALID_MY_NAME';
  end if;
  if v_area = '' or char_length(v_area) > 20 then
    raise exception 'INVALID_AREA';
  end if;
  if char_length(v_nick) > 20 then
    raise exception 'INVALID_NICKNAME';
  end if;
  v_phone := _okc_normalize_phone(p_phone);
  if p_avatar_url is not null
     and position('/storage/v1/object/public/store-media/avatars/' || auth.uid()::text || '/' in p_avatar_url) = 0 then
    raise exception 'INVALID_PHOTO';
  end if;
  if v_nick is null then
    v_nick := coalesce((select nickname from profiles where id = auth.uid()),
                       '익명의 오소리 ' || (100 + floor(random() * 900))::int);
  end if;
  insert into profiles (id, display_name, nickname, area, phone, avatar_url, registered_at)
  values (auth.uid(), v_name, v_nick, v_area, v_phone, p_avatar_url, now())
  on conflict (id) do update
    set display_name = excluded.display_name, nickname = excluded.nickname, area = excluded.area, phone = excluded.phone,
        avatar_url = excluded.avatar_url, registered_at = coalesce(profiles.registered_at, now());
end;
$$;

create or replace function get_owner_home() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_store uuid;
  v_code owner_codes;
  v_profile jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('state', 'no_store', 'is_admin', false, 'signed_in', false);
  end if;

  select jsonb_build_object('name', p.display_name, 'nickname', p.nickname, 'area', p.area, 'phone', p.phone, 'avatar_url', p.avatar_url,
                            'registered', p.registered_at is not null, 'store_ack', p.store_notice_ack_at is not null)
    into v_profile from profiles p where p.id = auth.uid();
  v_profile := coalesce(v_profile, jsonb_build_object('name', null, 'nickname', null, 'area', null, 'phone', null, 'avatar_url', null,
                                                      'registered', false, 'store_ack', false));

  select c.* into v_code
    from owner_code_members m join owner_codes c on c.id = m.code_id
   where m.user_id = auth.uid()
   order by m.created_at desc limit 1;

  if v_code.id is not null and v_code.store_id is null then
    return jsonb_build_object('state', 'needs_store', 'is_admin', okc_is_admin(),
                              'code', v_code.code, 'phone', v_code.phone, 'profile', v_profile);
  end if;

  select store_id into v_store from store_members where user_id = auth.uid() order by created_at desc limit 1;

  if v_store is null then
    if not okc_is_anonymous() and not okc_is_admin() then
      return jsonb_build_object('state', 'needs_store', 'is_admin', false, 'code', null, 'phone', null, 'profile', v_profile);
    end if;
    return jsonb_build_object('state', 'no_store', 'is_admin', okc_is_admin(), 'signed_in', not okc_is_anonymous());
  end if;

  return jsonb_build_object(
    'state', 'owner',
    'is_admin', okc_is_admin(),
    'profile', v_profile,
    'code', (select c.code from owner_codes c where c.store_id = v_store),
    'store', (select to_jsonb(t) from get_store_signs() t where t.store_id = v_store),
    'notice', (
      select jsonb_build_object('id', n.id, 'kind', n.kind, 'at_time', n.at_time, 'memo', n.memo,
                                'source', n.source, 'created_at', n.created_at,
                                'created_by_me', n.created_by = auth.uid(),
                                'from_report', n.from_report_id is not null)
        from notices n
       where n.id = (select c.notice_id from current_sign(v_store) c)),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'kind', r.kind, 'created_at', r.created_at,
               'agree_count', (select count(*) from report_agrees a where a.report_id = r.id))
             order by r.created_at desc)
        from reports r
       where r.store_id = v_store and r.status = 'pending' and r.expires_at > now()
         and r.kind <> 'seen_long_line'), '[]'::jsonb)
  );
end;
$$;

-- ── 관리자: 주민 정보 ─────────────────────────────────
create function admin_list_residents()
returns table (user_id uuid, name text, nickname text, area text, phone text, registered_at timestamptz, store_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.nickname, p.area, p.phone, p.registered_at,
         (select s.name from store_members m join stores s on s.id = m.store_id where m.user_id = p.id order by m.created_at desc limit 1)
    from profiles p
   where okc_is_admin() and not okc_is_anonymous() and p.registered_at is not null
   order by p.registered_at desc
$$;

create function admin_update_resident(p_user_id uuid, p_name text, p_nickname text, p_area text, p_phone text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_area text := btrim(coalesce(p_area, ''));
  v_nick text := nullif(btrim(coalesce(p_nickname, '')), '');
begin
  if not okc_is_admin() or okc_is_anonymous() then
    raise exception 'NOT_ADMIN';
  end if;
  if v_name = '' or char_length(v_name) > 20 then
    raise exception 'INVALID_MY_NAME';
  end if;
  if v_area = '' or char_length(v_area) > 20 then
    raise exception 'INVALID_AREA';
  end if;
  if char_length(v_nick) > 20 then
    raise exception 'INVALID_NICKNAME';
  end if;
  update profiles
     set display_name = v_name, nickname = coalesce(v_nick, nickname), area = v_area, phone = _okc_normalize_phone(p_phone)
   where id = p_user_id and registered_at is not null;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

-- ── 계정 삭제 ───────────────────────────────────────
-- 내 정보·즐겨찾기·알림 구독을 지우고 가게 연결을 끊는다. 나만 관리하던 가게는 함께 지운다.
-- 카카오 로그인 자체는 남으므로 다시 로그인하면 내 정보 등록부터 새로 한다
create function delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_store uuid;
begin
  if auth.uid() is null or okc_is_anonymous() then
    raise exception 'LOGIN_REQUIRED';
  end if;
  for v_store in select store_id from store_members where user_id = auth.uid() loop
    delete from store_members where store_id = v_store and user_id = auth.uid();
    if not exists (select 1 from store_members where store_id = v_store) then
      delete from stores where id = v_store;
    end if;
  end loop;
  delete from owner_code_members where user_id = auth.uid();
  delete from store_favorites where user_id = auth.uid();
  delete from push_subscriptions where user_id = auth.uid();
  delete from push_outbox where user_id = auth.uid() and sent_at is null;
  update profiles
     set display_name = null, nickname = null, area = null, phone = null, avatar_url = null,
         registered_at = null, store_notice_ack_at = null
   where id = auth.uid();
  insert into events (name) values ('account_deleted');
end;
$$;

do $$
declare
  f text;
  fns text[] := array['save_my_profile(text, text, text, text, text)', 'admin_list_residents()',
                      'admin_update_resident(uuid, text, text, text, text)', 'delete_my_account()'];
begin
  foreach f in array fns loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end;
$$;
