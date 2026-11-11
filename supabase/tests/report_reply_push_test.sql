-- 제보에 답하면 제보한 이웃에게 알림 (test.md T-PUSH-08~10)
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'owner@test.local');
insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000c1', true),
  ('00000000-0000-0000-0000-0000000000c2', true),
  ('00000000-0000-0000-0000-0000000000c3', true);
insert into profiles (id) values ('00000000-0000-0000-0000-0000000000d1');
insert into stores (id, name) values ('00000000-0000-0000-0000-0000000000b1', '답장분식');
insert into store_members (store_id, user_id) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1');
-- c2 는 즐겨찾기도 했다
insert into store_favorites (user_id, store_id) values ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1');

-- c1 이 "문 닫혀 있었어요" 제보, c2 가 "나도 봤어요"
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select post_report('00000000-0000-0000-0000-0000000000b1', 'seen_closed');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","is_anonymous":true}';
select agree_report((select id from reports where store_id = '00000000-0000-0000-0000-0000000000b1'));

-- 사장님이 "열었다" + 쪽지로 답
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select reply_reports('00000000-0000-0000-0000-0000000000b1', true, '정상 영업해요');

select is((select title || ' / ' || body from push_outbox where user_id = '00000000-0000-0000-0000-0000000000c1'),
          '💬 사장님이 답했어요 / 답장분식: "오늘 문 열었어요" · 정상 영업해요', 'T-PUSH-08 제보한 이웃에게 답장 알림 (즐겨찾기 안 해도)');
select is((select count(*)::int from push_outbox where user_id = '00000000-0000-0000-0000-0000000000c2'), 1, 'T-PUSH-08 나도 봤어요 누른 이웃도 받는데, 즐겨찾기 알림과 겹치면 하나만');
select ok((select title like '💬%' from push_outbox where user_id = '00000000-0000-0000-0000-0000000000c2'), 'T-PUSH-08 겹치면 답장 알림으로 남김');
select is((select count(*)::int from push_outbox where user_id = '00000000-0000-0000-0000-0000000000c3'), 0, 'T-PUSH-09 관계없는 주민은 안 받음');

-- 하나씩 답하기(answer_report)도 같은 알림, 같은 사람의 제보 여러 건이어도 한 번만
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated","is_anonymous":true}';
select post_report('00000000-0000-0000-0000-0000000000b1', 'seen_sold_out');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select answer_report((select id from reports where store_id = '00000000-0000-0000-0000-0000000000b1' and status = 'pending'), true);
select is((select body from push_outbox where user_id = '00000000-0000-0000-0000-0000000000c3'), '답장분식: "재료가 다 떨어졌어요"', 'T-PUSH-10 하나씩 답해도 알림');
select is((select count(*)::int from push_outbox where user_id = '00000000-0000-0000-0000-0000000000d1' and title like '💬%'), 0, 'T-PUSH-10 답한 사장님 자신은 안 받음');

select * from finish();
rollback;
