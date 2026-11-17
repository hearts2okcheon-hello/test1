-- 알림 보관함: 보낸 알림(push_outbox)을 그대로 "받은 알림 목록"으로 쓴다.
-- 읽은 시각(read_at)을 남겨, 안 읽은 수를 앱 아이콘 숫자로 보여 준다. 새 알림 종류는 없다 (ADR-013 네 가지 그대로)

alter table push_outbox add column read_at timestamptz;
create index push_outbox_inbox on push_outbox (user_id, created_at desc);

-- 안 읽은 알림 수 (최근 30일)
create function _okc_unread_alerts(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from push_outbox
   where user_id = p_user and read_at is null and created_at > now() - interval '30 days'
$$;
revoke execute on function _okc_unread_alerts(uuid) from public, anon, authenticated;

-- 내가 받은 알림 (최근 30일, 새것부터)
create function get_my_alerts(p_limit int default 50)
returns table (id bigint, title text, body text, url text, created_at timestamptz, is_read boolean)
language sql stable security definer set search_path = public as $$
  select o.id, o.title, o.body, o.url, o.created_at, o.read_at is not null
    from push_outbox o
   where o.user_id = auth.uid() and o.created_at > now() - interval '30 days'
   order by o.created_at desc, o.id desc
   limit greatest(1, least(coalesce(p_limit, 50), 100))
$$;

create function get_my_alert_count() returns int
language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then 0 else _okc_unread_alerts(auth.uid()) end
$$;

-- 알림 하나를 읽음으로. 남은 안 읽은 수를 돌려준다
create function mark_alert_read(p_id bigint) returns int
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return 0;
  end if;
  update push_outbox set read_at = now() where id = p_id and user_id = auth.uid() and read_at is null;
  return _okc_unread_alerts(auth.uid());
end;
$$;

create function mark_all_alerts_read() returns int
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    update push_outbox set read_at = now() where user_id = auth.uid() and read_at is null;
  end if;
  return 0;
end;
$$;

-- 보낼 때 알림 번호와 안 읽은 수를 함께 준다 (앱 아이콘 숫자, 눌렀을 때 읽음 처리)
drop function claim_push_batch(text, int);
create function claim_push_batch(p_secret text, p_limit int default 200)
returns table (endpoint text, p256dh text, auth text, title text, body text, url text, tag text, alert_id bigint, badge int)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_secret text := _okc_vault('push_dispatch_secret');
begin
  if v_secret is null or p_secret is distinct from v_secret then
    raise exception 'NOT_ADMIN';
  end if;
  return query
  with picked as (
    update push_outbox o set sent_at = now()
     where o.id in (select x.id from push_outbox x
                     where x.sent_at is null and x.created_at > now() - interval '1 day'
                     order by x.id limit greatest(1, least(p_limit, 500))
                     for update skip locked)
    returning o.id, o.user_id, o.title, o.body, o.url, o.tag
  )
  select s.endpoint, s.p256dh, s.auth, p.title, p.body, p.url, p.tag, p.id, _okc_unread_alerts(p.user_id)
    from picked p join push_subscriptions s on s.user_id = p.user_id;
end;
$$;
grant execute on function claim_push_batch(text, integer) to anon, authenticated, service_role;

do $$
declare
  f text;
  fns text[] := array['get_my_alerts(integer)', 'get_my_alert_count()', 'mark_alert_read(bigint)', 'mark_all_alerts_read()'];
begin
  foreach f in array fns loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end;
$$;
