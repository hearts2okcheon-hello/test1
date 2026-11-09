-- 사장님은 카카오 계정으로 로그인해 바로 가게를 등록한다. 옥천신문 승인·코드 없이 (ADR-009)
-- 익명 세션(주민)은 가게를 등록할 수 없다. 카카오 계정 하나에 가게 하나.
-- 예전 코드로 연결된 사장님은 그대로 쓴다.

create or replace function get_owner_home() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_store uuid;
  v_code owner_codes;
begin
  if auth.uid() is null then
    return jsonb_build_object('state', 'no_store', 'is_admin', false, 'signed_in', false);
  end if;

  select c.* into v_code
    from owner_code_members m join owner_codes c on c.id = m.code_id
   where m.user_id = auth.uid()
   order by m.created_at desc limit 1;

  -- 코드는 넣었지만 아직 가게를 등록하지 않았다
  if v_code.id is not null and v_code.store_id is null then
    return jsonb_build_object('state', 'needs_store', 'is_admin', okc_is_admin(),
                              'code', v_code.code, 'phone', v_code.phone);
  end if;

  select store_id into v_store from store_members where user_id = auth.uid() order by created_at desc limit 1;

  if v_store is null then
    -- 카카오로 로그인한 사장님(관리자 제외)은 바로 등록 화면으로
    if not okc_is_anonymous() and not okc_is_admin() then
      return jsonb_build_object('state', 'needs_store', 'is_admin', false, 'code', null, 'phone', null);
    end if;
    return jsonb_build_object('state', 'no_store', 'is_admin', okc_is_admin(), 'signed_in', not okc_is_anonymous());
  end if;

  return jsonb_build_object(
    'state', 'owner',
    'is_admin', okc_is_admin(),
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

create or replace function register_store(
  p_name text, p_phone text, p_regular_hours jsonb,
  p_category text default null, p_neighborhood text default null,
  p_intro text default null, p_address text default null
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
    -- 코드가 없으면 카카오 계정이어야 한다
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

  insert into stores (name, category, neighborhood, phone, intro, address, regular_hours)
  values (btrim(p_name), nullif(btrim(p_category), ''), nullif(btrim(p_neighborhood), ''),
          _okc_normalize_phone(p_phone), nullif(btrim(p_intro), ''), nullif(btrim(p_address), ''), p_regular_hours)
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
