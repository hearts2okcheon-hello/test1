-- 동네 이야기 고치기와 "수정됨" 표시 (test.md T-COMM-EDIT, ADR-025)
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a2', 'admin@test.local', '{}'),
  ('00000000-0000-0000-0000-0000000000d1', 'kakao@test.local', '{"nickname":"옥천주민"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'kakao2@test.local', '{}');
insert into auth.users (id, is_anonymous) values ('00000000-0000-0000-0000-0000000000c1', true);
insert into profiles (id, role) values ('00000000-0000-0000-0000-0000000000a2', 'admin');
create temp table v (k text primary key, val text);

select ok(not has_function_privilege('anon', 'update_community_post(uuid, text)', 'execute'), 'T-COMM-EDIT-01 공개 키로는 글을 못 고침');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
insert into v select 'post', post_community('처음 쓴 글');
insert into v select 'name', anon_name from get_community_post((select val::uuid from v where k = 'post'));

-- 고친 시각(updated_at)이 있는 글에만 화면에서 "수정됨"을 붙인다
select ok((select updated_at is null from get_community_post((select val::uuid from v where k = 'post'))), 'T-COMM-EDIT-07 새 글에는 고친 시각이 없음 (수정됨 없음)');
select update_community_post((select val::uuid from v where k = 'post'), '  처음 쓴 글 ');
select ok((select updated_at is null from get_community_post((select val::uuid from v where k = 'post'))), 'T-COMM-EDIT-07 내용을 바꾸지 않고 저장하면 고친 시각을 적지 않음');

select update_community_post((select val::uuid from v where k = 'post'), '  고친 글  ');
select is((select body from get_community_post((select val::uuid from v where k = 'post'))), '고친 글', 'T-COMM-EDIT-02 글쓴이는 자기 글을 고침 (앞뒤 빈칸은 뗌)');
select is((select anon_name from get_community_post((select val::uuid from v where k = 'post'))), (select val from v where k = 'name'), 'T-COMM-EDIT-02 고쳐도 익명 이름은 그대로');
select ok(not (select to_jsonb(g) ? 'author_id' from get_community_post((select val::uuid from v where k = 'post')) g), 'T-COMM-EDIT-02 고친 뒤에도 작성자 id 를 내보내지 않음');
select ok((select updated_at is not null from get_community_post((select val::uuid from v where k = 'post'))), 'T-COMM-EDIT-08 내용을 고치면 고친 시각이 생김 (글 화면)');
select ok((select updated_at is not null from get_community_posts() where id = (select val::uuid from v where k = 'post')), 'T-COMM-EDIT-08 목록에도 고친 시각이 나옴');

-- 이미 고친 글을 같은 내용으로 다시 저장해도 고친 시각은 그대로다 (검사에서는 시각을 옛날로 돌려 놓고 본다)
update community_posts set updated_at = '2026-01-01T00:00:00Z' where id = (select val::uuid from v where k = 'post');
select update_community_post((select val::uuid from v where k = 'post'), '고친 글');
select is((select updated_at from get_community_post((select val::uuid from v where k = 'post'))), '2026-01-01T00:00:00Z'::timestamptz, 'T-COMM-EDIT-09 같은 내용으로 다시 저장하면 고친 시각이 그대로');

select throws_ok($$ select update_community_post((select val::uuid from v where k = 'post'), '   ') $$, 'P0001', 'INVALID_BODY', 'T-COMM-EDIT-03 빈 글로는 못 고침');
select throws_ok($$ select update_community_post((select val::uuid from v where k = 'post'), repeat('가', 501)) $$, 'P0001', 'TEXT_TOO_LONG', 'T-COMM-EDIT-03 500자를 넘으면 못 고침');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select throws_ok($$ select update_community_post((select val::uuid from v where k = 'post'), '남이 고침') $$, 'P0001', 'NOT_FOUND', 'T-COMM-EDIT-04 남의 글은 못 고침');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select throws_ok($$ select update_community_post((select val::uuid from v where k = 'post'), '관리자가 고침') $$, 'P0001', 'NOT_FOUND', 'T-COMM-EDIT-04 관리자도 남의 글은 못 고침 (지우기만)');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select throws_ok($$ select update_community_post((select val::uuid from v where k = 'post'), '익명이 고침') $$, 'P0001', 'LOGIN_REQUIRED', 'T-COMM-EDIT-05 익명 세션은 못 고침');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select is((select body from get_community_post((select val::uuid from v where k = 'post'))), '고친 글', 'T-COMM-EDIT-04 실패한 고치기는 글을 바꾸지 않음');
select delete_community_post((select val::uuid from v where k = 'post'));
select throws_ok($$ select update_community_post((select val::uuid from v where k = 'post'), '지운 뒤') $$, 'P0001', 'NOT_FOUND', 'T-COMM-EDIT-06 지운 글은 못 고침');

select * from finish();
rollback;
