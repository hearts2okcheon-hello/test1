-- 가게 전화번호 공개 선택 (test.md T-PHONE)
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'kakao@test.local');
insert into auth.users (id, is_anonymous) values ('00000000-0000-0000-0000-0000000000c1', true);
create temp table v (k text primary key, val text);

select ok(not has_column_privilege('anon', 'public.stores', 'phone', 'select'), 'T-PHONE-01 공개 키로 전화번호 칸을 직접 못 읽음');
select ok(has_column_privilege('anon', 'public.stores', 'name', 'select'), 'T-PHONE-01 가게 이름은 읽을 수 있음');

-- 기본은 비공개
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
insert into v select 'store', register_store('비공개 가게', '010-1111-2222', '{"mon":[["09:00","20:00"]]}');
select is(get_store_detail((select val::uuid from v)) -> 'profile' ->> 'manage_phone', '01011112222', 'T-PHONE-02 사장님은 고칠 번호를 받음');
select is(get_store_detail((select val::uuid from v)) -> 'profile' ->> 'phone', null, 'T-PHONE-02 기본은 공개 안 함');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select is(get_store_detail((select val::uuid from v)) -> 'profile' ->> 'phone', null, 'T-PHONE-03 주민에게 안 보임');
select is(get_store_detail((select val::uuid from v)) -> 'profile' ->> 'manage_phone', null, 'T-PHONE-03 주민은 관리용 번호도 없음');

-- 고치기에서 공개로
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select lives_ok($$ select update_store_profile((select val::uuid from v), '비공개 가게', '010-1111-2222', '{"mon":[["09:00","20:00"]]}', null, null, null, null, true) $$, 'T-PHONE-04 고치기에서 공개로 변경');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select is(get_store_detail((select val::uuid from v)) -> 'profile' ->> 'phone', '01011112222', 'T-PHONE-04 공개하면 주민에게 보임');

-- 다시 비공개로
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select update_store_profile((select val::uuid from v), '비공개 가게', '010-1111-2222', '{"mon":[["09:00","20:00"]]}', null, null, null, null, false);
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select is(get_store_detail((select val::uuid from v)) -> 'profile' ->> 'phone', null, 'T-PHONE-05 다시 비공개로');

select * from finish();
rollback;
