-- 소통광장 동네 이야기 (test.md T-COMM)
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a2', 'admin@test.local', '{}'),
  ('00000000-0000-0000-0000-0000000000d1', 'kakao@test.local', '{"nickname":"옥천주민"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'kakao2@test.local', '{}');
insert into auth.users (id, is_anonymous) values ('00000000-0000-0000-0000-0000000000c1', true);
insert into profiles (id, role) values ('00000000-0000-0000-0000-0000000000a2', 'admin');
create temp table v (k text primary key, val text);

select ok(not has_table_privilege('anon', 'community_posts', 'select'), 'T-COMM-01 공개 키로 표를 직접 못 읽음');
select ok(not has_function_privilege('anon', 'post_community(text)', 'execute'), 'T-COMM-01 공개 키로 글을 못 씀');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select throws_ok($$ select post_community('안녕') $$, 'P0001', 'LOGIN_REQUIRED', 'T-COMM-02 익명 세션은 못 씀');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
insert into v select 'post', post_community('우리 동네 이야기');
select throws_ok($$ select post_community('또') $$, 'P0001', 'COMMENT_TOO_FAST', 'T-COMM-03 30초에 하나');
select is((select is_mine from get_community_posts() limit 1), true, 'T-COMM-04 내 글 표시');
select ok((select anon_name like '익명의 오소리 %' from get_community_posts() limit 1), 'T-COMM-04 익명 이름');
select ok(not (select to_jsonb(g) ? 'author_id' from get_community_posts() g limit 1), 'T-COMM-05 작성자 id 를 내보내지 않음');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select throws_ok($$ select delete_community_post((select val::uuid from v)) $$, 'P0001', 'NOT_FOUND', 'T-COMM-06 남의 글은 못 지움');
select throws_ok($$ select admin_reveal_community_author((select val::uuid from v), '확인') $$, 'P0001', 'NOT_ADMIN', 'T-COMM-07 주민은 작성자를 못 봄');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select throws_ok($$ select admin_reveal_community_author((select val::uuid from v), '  ') $$, 'P0001', 'REASON_REQUIRED', 'T-COMM-08 사유 없이는 못 봄');
select is(admin_reveal_community_author((select val::uuid from v), '욕설 신고') ->> 'nickname', '옥천주민', 'T-COMM-08 사유를 쓰면 카카오 닉네임 확인');
select is((select count(*)::int from community_author_views), 1, 'T-COMM-08 열람 기록이 남음');

select delete_community_post((select val::uuid from v));
select is((select count(*)::int from get_community_posts()), 0, 'T-COMM-09 관리자가 지우면 안 보임');

select * from finish();
rollback;
