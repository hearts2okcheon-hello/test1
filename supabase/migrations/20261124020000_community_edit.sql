-- 동네 이야기 고치기 (ADR-025)
-- 글쓴이 본인만 자기 글을 고친다. 관리자도 남의 글을 고치지는 못한다(지우기만 한다).
-- 표·칸은 그대로 두고 함수 하나만 더한다. 작성자 id 는 여전히 어떤 응답에도 나가지 않는다

create function update_community_post(p_post_id uuid, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_body text := btrim(p_body);
begin
  if auth.uid() is null or okc_is_anonymous() then
    raise exception 'LOGIN_REQUIRED';
  end if;
  if v_body is null or v_body = '' then
    raise exception 'INVALID_BODY';
  end if;
  if char_length(v_body) > 500 then
    raise exception 'TEXT_TOO_LONG';
  end if;
  update community_posts
     set body = v_body
   where id = p_post_id and deleted_at is null and author_id = auth.uid();
  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

revoke execute on function update_community_post(uuid, text) from public, anon;
grant execute on function update_community_post(uuid, text) to authenticated, service_role;
