-- 내 정보 · 가게 번호 · 외출 중 · 캘린더 (test.md T-ME, T-CAL)
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'owner@test.local');
insert into auth.users (id, is_anonymous) values ('00000000-0000-0000-0000-0000000000c1', true);
insert into profiles (id) values ('00000000-0000-0000-0000-0000000000d1');
insert into stores (id, name, phone, regular_hours) values (
  '00000000-0000-0000-0000-0000000000b1', '달력분식', '01011112222',
  jsonb_build_object(lower(to_char(now() at time zone 'Asia/Seoul', 'Dy')), jsonb_build_array(jsonb_build_array('00:00', '23:59'))));
insert into store_members (store_id, user_id) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1');

select ok(not has_column_privilege('anon', 'stores', 'store_phone', 'select'), 'T-ME-05 가게 번호 칸은 직접 못 읽음');
select ok(not has_table_privilege('anon', 'store_day_plans', 'select'), 'T-CAL-01 일정 표는 직접 못 읽음');

-- 익명 주민은 내 정보를 등록할 수 없다
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select throws_ok($$ select save_my_profile('주민', '옥천읍', '010-1234-5678') $$, 'P0001', 'LOGIN_REQUIRED', 'T-ME-01 카카오 로그인해야 내 정보 등록');
select throws_ok($$ select set_day_plan('00000000-0000-0000-0000-0000000000b1', (now() at time zone 'Asia/Seoul')::date, 'closed') $$, 'P0001', 'NOT_OWNER', 'T-CAL-02 사장님만 일정을 넣음');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select is(get_owner_home() -> 'profile' ->> 'registered', 'false', 'T-ME-02 등록 전');
select throws_ok($$ select save_my_profile(' ', '옥천읍', '010-1234-5678') $$, 'P0001', 'INVALID_MY_NAME', 'T-ME-02 이름 필수');
select throws_ok($$ select save_my_profile('김옥천', '옥천읍', '123') $$, 'P0001', 'INVALID_PHONE', 'T-ME-02 전화번호 필수');
select save_my_profile('김옥천', '옥천읍', '010-1234-5678');
select is((select (h -> 'profile' ->> 'registered') || (h -> 'profile' ->> 'area') || (h -> 'profile' ->> 'phone') from get_owner_home() h),
          'true옥천읍01012345678', 'T-ME-03 내 정보 저장');
select ack_store_notice();
select is(get_owner_home() -> 'profile' ->> 'store_ack', 'true', 'T-ME-04 가게 등록 안내 확인은 한 번만');

-- 가게 번호: 비공개면 주민에게 안 보임
select update_store_profile('00000000-0000-0000-0000-0000000000b1', '달력분식', '010-1111-2222',
  (select regular_hours from stores where id = '00000000-0000-0000-0000-0000000000b1'),
  p_store_phone => '043-733-0000', p_store_phone_public => false);
select is(get_store_detail('00000000-0000-0000-0000-0000000000b1') -> 'profile' ->> 'manage_store_phone', '0437330000', 'T-ME-05 사장님은 가게 번호를 봄');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select is(get_store_detail('00000000-0000-0000-0000-0000000000b1') -> 'profile' -> 'store_phone', 'null'::jsonb, 'T-ME-05 비공개 가게 번호는 주민에게 안 보임');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';

-- 외출 중 공지
select is((select status || '/' || basis from okc_schedule_status('00000000-0000-0000-0000-0000000000b1')), 'open/hours', 'T-CAL-03 평소에는 영업시간 기준 영업중');
select post_notice('00000000-0000-0000-0000-0000000000b1', 'out');
select is((select sign || '/' || (select status from okc_schedule_status('00000000-0000-0000-0000-0000000000b1')) from current_sign('00000000-0000-0000-0000-0000000000b1')),
          'out/closed', 'T-CAL-03 외출 중을 누르면 팻말이 바뀌고 영업중이 아님');
select end_notice((select notice_id from current_sign('00000000-0000-0000-0000-0000000000b1')));

-- 캘린더: 오늘 지금 시각을 낀 외출
select set_day_plan('00000000-0000-0000-0000-0000000000b1', (now() at time zone 'Asia/Seoul')::date, 'out',
  greatest((now() at time zone 'Asia/Seoul')::time - interval '5 minutes', time '00:00'),
  least((now() at time zone 'Asia/Seoul')::time + interval '5 minutes', time '23:59'), '은행 다녀와요');
select is((select status || '/' || basis from okc_schedule_status('00000000-0000-0000-0000-0000000000b1')), 'closed/hours', 'T-CAL-04 캘린더 외출 시간에는 영업중이 아님');
select clear_day_plan((select id from store_day_plans where store_id = '00000000-0000-0000-0000-0000000000b1'));
select is((select status from okc_schedule_status('00000000-0000-0000-0000-0000000000b1')), 'open', 'T-CAL-04 일정을 지우면 다시 영업중');

-- 그날 휴무는 임시휴무로 들어가고, 휴무인 날에는 다른 일정을 못 넣음
select set_day_plan('00000000-0000-0000-0000-0000000000b1', (now() at time zone 'Asia/Seoul')::date + 3, 'closed', null, null, '가족 행사');
select is((select count(*)::int from temp_closures where store_id = '00000000-0000-0000-0000-0000000000b1' and start_date = end_date), 1, 'T-CAL-05 휴무는 하루짜리 임시휴무');
select throws_ok($$ select set_day_plan('00000000-0000-0000-0000-0000000000b1', (now() at time zone 'Asia/Seoul')::date + 3, 'late_open', '11:00') $$, 'P0001', 'DAY_CLOSED', 'T-CAL-05 휴무인 날에는 다른 일정 못 넣음');
select throws_ok($$ select set_day_plan('00000000-0000-0000-0000-0000000000b1', (now() at time zone 'Asia/Seoul')::date + 40, 'late_open', '11:00') $$, 'P0001', 'INVALID_DATES', 'T-CAL-06 오늘부터 한 달까지만');

select * from finish();
rollback;
