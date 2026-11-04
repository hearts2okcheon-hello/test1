-- 팻말 규칙·공지·제보 RPC 테스트 (test.md). 실행: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

-- ── 준비 ──────────────────────────────────────────
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin@test.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'other@test.local');
insert into profiles (id, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin'),
  ('00000000-0000-0000-0000-0000000000a3', 'owner');
insert into stores (id, name, regular_hours, owner_id) values
  ('00000000-0000-0000-0000-0000000000b1', '테스트식당', '{"mon":[["09:00","21:00"]]}', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000b2', '주인없는가게', null, null),
  -- 하루 종일 영업하는 가게: 평소 영업시간 안이어도 "소식 없음"인지 본다 (T-SIGN-19)
  ('00000000-0000-0000-0000-0000000000b3', '종일가게',
   '{"mon":[["00:00","23:59"]],"tue":[["00:00","23:59"]],"wed":[["00:00","23:59"]],"thu":[["00:00","23:59"]],"fri":[["00:00","23:59"]],"sat":[["00:00","23:59"]],"sun":[["00:00","23:59"]]}',
   '00000000-0000-0000-0000-0000000000a3');

create temp table ids (k text primary key, id uuid);

-- ── T-SIGN-01 소식 없음 ────────────────────────────
select is(
  (select sign from get_store_signs() where store_id = '00000000-0000-0000-0000-0000000000b1'),
  'none', 'T-SIGN-01 공지·제보가 없으면 소식 없음 (영업 중 아님)');

-- ── 사장님 공지 ───────────────────────────────────
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

insert into ids select 'n1', post_notice('00000000-0000-0000-0000-0000000000b1', 'closed_today');
select is(
  (select sign || '/' || source from get_store_signs() where store_id = '00000000-0000-0000-0000-0000000000b1'),
  'closed_today/owner', 'T-SIGN-03 사장님 오늘 쉬어요 → 오늘 휴무 · 사장님');

insert into ids select 'n2', post_notice('00000000-0000-0000-0000-0000000000b1', 'open', null, '반찬 새로 했어요');
select is(
  (select count(*)::int from notices where store_id = '00000000-0000-0000-0000-0000000000b1' and ended_at is null),
  1, 'T-SIGN-06 새 공지를 올리면 유효 공지는 하나');
select is(
  (select sign || '/' || memo from get_store_signs() where store_id = '00000000-0000-0000-0000-0000000000b1'),
  'open/반찬 새로 했어요', 'T-SIGN-06 최근 공지가 팻말');

select lives_ok($$ select undo_notice((select id from ids where k = 'n2')) $$, 'T-NOTICE-02 되돌리기');
select is(
  (select sign from get_store_signs() where store_id = '00000000-0000-0000-0000-0000000000b1'),
  'closed_today', 'T-NOTICE-02 되돌리면 이전 공지가 돌아온다');

select throws_ok(
  $$ select post_notice('00000000-0000-0000-0000-0000000000b1', 'open', null, repeat('가', 41)) $$,
  'P0001', 'MEMO_TOO_LONG', 'T-NOTICE-04 쪽지 41자 거부');

select throws_ok(
  $$ select post_notice('00000000-0000-0000-0000-0000000000b1', 'late_open', '00:00') $$,
  'P0001', 'INVALID_TIME', '이미 지난 오픈 시각은 거부');

-- ── 남의 가게 ─────────────────────────────────────
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
select throws_ok(
  $$ select post_notice('00000000-0000-0000-0000-0000000000b1', 'open') $$,
  'P0001', 'NOT_OWNER', 'T-NOTICE-05 다른 가게 공지 거부');

-- ── 만료 ──────────────────────────────────────────
update notices set expires_at = now() - interval '1 minute'
 where store_id = '00000000-0000-0000-0000-0000000000b1';
select is(
  (select sign from get_store_signs() where store_id = '00000000-0000-0000-0000-0000000000b1'),
  'none', 'T-SIGN-07 만료된 공지는 보이지 않는다');

-- ── 이웃 제보 (익명) ───────────────────────────────
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
insert into ids select 'r1', post_report('00000000-0000-0000-0000-0000000000b1', 'seen_closed');
select is(
  (select sign || '/' || source from get_store_signs() where store_id = '00000000-0000-0000-0000-0000000000b1'),
  'checking/neighbor', 'T-SIGN-04 제보만 있으면 확인 중 · 이웃 제보');

select throws_ok(
  $$ select post_report('00000000-0000-0000-0000-0000000000b1', 'seen_open') $$,
  'P0001', 'DUPLICATE_REPORT', 'T-REPORT-02 30분 안 재제보 거부');

select throws_ok(
  $$ select agree_report((select id from ids where k = 'r1')) $$,
  'P0001', 'OWN_REPORT', 'T-REPORT-10 자기 제보에 나도 봤어요 거부');

select throws_ok(
  $$ select post_notice('00000000-0000-0000-0000-0000000000b1', 'open') $$,
  'P0001', 'NOT_AUTHENTICATED', '익명 사용자는 공지 불가');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","is_anonymous":true}';
select is(agree_report((select id from ids where k = 'r1')), 1, 'T-REPORT-09 나도 봤어요 +1');
select is(agree_report((select id from ids where k = 'r1')), 1, 'T-REPORT-11 두 번 눌러도 1');
select is(
  (select sign from get_store_signs() where store_id = '00000000-0000-0000-0000-0000000000b1'),
  'checking', 'T-REPORT-09 동의가 쌓여도 확인 중');

select ok(
  get_store_detail('00000000-0000-0000-0000-0000000000b1')::text not like '%reporter_id%',
  'T-REPORT-13 상세 응답에 제보자 id 없음');

-- ── 사장님 확인 ───────────────────────────────────
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
select throws_ok(
  $$ select answer_report((select id from ids where k = 'r1'), true) $$,
  'P0001', 'NOT_OWNER', '다른 사장님은 확인 불가');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok($$ select answer_report((select id from ids where k = 'r1'), true) $$, '사장님 확인 답');
select is(
  (select sign || '/' || source from get_store_signs() where store_id = '00000000-0000-0000-0000-0000000000b1'),
  'closed_today/owner', 'T-REPORT-04 네 → 오늘 휴무 · 사장님');

-- ── 옥천신문 ──────────────────────────────────────
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
insert into ids select 'n3', post_notice('00000000-0000-0000-0000-0000000000b2', 'sold_out');
select is(
  (select sign || '/' || source from get_store_signs() where store_id = '00000000-0000-0000-0000-0000000000b2'),
  'sold_out/okcheon', 'T-SIGN-08 대리 등록 → 옥천신문 확인');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated","is_anonymous":true}';
insert into ids select 'r2', post_report('00000000-0000-0000-0000-0000000000b2', 'seen_closed');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select lives_ok($$ select answer_report((select id from ids where k = 'r2'), false) $$, '옥천신문 확인 답');
select is(
  (select sign || '/' || source from get_store_signs() where store_id = '00000000-0000-0000-0000-0000000000b2'),
  'open/okcheon', 'T-REPORT-05 아니요(문 닫혀 있었어요) → 영업 중');

-- ── 만료 경계: 당일 자정 = 다음 날 00:00 서울 (T-SIGN-12~17) ──
-- 트랜잭션 안에서는 now() 가 고정이라, 저장된 expires_at 값과 경계 비교로 확인한다
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
insert into ids select 'n4', post_notice('00000000-0000-0000-0000-0000000000b1', 'sold_out');
select is(
  (select expires_at from notices where id = (select id from ids where k = 'n4')),
  okc_next_midnight(), 'T-SIGN-14 재료 소진 공지 만료는 당일 자정');
select is(
  (okc_next_midnight() at time zone 'Asia/Seoul')::time, '00:00'::time,
  'T-SIGN-17 당일 자정은 서울 시각 00:00');
select ok(
  okc_next_midnight() > now() and okc_next_midnight() <= now() + interval '24 hours',
  'T-SIGN-17 당일 자정은 지금부터 24시간 안 (UTC 날짜와 무관)');

update notices set expires_at = now() + interval '1 second' where id = (select id from ids where k = 'n4');
select is(
  (select sign from current_sign('00000000-0000-0000-0000-0000000000b1')),
  'sold_out', 'T-SIGN-12 자정 1초 전(23:59:59)에는 유효');
update notices set expires_at = now() where id = (select id from ids where k = 'n4');
select is(
  (select sign from current_sign('00000000-0000-0000-0000-0000000000b1')),
  'none', 'T-SIGN-13 자정 정각(00:00:00)에는 만료');

select is(
  (select is_current from get_today_feed(50) where notice_id = (select id from ids where k = 'n4')),
  false, 'T-SIGN-20 만료된 공지는 피드에서 지금 유효하지 않음');

-- ── 팻말 규칙이 한 곳에서 나오는지 (T-SIGN-18) ─────
insert into ids select 'n5', post_notice('00000000-0000-0000-0000-0000000000b1', 'open');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c5","role":"authenticated","is_anonymous":true}';
insert into ids select 'r5', post_report('00000000-0000-0000-0000-0000000000b1', 'seen_closed');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select is(
  (get_store_detail('00000000-0000-0000-0000-0000000000b1') -> 'store' ->> 'sign')
    || '/' || (get_store_detail('00000000-0000-0000-0000-0000000000b1') -> 'store' ->> 'source'),
  (select sign || '/' || source from current_sign('00000000-0000-0000-0000-0000000000b1')),
  'T-SIGN-18 get_store_detail = current_sign');
select is(
  (get_owner_home() -> 'store' ->> 'sign') || '/' || (get_owner_home() -> 'store' ->> 'source'),
  (select sign || '/' || source from current_sign('00000000-0000-0000-0000-0000000000b1')),
  'T-SIGN-18 get_owner_home = current_sign');
select is(
  (select kind || '/' || source from get_today_feed(50)
    where store_id = '00000000-0000-0000-0000-0000000000b1' and is_current),
  (select sign || '/' || source from get_store_signs() where store_id = '00000000-0000-0000-0000-0000000000b1'),
  'T-SIGN-18 get_today_feed 현재 공지 = get_store_signs');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
select is(
  get_owner_home() -> 'store' ->> 'sign',
  'none', 'T-SIGN-19 공지·제보 없는 가게는 사장님 화면에서도 소식 없음');

-- ── 가게 등록은 RPC로만 (T-ADMIN-03~06) ─────────────
-- 클라이언트처럼 authenticated 역할로 직접 써 본다
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
create temp table direct_write (result text);
do $$
begin
  set local role authenticated;
  begin
    insert into stores (name) values ('직접 넣은 가게');
    reset role;
    insert into direct_write values ('inserted');
  exception when others then
    reset role;
    insert into direct_write values (sqlstate);
  end;
  set local role authenticated;
  update stores set name = '직접 고친 이름' where id = '00000000-0000-0000-0000-0000000000b2';
  reset role;
end;
$$;
select is(
  (select result from direct_write),
  '42501', 'T-ADMIN-03 관리자도 stores 직접 insert 불가');
select is(
  (select name from stores where id = '00000000-0000-0000-0000-0000000000b2'),
  '주인없는가게', 'T-ADMIN-03 stores 직접 update 는 반영되지 않음');

insert into ids select 's1', admin_upsert_store('새가게', '식당');
select is(
  (select name || '/' || category from stores where id = (select id from ids where k = 's1')),
  '새가게/식당', 'T-ADMIN-04 store_id 없이 호출하면 새 가게');
select lives_ok(
  $$ select admin_upsert_store(p_name => '고친가게', p_store_id => (select id from ids where k = 's1')) $$,
  'T-ADMIN-05 기존 가게 수정');
select is(
  (select string_agg(name, ',' order by name) from stores
    where id in ((select id from ids where k = 's1'), '00000000-0000-0000-0000-0000000000b2')),
  '고친가게,주인없는가게', 'T-ADMIN-05 해당 가게만 바뀜');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok(
  $$ select admin_upsert_store('사장님이 만든 가게') $$,
  'P0001', 'NOT_ADMIN', 'T-ADMIN-06 사장님은 가게 등록 불가');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select throws_ok(
  $$ select admin_upsert_store('익명이 만든 가게') $$,
  'P0001', 'NOT_ADMIN', 'T-ADMIN-06 익명은 가게 등록 불가');

select * from finish();
rollback;
