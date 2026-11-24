-- 가입할 때 "가게를 등록할 것입니까?" (test.md T-ME-10~13)
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'resident@test.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'owner@test.local'),
  ('00000000-0000-0000-0000-0000000000e3', 'old@test.local'),
  ('00000000-0000-0000-0000-0000000000e4', 'new@test.local');
insert into auth.users (id, is_anonymous) values ('00000000-0000-0000-0000-0000000000e5', true);
insert into profiles (id) values
  ('00000000-0000-0000-0000-0000000000e1'), ('00000000-0000-0000-0000-0000000000e2'),
  ('00000000-0000-0000-0000-0000000000e4'), ('00000000-0000-0000-0000-0000000000e5');
-- 이 질문이 생기기 전에 가입한 사람: 답이 없다
insert into profiles (id, display_name, area, phone, registered_at) values ('00000000-0000-0000-0000-0000000000e3', '옛가입', '옥천읍', '01000000003', now());
insert into stores (id, name, phone) values ('00000000-0000-0000-0000-0000000000e9', '의향분식', '01011112222');

-- 아니요: 가게를 등록하지 않는다
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
select save_my_profile('주민', '옥천읍', '010-1111-2222', null, null, false);
select is(get_owner_home() -> 'profile' ->> 'wants_store', 'false', 'T-ME-10 아니요라고 답하면 wants_store = false');
select is(okc_owner_mode(), false, 'T-ME-11 가게를 등록하지 않는 주민에게는 사장님 메뉴를 보이지 않음');
select save_my_profile('주민', '이원면', '010-1111-2222');
select is(get_owner_home() -> 'profile' ->> 'wants_store', 'false', 'T-ME-10 답을 다시 보내지 않으면 예전 답 그대로');

-- 예: 가게를 등록한다
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';
select save_my_profile('사장', '옥천읍', '010-3333-4444', null, null, true);
select is(get_owner_home() -> 'profile' ->> 'wants_store', 'true', 'T-ME-10 예라고 답하면 wants_store = true');
select is(okc_owner_mode(), true, 'T-ME-11 가게를 등록하겠다고 한 사람에게는 사장님 메뉴를 보임');

-- 예전 가입자(답 없음)는 예로 본다
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}';
select is(get_owner_home() -> 'profile' -> 'wants_store', 'null'::jsonb, 'T-ME-12 예전 가입자는 답이 비어 있음');
select is(okc_owner_mode(), true, 'T-ME-12 답이 비어 있으면 예로 봄');

-- 로그인만 하고 내 정보를 등록하지 않은 사람 · 익명 주민 · 로그인하지 않은 주민
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}';
select is(okc_owner_mode(), false, 'T-ME-11 내 정보를 등록하기 전에는 보이지 않음');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated","is_anonymous":true}';
select is(okc_owner_mode(), false, 'T-ME-11 익명 주민에게는 보이지 않음');
set local request.jwt.claims to '{"role":"anon"}';
select is(okc_owner_mode(), false, 'T-ME-11 로그인하지 않으면 보이지 않음');

-- 가게가 있으면 답과 상관없이 사장님
insert into store_members (store_id, user_id) values ('00000000-0000-0000-0000-0000000000e9', '00000000-0000-0000-0000-0000000000e1');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
select is(okc_owner_mode(), true, 'T-ME-11 가게가 있으면 답과 상관없이 사장님 메뉴를 보임');

-- 계정을 삭제하면 답도 지워진다
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';
select delete_my_account();
select is((select wants_store from profiles where id = '00000000-0000-0000-0000-0000000000e2'), null, 'T-ME-13 계정 삭제 뒤에는 답이 지워짐');

select * from finish();
rollback;
