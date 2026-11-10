-- 휴대폰 알림(웹 푸시, ADR-013). 세 가지만 보낸다:
--  1) 사장님: 이웃 제보가 왔어요
--  2) 즐겨찾기한 주민: 그 가게가 문 열었어요 / 재료 소진 / 임시휴무
--  3) 사장님: 평소 여는 시간이 지났는데 오늘 소식이 없어요
-- DB 가 보낼 알림을 push_outbox 에 쌓고, pg_net 으로 앱 서버(/api/push/dispatch)를 깨워 보낸다.
-- 서버 주소와 비밀값은 저장소에 넣지 않고 Supabase Vault(push_dispatch_url, push_dispatch_secret)에 둔다.

create extension if not exists pg_net;
create extension if not exists pg_cron;

create table push_subscriptions (
  endpoint text primary key check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  user_id uuid not null,
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user on push_subscriptions (user_id);

create table push_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  title text not null,
  body text not null,
  url text not null default '/',
  tag text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index push_outbox_unsent on push_outbox (id) where sent_at is null;

-- 오픈 시간 알림은 가게마다 하루 한 번
create table push_reminders (
  store_id uuid not null references stores(id) on delete cascade,
  day date not null,
  primary key (store_id, day)
);

alter table push_subscriptions enable row level security;
alter table push_outbox enable row level security;
alter table push_reminders enable row level security;
revoke all on push_subscriptions, push_outbox, push_reminders from public, anon, authenticated;

-- ── 이 기기에서 알림 받기 / 끄기 ─────────────────────
create function save_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000 or char_length(p_p256dh) > 200 or char_length(p_auth) > 100 then
    raise exception 'INVALID_BODY';
  end if;
  insert into push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
end;
$$;

create function delete_push_subscription(p_endpoint text) returns void
language sql security definer set search_path = public as $$
  delete from push_subscriptions where endpoint = p_endpoint and user_id = auth.uid()
$$;

-- ── 보내기: 앱 서버를 깨운다 ─────────────────────────
create function _okc_vault(p_name text) returns text
language sql stable security definer set search_path = public as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name limit 1
$$;
revoke execute on function _okc_vault(text) from public, anon, authenticated;

create function _okc_kick_push() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_url text := _okc_vault('push_dispatch_url');
  v_secret text := _okc_vault('push_dispatch_secret');
begin
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(url := v_url, body := '{}'::jsonb, headers := jsonb_build_object('content-type', 'application/json', 'x-push-secret', v_secret), timeout_milliseconds := 10000);
end;
$$;
revoke execute on function _okc_kick_push() from public, anon, authenticated;

create function _okc_push_outbox_kick() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform _okc_kick_push();
  return null;
end;
$$;
create trigger push_outbox_kick after insert on push_outbox for each statement execute function _okc_push_outbox_kick();

-- 앱 서버가 보낼 것을 가져간다 (가져가면 보낸 것으로 표시, 하루 지난 것은 버린다)
create function claim_push_batch(p_secret text, p_limit int default 200)
returns table (endpoint text, p256dh text, auth text, title text, body text, url text, tag text)
language plpgsql security definer set search_path = public as $
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
    returning o.user_id, o.title, o.body, o.url, o.tag
  )
  select s.endpoint, s.p256dh, s.auth, p.title, p.body, p.url, p.tag
    from picked p join push_subscriptions s on s.user_id = p.user_id;
end;
$$;

-- 더는 받지 못하는 기기(앱 삭제·알림 끔)를 지운다
create function forget_push_endpoints(p_secret text, p_endpoints text[]) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_secret text := _okc_vault('push_dispatch_secret');
begin
  if v_secret is null or p_secret is distinct from v_secret then
    raise exception 'NOT_ADMIN';
  end if;
  delete from push_subscriptions where endpoint = any (p_endpoints);
end;
$$;

-- ── 1) 사장님: 이웃 제보가 왔어요 ───────────────────
create function _okc_push_on_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'seen_long_line' then
    return null;
  end if;
  insert into push_outbox (user_id, title, body, url, tag)
  select m.user_id, '🔔 이웃 제보가 왔어요',
         s.name || ': "' || case new.kind when 'seen_closed' then '문 닫혀 있었어요' when 'seen_open' then '열려 있었어요' else '재료 다 떨어졌대요' end
                || '" 눌러서 답해 주세요',
         '/owner', 'report-' || s.id
    from store_members m join stores s on s.id = m.store_id
   where m.store_id = new.store_id;
  return null;
end;
$$;
create trigger reports_push after insert on reports for each row execute function _okc_push_on_report();

-- ── 2) 즐겨찾기: 문 열었어요 / 재료 소진 / 임시휴무 ─────
create function _okc_push_on_notice() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind not in ('open', 'sold_out') then
    return null;
  end if;
  insert into push_outbox (user_id, title, body, url, tag)
  select f.user_id, '⭐ ' || s.name,
         case new.kind when 'open' then '오늘 문 열었어요' else '재료가 다 떨어졌어요' end || coalesce(' · ' || new.memo, ''),
         '/stores/' || s.id, 'store-' || s.id
    from store_favorites f join stores s on s.id = f.store_id
   where f.store_id = new.store_id and f.user_id is distinct from new.created_by;
  return null;
end;
$$;
create trigger notices_push after insert on notices for each row execute function _okc_push_on_notice();

create function _okc_push_on_closure() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into push_outbox (user_id, title, body, url, tag)
  select f.user_id, '⭐ ' || s.name,
         '임시휴무 ' || to_char(new.start_date, 'FMMM/FMDD')
           || case when new.end_date > new.start_date then '~' || to_char(new.end_date, 'FMMM/FMDD') else '' end
           || coalesce(' · ' || new.reason, ''),
         '/stores/' || s.id, 'store-' || s.id
    from store_favorites f join stores s on s.id = f.store_id
   where f.store_id = new.store_id and f.user_id is distinct from new.created_by;
  return null;
end;
$$;
create trigger temp_closures_push after insert on temp_closures for each row execute function _okc_push_on_closure();

-- ── 3) 사장님: 여는 시간이 지났는데 오늘 소식이 없어요 ─────
-- 평소 여는 시각부터 1시간 안에, 오늘 올린 공지가 없고 임시휴무도 아니면 하루 한 번
create function enqueue_open_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare
  v_now timestamp := now() at time zone 'Asia/Seoul';
  v_day text := lower(to_char(v_now, 'Dy'));
  v_n int;
begin
  with due as (
    select s.id, s.name, (s.regular_hours -> v_day -> 0 ->> 0) as open_at
      from stores s
     where exists (select 1 from store_members m where m.store_id = s.id)
       and jsonb_typeof(s.regular_hours -> v_day -> 0) = 'array'
       -- 시각끼리 빼서 비교한다 (밤 11시에 여는 가게도 자정을 넘겨 틀리지 않게)
       and v_now::time - (s.regular_hours -> v_day -> 0 ->> 0)::time between interval '0' and interval '59 minutes'
       and not exists (select 1 from notices n where n.store_id = s.id and (n.created_at at time zone 'Asia/Seoul')::date = v_now::date)
       and not exists (select 1 from temp_closures c where c.store_id = s.id and c.canceled_at is null and v_now::date between c.start_date and c.end_date)
       and not exists (select 1 from push_reminders r where r.store_id = s.id and r.day = v_now::date)
  ), marked as (
    insert into push_reminders (store_id, day) select id, v_now::date from due
    on conflict do nothing
    returning store_id
  ), queued as (
    insert into push_outbox (user_id, title, body, url, tag)
    select m.user_id, '사장님, 오늘 문 여셨나요?',
           d.name || ' 평소 여는 시간(' || d.open_at || ')이 지났어요. 눌러서 바로 알려 주세요',
           '/owner', 'open-' || d.id
      from due d join marked k on k.store_id = d.id join store_members m on m.store_id = d.id
    returning 1
  )
  select count(*) into v_n from queued;

  -- 못 보낸 알림이 남아 있으면 다시 깨운다
  if exists (select 1 from push_outbox where sent_at is null and created_at > now() - interval '1 day') then
    perform _okc_kick_push();
  end if;
  return v_n;
end;
$$;
revoke execute on function enqueue_open_reminders() from public, anon, authenticated;

select cron.schedule('oksori-open-reminders', '*/5 * * * *', $$select public.enqueue_open_reminders()$$);

do $$
declare
  f text;
  fns text[] := array['save_push_subscription(text, text, text)', 'delete_push_subscription(text)'];
begin
  foreach f in array fns loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end;
$$;
grant execute on function claim_push_batch(text, integer) to anon, authenticated, service_role;
grant execute on function forget_push_endpoints(text, text[]) to anon, authenticated, service_role;
