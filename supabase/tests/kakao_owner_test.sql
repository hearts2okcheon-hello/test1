-- 카카오 계정 사장님: 코드·승인 없이 등록 (test.md T-KAKAO)
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a2', 'admin@test.local'),
  ('00000000-0000-0000-0000-0000000000d1', 'kakao@test.local');
insert into auth.users (id, is_anonymous) values ('00000000-0000-0000-0000-0000000000c1', true);
insert into profiles (id, role) values ('00000000-0000-0000-0000-0000000000a2', 'admin');

-- 주민(익명)은 등록 못 하고 등록 화면으로 가지 않는다
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select is(get_owner_home() ->> 'state', 'no_store', 'T-KAKAO-01 익명은 로그인 화면');
select throws_ok($$ select register_store('가게', '0432001234', '{"mon":[["09:00","20:00"]]}') $$, 'P0001', 'LOGIN_REQUIRED', 'T-KAKAO-01 익명은 등록 불가');

-- 카카오 계정은 바로 등록 화면, 등록하면 사장님 화면
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select is(get_owner_home() ->> 'state', 'needs_store', 'T-KAKAO-02 카카오 로그인하면 등록 화면');
select isnt(register_store('카카오 분식', '043-200-1234', '{"mon":[["09:00","20:00"]]}'), null, 'T-KAKAO-02 코드 없이 등록');
select is(get_owner_home() ->> 'state', 'owner', 'T-KAKAO-02 등록 후 사장님 화면');
select is(get_owner_home() -> 'store' ->> 'name', '카카오 분식', 'T-KAKAO-02 내 가게가 보임');
select throws_ok($$ select register_store('또', '0432001234', '{"mon":[["09:00","20:00"]]}') $$, 'P0001', 'ALREADY_REGISTERED', 'T-KAKAO-03 계정 하나에 가게 하나');

-- 관리자는 등록 화면으로 보내지 않는다
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is(get_owner_home() ->> 'state', 'no_store', 'T-KAKAO-04 관리자는 등록 화면으로 안 감');

select * from finish();
rollback;
