-- 소식 댓글 · 동네 이야기 댓글 · 제보 한 번에 답하기 (test.md T-PCMT, T-CCMT, T-REPLY)
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a2', 'admin@test.local', '{}'),
  ('00000000-0000-0000-0000-0000000000d1', 'owner@test.local', '{"nickname":"사장"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'kakao2@test.local', '{"nickname":"주민둘"}'),
  ('00000000-0000-0000-0000-0000000000d3', 'kakao3@test.local', '{}');
insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000c1', true),
  ('00000000-0000-0000-0000-0000000000c2', true);
insert into profiles (id, role) values ('00000000-0000-0000-0000-0000000000a2', 'admin');
create temp table v (k text primary key, val text);

-- 사장님 가게와 소식
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
insert into v select 'store', register_store('댓글 분식', '0432001234', '{"mon":[["09:00","20:00"]]}');
insert into v select 'post', save_store_post((select val::uuid from v where k = 'store'), '오늘 떡볶이 개시');

-- ── 소식 댓글 ──
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select ok(post_store_comment((select val::uuid from v where k = 'store'), '맛있겠다', (select val::uuid from v where k = 'post')) is not null, 'T-PCMT-01 소식에 댓글');
select is((get_store_detail((select val::uuid from v where k = 'store')) -> 'posts' -> 0 ->> 'comment_count')::int, 1, 'T-PCMT-01 소식 댓글 수');
select is(get_store_detail((select val::uuid from v where k = 'store')) -> 'posts' -> 0 -> 'comments' -> 0 ->> 'body', '맛있겠다', 'T-PCMT-01 소식 아래 댓글');
select is((get_store_detail((select val::uuid from v where k = 'store')) ->> 'comment_count')::int, 0, 'T-PCMT-02 가게 전체 댓글과 섞이지 않음');
select ok(not (get_store_detail((select val::uuid from v where k = 'store')) -> 'posts' -> 0 -> 'comments' -> 0 ? 'author_id'), 'T-PCMT-03 작성자 id 를 내보내지 않음');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","is_anonymous":true}';
select throws_ok($$ select post_store_comment((select val::uuid from v where k = 'store'), '남의 글', gen_random_uuid()) $$, 'P0001', 'NOT_FOUND', 'T-PCMT-04 다른 소식 번호는 거절');

-- ── 동네 이야기 댓글 ──
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
insert into v select 'cpost', post_community('우리 동네 이야기');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select throws_ok($$ select post_community_comment((select val::uuid from v where k = 'cpost'), '익명') $$, 'P0001', 'LOGIN_REQUIRED', 'T-CCMT-01 익명 세션은 댓글 못 씀');
select ok(not has_table_privilege('anon', 'community_comments', 'select'), 'T-CCMT-01 표를 직접 못 읽음');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}';
insert into v select 'c1', post_community_comment((select val::uuid from v where k = 'cpost'), '저도요');
select throws_ok($$ select post_community_comment((select val::uuid from v where k = 'cpost'), '또') $$, 'P0001', 'COMMENT_TOO_FAST', 'T-CCMT-02 도배 방지');
select ok((select comments -> 0 ->> 'anon_name' like '익명의 오소리 %' from get_community_posts() limit 1), 'T-CCMT-03 댓글도 익명');
select is((select comments -> 0 ->> 'is_mine' from get_community_posts() limit 1), 'true', 'T-CCMT-03 내 댓글 표시');
select ok(not (select comments -> 0 ? 'author_id' from get_community_posts() limit 1), 'T-CCMT-03 작성자 id 를 내보내지 않음');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select post_community_comment((select val::uuid from v where k = 'cpost'), '고마워요');
select ok((select comments @> '[{"anon_name":"글쓴이","body":"고마워요"}]' from get_community_posts() limit 1), 'T-CCMT-04 글쓴이 댓글 표시');
select throws_ok($$ select delete_community_comment((select val::uuid from v where k = 'c1')) $$, 'P0001', 'NOT_FOUND', 'T-CCMT-05 남의 댓글은 못 지움');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select throws_ok($$ select admin_reveal_community_comment_author((select val::uuid from v where k = 'c1'), ' ') $$, 'P0001', 'REASON_REQUIRED', 'T-CCMT-06 사유 없이는 못 봄');
select delete_community_comment((select val::uuid from v where k = 'c1'));
select is((select comment_count from get_community_posts() limit 1), 1, 'T-CCMT-07 관리자가 지우면 빠짐');

-- ── 제보 한 번에 답하기 ──
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select post_report((select val::uuid from v where k = 'store'), 'seen_closed');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","is_anonymous":true}';
select post_report((select val::uuid from v where k = 'store'), 'seen_open');
select throws_ok($$ select reply_reports((select val::uuid from v where k = 'store'), true) $$, 'P0001', 'NOT_OWNER', 'T-REPLY-01 주민은 답 못 함');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select reply_reports((select val::uuid from v where k = 'store'), true, '정상 영업해요');
select is((select sign || '/' || memo from current_sign((select val::uuid from v where k = 'store'))), 'open/정상 영업해요', 'T-REPLY-02 팻말과 쪽지가 바뀜');
select is((select string_agg(kind || ':' || status, ',' order by kind) from reports where store_id = (select val::uuid from v where k = 'store')),
          'seen_closed:rejected,seen_open:confirmed', 'T-REPLY-03 기다리던 제보를 모두 정리');
select throws_ok($$ select reply_reports((select val::uuid from v where k = 'store'), false) $$, 'P0001', 'ALREADY_RESOLVED', 'T-REPLY-04 남은 제보가 없으면 거절');

select * from finish();
rollback;
