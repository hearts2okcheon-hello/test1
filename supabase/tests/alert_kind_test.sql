-- 알림 종류와 "할 일이 남은 알림" (test.md T-ALERT-07~09)
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'owner@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'former@test.local');
insert into profiles (id) values ('00000000-0000-0000-0000-0000000000f1'), ('00000000-0000-0000-0000-0000000000f2');
insert into stores (id, name) values
  ('00000000-0000-0000-0000-0000000000a1', '종류분식'),
  ('00000000-0000-0000-0000-0000000000a2', '휴무분식'),
  ('00000000-0000-0000-0000-0000000000a3', '늦는분식'),
  ('00000000-0000-0000-0000-0000000000a4', '두번분식');
insert into store_members (store_id, user_id) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000f1'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000f1'),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000f1');

-- 사장님(f1)이 받은 알림: 종류별로 하나씩, 그리고 오픈 시간 확인 여러 가지
insert into push_outbox (user_id, title, body, url, tag, created_at) values
  ('00000000-0000-0000-0000-0000000000f1', '⭐ 이루네 가든', '오늘 문 열었어요', '/stores/x', 'store-00000000-0000-0000-0000-0000000000a9', now() - interval '3 hours'),
  ('00000000-0000-0000-0000-0000000000f1', '💬 사장님이 답했어요', '이루네 가든: "오늘 쉬어요"', '/stores/x', 'store-00000000-0000-0000-0000-0000000000a9', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-0000000000f1', '🔔 이웃 제보가 왔어요', '종류분식: "문 닫혀 있었어요"', '/owner/store', 'report-00000000-0000-0000-0000-0000000000a1', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-0000000000f1', '꼬리표 없는 알림', '옛 알림', '/', null, now() - interval '4 hours'),
  ('00000000-0000-0000-0000-0000000000f1', '사장님, 오늘 문 여셨나요?', '종류분식 어제 것', '/owner/store', 'open-00000000-0000-0000-0000-0000000000a1', now() - interval '1 day'),
  ('00000000-0000-0000-0000-0000000000f1', '사장님, 오늘 문 여셨나요?', '종류분식 오늘 것', '/owner/store', 'open-00000000-0000-0000-0000-0000000000a1', now()),
  ('00000000-0000-0000-0000-0000000000f1', '사장님, 오늘 문 여셨나요?', '휴무분식 오늘 것', '/owner/store', 'open-00000000-0000-0000-0000-0000000000a2', now()),
  ('00000000-0000-0000-0000-0000000000f1', '사장님, 오늘 문 여셨나요?', '늦는분식 오늘 것', '/owner/store', 'open-00000000-0000-0000-0000-0000000000a3', now()),
  ('00000000-0000-0000-0000-0000000000f1', '사장님, 오늘 문 여셨나요?', '두번분식 먼저 온 것', '/owner/store', 'open-00000000-0000-0000-0000-0000000000a4', now()),
  ('00000000-0000-0000-0000-0000000000f1', '사장님, 오늘 문 여셨나요?', '두번분식 나중에 온 것', '/owner/store', 'open-00000000-0000-0000-0000-0000000000a4', now()),
  ('00000000-0000-0000-0000-0000000000f1', '사장님, 오늘 문 여셨나요?', '모양이 틀린 꼬리표', '/owner/store', 'open-가게아님', now()),
  -- 이제는 그 가게 사장님이 아닌 사람(f2)에게 남아 있는 알림
  ('00000000-0000-0000-0000-0000000000f2', '사장님, 오늘 문 여셨나요?', '종류분식 오늘 것', '/owner/store', 'open-00000000-0000-0000-0000-0000000000a1', now());

-- 휴무분식은 오늘 임시휴무, 늦는분식은 오늘 늦게 연다고 적어 둠
insert into temp_closures (store_id, start_date, end_date, reason, source, created_by)
  values ('00000000-0000-0000-0000-0000000000a2', (now() at time zone 'Asia/Seoul')::date, (now() at time zone 'Asia/Seoul')::date, '가족 행사', 'owner', '00000000-0000-0000-0000-0000000000f1');
insert into store_day_plans (store_id, day, kind, start_time, created_by)
  values ('00000000-0000-0000-0000-0000000000a3', (now() at time zone 'Asia/Seoul')::date, 'late_open', '13:00', '00000000-0000-0000-0000-0000000000f1');

select ok(not has_function_privilege('anon', 'get_my_alerts(integer)', 'execute'), 'T-ALERT-09 로그인 없이는 알림을 못 읽음');
select ok(not has_function_privilege('authenticated', '_okc_open_check_pending(uuid)', 'execute'), 'T-ALERT-09 안쪽 함수는 직접 못 부름');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';

select is((select kind from get_my_alerts() where title like '⭐%'), 'favorite', 'T-ALERT-07 즐겨찾는 가게 소식');
select is((select kind from get_my_alerts() where title like '💬%'), 'reply', 'T-ALERT-07 제보 답장 (같은 꼬리표라도 제목이 💬 로 시작)');
select is((select kind from get_my_alerts() where title like '🔔%'), 'report', 'T-ALERT-07 이웃 제보');
select is((select string_agg(distinct kind, ',') from get_my_alerts() where title like '사장님,%'), 'open_check', 'T-ALERT-07 오픈 시간 확인');
select is((select kind from get_my_alerts() where title = '꼬리표 없는 알림'), 'other', 'T-ALERT-07 모르는 것은 other');

select is((select string_agg(body, ',' order by body) from get_my_alerts() where needs_action), '두번분식 나중에 온 것,종류분식 오늘 것',
  'T-ALERT-08 할 일이 남은 알림: 오늘 온 가장 새 오픈 시간 확인만 (어제 것 · 먼저 온 것 · 임시휴무 · 늦게 여는 날 · 틀린 꼬리표 · 다른 종류는 아님)');
select is((select count(*)::int from get_my_alerts()), 11, 'T-ALERT-08 틀린 꼬리표가 있어도 목록은 그대로 나옴');

-- 사장님이 오늘 소식을 올리면 처리된 것으로 본다
select post_notice('00000000-0000-0000-0000-0000000000a1', 'open');
select is((select needs_action from get_my_alerts() where body = '종류분식 오늘 것'), false, 'T-ALERT-08 오늘 소식을 올리면 누를 곳이 사라짐');
select is((select needs_action from get_my_alerts() where body = '두번분식 나중에 온 것'), true, 'T-ALERT-08 다른 가게의 알림은 그대로');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}';
select is((select count(*)::int from get_my_alerts()), 1, 'T-ALERT-09 내 알림만 보임');
select is((select needs_action from get_my_alerts()), false, 'T-ALERT-08 그 가게 사장님이 아니면 누를 곳이 없음');

select * from finish();
rollback;
