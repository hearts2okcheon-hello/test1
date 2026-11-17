-- 알림 보관함 · 안 읽은 수 (test.md T-ALERT-01~05)
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'me@test.local'), ('00000000-0000-0000-0000-0000000000e2', 'other@test.local');
insert into push_outbox (user_id, title, body, url, created_at) values
  ('00000000-0000-0000-0000-0000000000e1', '⭐ 가게1', '오늘 문 열었어요', '/stores/1', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-0000000000e1', '⭐ 가게2', '재료가 다 떨어졌어요', '/stores/2', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-0000000000e1', '옛 알림', '한 달도 더 전', '/', now() - interval '40 days'),
  ('00000000-0000-0000-0000-0000000000e2', '남의 알림', '보이면 안 됨', '/', now());

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
select is((select string_agg(title, ',') from get_my_alerts()), '⭐ 가게2,⭐ 가게1', 'T-ALERT-01 내 알림만, 최근 30일, 새것부터');
select is(get_my_alert_count(), 2, 'T-ALERT-02 안 읽은 수');
select is(mark_alert_read((select id from push_outbox where title = '⭐ 가게1')), 1, 'T-ALERT-03 하나를 읽으면 안 읽은 수가 하나 줄어듦');
select is(mark_alert_read((select id from push_outbox where title = '남의 알림')), 1, 'T-ALERT-04 남의 알림은 읽음으로 못 바꿈');
select is((select count(*)::int from push_outbox where title = '남의 알림' and read_at is null), 1, 'T-ALERT-04 남의 알림은 그대로');
select mark_all_alerts_read();
select is(get_my_alert_count(), 0, 'T-ALERT-05 모두 읽음');

select * from finish();
rollback;
