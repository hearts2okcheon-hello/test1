-- 가입할 때 "가게를 등록할 것입니까?" (ADR-019)
-- wants_store: true 예 · false 아니요 · null 아직 묻지 않음 (이 질문이 생기기 전에 가입한 사람. 예로 본다)
alter table profiles add column wants_store boolean;

-- 내 정보 저장: 가게 등록 여부를 함께 받는다. 안 보내면(null) 예전 답을 그대로 둔다
drop function save_my_profile(text, text, text, text, text);
create function save_my_profile(p_name text, p_area text, p_phone text, p_avatar_url text default null, p_nickname text default null,
                                p_wants_store boolean default null) returns void
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
  insert into profiles (id, display_name, nickname, area, phone, avatar_url, registered_at, wants_store)
  values (auth.uid(), v_name, v_nick, v_area, v_phone, p_avatar_url, now(), p_wants_store)
  on conflict (id) do update
    set display_name = excluded.display_name, nickname = excluded.nickname, area = excluded.area, phone = excluded.phone,
        avatar_url = excluded.avatar_url, registered_at = coalesce(profiles.registered_at, now()),
        wants_store = coalesce(excluded.wants_store, profiles.wants_store);
end;
$$;

-- 사장님 메뉴(쓰기의 "사장님 소식")를 보여 줄 사람인가:
-- 카카오로 로그인했고, 가게가 있거나 · 가게 코드를 받았거나 · 내 정보를 등록하며 가게를 등록하겠다고 답한 사람
create function okc_owner_mode() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and not okc_is_anonymous()
     and (exists (select 1 from store_members m where m.user_id = auth.uid())
          or exists (select 1 from owner_code_members m where m.user_id = auth.uid())
          or exists (select 1 from profiles p
                      where p.id = auth.uid() and p.registered_at is not null and coalesce(p.wants_store, true)))
$$;

-- 내 공간: 프로필에 가게 등록 여부(wants_store)를 함께 준다
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
                            'registered', p.registered_at is not null, 'store_ack', p.store_notice_ack_at is not null,
                            'wants_store', p.wants_store)
    into v_profile from profiles p where p.id = auth.uid();
  v_profile := coalesce(v_profile, jsonb_build_object('name', null, 'nickname', null, 'area', null, 'phone', null, 'avatar_url', null,
                                                      'registered', false, 'store_ack', false, 'wants_store', null));

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

-- 계정 삭제: 가게 등록 여부도 지운다 (다시 가입하면 다시 묻는다)
create or replace function delete_my_account() returns void
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
         registered_at = null, store_notice_ack_at = null, wants_store = null
   where id = auth.uid();
  insert into events (name) values ('account_deleted');
end;
$$;

revoke execute on function public.save_my_profile(text, text, text, text, text, boolean) from public, anon;
grant execute on function public.save_my_profile(text, text, text, text, text, boolean) to authenticated, service_role;
-- 로그인하지 않은 주민 화면에서도 부른다 (그때는 false)
revoke execute on function public.okc_owner_mode() from public;
grant execute on function public.okc_owner_mode() to anon, authenticated, service_role;
