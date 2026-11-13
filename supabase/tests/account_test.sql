-- 닉네임 · 관리자 주민 정보 · 계정 삭제 (test.md T-ME-06~09)
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'owner@test.local'), ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local');
insert into profiles (id) values ('00000000-0000-0000-0000-0000000000d1');
insert into profiles (id, role) values ('00000000-0000-0000-0000-0000000000a1', 'admin');
insert into stores (id, name, phone) values ('00000000-0000-0000-0000-0000000000b1', '삭제분식', '01011112222');
insert into store_members (store_id, user_id) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select save_my_profile('김옥천', '옥천읍', '010-1234-5678');
select ok(get_owner_home() -> 'profile' ->> 'nickname' ~ '^익명의 오소리 [0-9]{3}$', 'T-ME-06 닉네임을 안 정하면 익명의 오소리 NNN');
select save_my_profile('김옥천', '옥천읍', '010-1234-5678', null, '붕어빵러버');
select is(get_owner_home() -> 'profile' ->> 'nickname', '붕어빵러버', 'T-ME-06 닉네임을 정하면 그대로');
select is((select count(*)::int from admin_list_residents()), 0, 'T-ME-07 관리자가 아니면 주민 목록이 비어 있음');
select throws_ok($$ select admin_update_resident('00000000-0000-0000-0000-0000000000d1', '가', null, '옥천읍', '010-1234-5678') $$, 'P0001', 'NOT_ADMIN', 'T-ME-07 관리자만 주민 정보를 고침');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select count(*)::int from admin_list_residents() where store_name = '삭제분식'), 1, 'T-ME-08 관리자는 등록한 주민과 그 가게를 봄');
select admin_update_resident('00000000-0000-0000-0000-0000000000d1', '김옥천2', null, '이원면', '010-9999-8888');
select is((select display_name || nickname || area || phone from profiles where id = '00000000-0000-0000-0000-0000000000d1'), '김옥천2붕어빵러버이원면01099998888', 'T-ME-08 관리자가 주민 정보를 고침');

-- 계정 삭제: 내 정보가 지워지고 혼자 관리하던 가게도 지워진다. 다시 로그인하면 등록부터
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select delete_my_account();
select is((select (h ->> 'state') || '/' || (h -> 'profile' ->> 'registered') from get_owner_home() h) || '/' || (select count(*) from stores where id = '00000000-0000-0000-0000-0000000000b1'),
          'needs_store/false/0', 'T-ME-09 계정 삭제 뒤에는 내 정보 등록부터 다시');

select * from finish();
rollback;
