-- 코드·가게 지우기, 보호된 코드, 새 가게 + 코드 연결 (test.md T-DEL)
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a2', 'admin@test.local');
insert into auth.users (id, is_anonymous) values ('00000000-0000-0000-0000-0000000000c1', true);
insert into profiles (id, role) values ('00000000-0000-0000-0000-0000000000a2', 'admin');
insert into okc_secrets (key, hash) values ('protected_delete', extensions.crypt('9999', extensions.gen_salt('bf')))
on conflict (key) do update set hash = excluded.hash;
create temp table v (k text primary key, val text);
insert into owner_codes (phone, code, protected) values ('01099990001', '타-00091', true);

-- 익명 사용자는 못 한다
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select throws_ok($$ select admin_delete_code('01099990001') $$, 'P0001', 'NOT_ADMIN', 'T-DEL-01 익명은 코드를 못 지움');
select throws_ok($$ select admin_delete_store(gen_random_uuid()) $$, 'P0001', 'NOT_ADMIN', 'T-DEL-01 익명은 가게를 못 지움');
select ok(not has_function_privilege('anon', 'admin_delete_code(text, text)', 'execute'), 'T-DEL-01 공개 키로 호출 불가');
select ok(not has_function_privilege('authenticated', '_okc_check_delete_password(text)', 'execute'), 'T-DEL-01 비밀번호 확인 함수는 직접 호출 불가');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';

-- 일반 코드는 비밀번호 없이 지운다
select is(admin_issue_code('010-9999-0002') ->> 'created', 'true', 'T-DEL-02 코드 준비');
select is(admin_delete_code('010-9999-0002') ->> 'ok', 'true', 'T-DEL-02 일반 코드 삭제');
select is((select count(*)::int from owner_codes where phone = '01099990002'), 0, 'T-DEL-02 목록에서 사라짐');

-- 보호된 코드
select is(admin_delete_code('01099990001') ->> 'error', 'WRONG_PASSWORD', 'T-DEL-03 비밀번호 없으면 거절');
select is(admin_delete_code('01099990001', '0000') ->> 'error', 'WRONG_PASSWORD', 'T-DEL-03 틀린 비밀번호 거절');
select throws_ok($$ select admin_reissue_code('01099990001') $$, 'P0001', 'PROTECTED_CODE', 'T-DEL-03 새 코드로 못 바꿈');
select is((select code from owner_codes where phone = '01099990001'), '타-00091', 'T-DEL-03 코드는 그대로');

-- 새 가게 + 코드 연결
insert into v select 'store', admin_register_store('연결 가게', null, null, null, true, '010-9999-0001') ->> 'store_id';
select is((select store_id::text from owner_codes where phone = '01099990001'), (select val from v where k = 'store'), 'T-DEL-04 새 가게가 코드와 연결됨');
select is((select phone from stores where id = (select val::uuid from v where k = 'store')), null, 'T-DEL-04 사장님 번호를 가게 전화로 공개하지 않음');
select throws_ok($$ select admin_register_store('다른 가게', null, null, null, true, '010-9999-0001') $$, 'P0001', 'CODE_HAS_STORE', 'T-DEL-04 이미 연결된 번호는 거절');
select is((select count(*)::int from stores where name = '다른 가게'), 0, 'T-DEL-04 연결 실패하면 가게도 안 만들어짐');

-- 보호는 코드에만 건다. 연결된 가게는 비밀번호 없이 지워진다
select is(admin_delete_store((select val::uuid from v where k = 'store')) ->> 'ok', 'true', 'T-DEL-05 보호 코드와 연결된 가게도 비밀번호 없이 삭제');
select is((select store_id from owner_codes where phone = '01099990001'), null, 'T-DEL-05 코드는 남고 가게 등록 전으로');

-- 너무 많이 틀리면 막는다 (위에서 2번 틀림)
select admin_delete_code('01099990001', '0000');
select admin_delete_code('01099990001', '0000');
select admin_delete_code('01099990001', '0000');
select is(admin_delete_code('01099990001', '9999') ->> 'error', 'TOO_MANY_ATTEMPTS', 'T-DEL-06 5번 틀리면 맞아도 잠시 막음');

select * from finish();
rollback;
