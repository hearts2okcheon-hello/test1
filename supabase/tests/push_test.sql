-- 휴대폰 알림 (test.md T-PUSH)
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'owner@test.local');
insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000c1', true),
  ('00000000-0000-0000-0000-0000000000c2', true);
insert into profiles (id) values ('00000000-0000-0000-0000-0000000000d1');
-- 평소 여는 시간이 10분 전인 가게 (오픈 알림 대상)
insert into stores (id, name, regular_hours) values (
  '00000000-0000-0000-0000-0000000000b1', '알림분식',
  jsonb_build_object(lower(to_char(now() at time zone 'Asia/Seoul' - interval '10 minutes', 'Dy')),
    jsonb_build_array(jsonb_build_array(to_char(now() at time zone 'Asia/Seoul' - interval '10 minutes', 'HH24:MI'), '23:59'))));
insert into store_members (store_id, user_id) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1');
insert into store_favorites (user_id, store_id) values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1');

select ok(not has_table_privilege('anon', 'push_subscriptions', 'select'), 'T-PUSH-01 구독 표를 직접 못 읽음');
select ok(not has_function_privilege('anon', 'save_push_subscription(text, text, text)', 'execute'), 'T-PUSH-01 세션 없이는 구독 못 함');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select save_push_subscription('https://push.example/abc', 'key', 'auth');
select is((select user_id::text from push_subscriptions where endpoint = 'https://push.example/abc'), '00000000-0000-0000-0000-0000000000c1', 'T-PUSH-02 이 기기 구독 저장');
select throws_ok($$ select save_push_subscription('http://insecure', 'k', 'a') $$, 'P0001', 'INVALID_BODY', 'T-PUSH-02 https 주소만');

-- 오픈 시간 알림 (공지가 없을 때 하루 한 번)
select enqueue_open_reminders();
select is((select count(*)::int from push_outbox where user_id = '00000000-0000-0000-0000-0000000000d1' and title like '%문 여셨나요%'), 1, 'T-PUSH-03 여는 시간이 지났고 소식이 없으면 사장님께 알림');
select enqueue_open_reminders();
select is((select count(*)::int from push_outbox where user_id = '00000000-0000-0000-0000-0000000000d1' and title like '%문 여셨나요%'), 1, 'T-PUSH-03 하루 한 번만');

-- 이웃 제보 → 사장님
select post_report('00000000-0000-0000-0000-0000000000b1', 'seen_closed');
select is((select count(*)::int from push_outbox where user_id = '00000000-0000-0000-0000-0000000000d1' and title like '%이웃 제보%'), 1, 'T-PUSH-04 제보가 오면 사장님께 알림');

-- 사장님 공지 → 즐겨찾기 주민
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select post_notice('00000000-0000-0000-0000-0000000000b1', 'open');
select is((select body from push_outbox where user_id = '00000000-0000-0000-0000-0000000000c1' order by id desc limit 1), '오늘 문 열었어요', 'T-PUSH-05 즐겨찾기 가게가 문 열면 알림');
select post_notice('00000000-0000-0000-0000-0000000000b1', 'closed_today');
select is((select count(*)::int from push_outbox where user_id = '00000000-0000-0000-0000-0000000000c1'), 1, 'T-PUSH-05 오늘 쉬어요는 알리지 않음');
select set_temp_closure('00000000-0000-0000-0000-0000000000b1', (now() at time zone 'Asia/Seoul')::date + 1, (now() at time zone 'Asia/Seoul')::date + 2, '가족 여행');
select ok((select body like '임시휴무 %가족 여행' from push_outbox where user_id = '00000000-0000-0000-0000-0000000000c1' order by id desc limit 1), 'T-PUSH-06 임시휴무 알림');

select throws_ok($$ select * from claim_push_batch('틀린값') $$, 'P0001', 'NOT_ADMIN', 'T-PUSH-07 비밀값 없이는 보낼 목록을 못 가져감');

select * from finish();
rollback;
