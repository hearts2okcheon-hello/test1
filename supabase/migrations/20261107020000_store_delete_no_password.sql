-- 보호는 코드에만 건다. 가게는 보호 코드와 연결돼 있어도 비밀번호 없이 지운다 (ADR-008)
drop function admin_verify_delete_password(text);
drop function admin_delete_store(uuid, text);

create function admin_delete_store(p_store_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not okc_is_admin() or okc_is_anonymous() then
    raise exception 'NOT_ADMIN';
  end if;
  if not exists (select 1 from stores where id = p_store_id) then
    raise exception 'NOT_FOUND';
  end if;
  delete from stores where id = p_store_id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.admin_delete_store(uuid) from public, anon;
grant execute on function public.admin_delete_store(uuid) to authenticated, service_role;
