-- 가게 캘린더: 기간으로 넣기 · 고치기 · 지우기 (test.md T-CAL-20~29, ADR-015)
-- 오늘을 D 라고 하면, D+3 의 요일은 쉬는 요일로 둔다
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'owner@test.local'), ('00000000-0000-0000-0000-0000000000d2', 'other@test.local');
insert into profiles (id) values ('00000000-0000-0000-0000-0000000000d1'), ('00000000-0000-0000-0000-0000000000d2');
insert into stores (id, name, phone, regular_hours) values (
  '00000000-0000-0000-0000-0000000000b1', '기간분식', '01011112222',
  (select jsonb_object_agg(d, case when d = lower(to_char((now() at time zone 'Asia/Seoul')::date + 3, 'Dy')) then '[]'::jsonb else '[["09:00","20:00"]]'::jsonb end)
     from unnest(array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) d));
insert into store_members (store_id, user_id) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1');
create temp table t (today date);
insert into t values ((now() at time zone 'Asia/Seoul')::date);
grant select on t to authenticated;

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select throws_ok($$ select save_schedule('00000000-0000-0000-0000-0000000000b1', 'closed', (select today + 1 from t), (select today + 2 from t)) $$, 'P0001', 'NOT_OWNER', 'T-CAL-20 사장님만 일정을 넣음');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';

-- 기간으로 넣기: D+1 ~ D+7 늦게 열기 (D+3 은 쉬는 요일이라 건너뜀)
select is(save_schedule('00000000-0000-0000-0000-0000000000b1', 'late_open', (select today + 1 from t), (select today + 7 from t), '11:00'), 6, 'T-CAL-21 기간에 넣으면 쉬는 요일을 빼고 들어간 날 수를 돌려줌');
select is((select count(*)::int from store_day_plans where store_id = '00000000-0000-0000-0000-0000000000b1' and kind = 'late_open'), 6, 'T-CAL-21 날짜마다 한 줄');

-- 기간 휴무: D+2 ~ D+4. 그 사이에 있던 늦게 열기(D+2, D+4)는 지워짐
select is(save_schedule('00000000-0000-0000-0000-0000000000b1', 'closed', (select today + 2 from t), (select today + 4 from t), null, null, '가족 여행'), 3, 'T-CAL-22 기간 전체에 휴무');
select is((select count(*)::int || '/' || min(reason) from temp_closures where store_id = '00000000-0000-0000-0000-0000000000b1' and canceled_at is null), '1/가족 여행', 'T-CAL-22 휴무는 임시휴무 한 줄');
select is((select count(*)::int from store_day_plans where store_id = '00000000-0000-0000-0000-0000000000b1'), 4, 'T-CAL-22 쉬는 날에 걸린 일정은 지워짐');

-- 휴무뿐인 기간에는 다른 일정을 넣을 수 없다
select throws_ok($$ select save_schedule('00000000-0000-0000-0000-0000000000b1', 'out', (select today + 2 from t), (select today + 4 from t), '14:00', '16:00') $$, 'P0001', 'DAY_CLOSED', 'T-CAL-23 모두 휴무인 기간에는 넣을 수 없음');

-- 범위: 늦게 열기·일찍 닫기·외출은 한 달 뒤까지, 휴무는 그 뒤에도
select throws_ok($$ select save_schedule('00000000-0000-0000-0000-0000000000b1', 'out', (select today + 1 from t), (select (today + interval '1 month')::date + 1 from t), '14:00', '16:00') $$, 'P0001', 'INVALID_DATES', 'T-CAL-24 날짜별 일정은 한 달 뒤까지만');
select is(save_schedule('00000000-0000-0000-0000-0000000000b1', 'closed', (select today + 40 from t), (select today + 42 from t)), 3, 'T-CAL-24 휴무는 한 달 뒤에도 잡을 수 있음');
select throws_ok($$ select save_schedule('00000000-0000-0000-0000-0000000000b1', 'closed', (select today - 1 from t), (select today + 1 from t)) $$, 'P0001', 'INVALID_DATES', 'T-CAL-24 지난 날부터는 잡을 수 없음');

-- 휴무 고치기: 같은 줄을 고친다 (하루 늘리기). 늘어난 날의 일정은 지워짐
select is(save_schedule('00000000-0000-0000-0000-0000000000b1', 'closed', (select today + 2 from t), (select today + 5 from t), null, null, '하루 더',
            p_closure_id => (select id from temp_closures where store_id = '00000000-0000-0000-0000-0000000000b1' and reason = '가족 여행')), 4, 'T-CAL-25 휴무 기간 고치기');
select is((select count(*)::int || '/' || (max(end_date) filter (where reason = '하루 더') - (select today from t)) from temp_closures where store_id = '00000000-0000-0000-0000-0000000000b1' and canceled_at is null),
          '2/5', 'T-CAL-25 새 줄을 만들지 않고 날짜와 이유만 바뀜');
select is((select count(*)::int from store_day_plans where store_id = '00000000-0000-0000-0000-0000000000b1'), 3, 'T-CAL-25 늘어난 날의 일정도 지워짐');
select throws_ok($$ select save_schedule('00000000-0000-0000-0000-0000000000b1', 'closed', (select today + 2 from t), (select today + 41 from t), null, null, null,
            p_closure_id => (select id from temp_closures where store_id = '00000000-0000-0000-0000-0000000000b1' and reason = '하루 더')) $$, 'P0001', 'CLOSURE_OVERLAP', 'T-CAL-25 다른 휴무와 겹치게는 못 고침');

-- 날짜별 일정 고치기: 묶음(D+6, D+7 늦게 열기)을 일찍 닫기로
select is(save_schedule('00000000-0000-0000-0000-0000000000b1', 'early_close', (select today + 6 from t), (select today + 7 from t), null, '17:00', null,
            p_plan_ids => (select array_agg(id) from store_day_plans where store_id = '00000000-0000-0000-0000-0000000000b1' and day >= (select today + 6 from t))), 2, 'T-CAL-26 묶인 일정 고치기');
select is((select string_agg(kind || ':' || n, ',' order by kind) from (select kind, count(*)::int n from store_day_plans where store_id = '00000000-0000-0000-0000-0000000000b1' group by kind) x),
          'early_close:2,late_open:1', 'T-CAL-26 예전 일정은 지워지고 새 유형으로 들어감');

-- 유형 바꾸기: 휴무(D+2~D+5)를 D+2 하루 늦게 열기로. 그 휴무는 취소됨
select is(save_schedule('00000000-0000-0000-0000-0000000000b1', 'late_open', (select today + 2 from t), (select today + 2 from t), '12:00', null, null,
            p_closure_id => (select id from temp_closures where store_id = '00000000-0000-0000-0000-0000000000b1' and reason = '하루 더')), 1, 'T-CAL-27 휴무를 다른 유형으로 바꾸기');
select is((select count(*)::int from temp_closures where store_id = '00000000-0000-0000-0000-0000000000b1' and canceled_at is null), 1, 'T-CAL-27 바꾼 휴무는 취소됨');

-- 지우기: 묶음을 한 번에
select is(clear_day_plans('00000000-0000-0000-0000-0000000000b1', (select array_agg(id) from store_day_plans where store_id = '00000000-0000-0000-0000-0000000000b1' and kind = 'early_close')), 2, 'T-CAL-28 묶인 일정 한 번에 지우기');
select throws_ok($$ select clear_day_plans('00000000-0000-0000-0000-0000000000b1', array['00000000-0000-0000-0000-0000000000ff']::uuid[]) $$, 'P0001', 'NOT_FOUND', 'T-CAL-28 없는 일정은 지울 수 없음');

select * from finish();
rollback;
