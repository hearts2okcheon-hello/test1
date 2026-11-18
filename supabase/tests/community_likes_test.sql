-- 동네 이야기 공감 · 글 하나 보기 (test.md T-COMM-LIKE-01~04)
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f1', 'a@test.local'), ('00000000-0000-0000-0000-0000000000f2', 'b@test.local');
insert into community_posts (id, author_id, anon_name, body) values ('00000000-0000-0000-0000-0000000000f9', '00000000-0000-0000-0000-0000000000f1', '익명1', '공감 테스트 글');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}';
select toggle_community_like('00000000-0000-0000-0000-0000000000f9', true);
select toggle_community_like('00000000-0000-0000-0000-0000000000f9', true);
select is((select like_count::text || '/' || liked_by_me::text from get_community_post('00000000-0000-0000-0000-0000000000f9')), '1/true', 'T-COMM-LIKE-01 두 번 눌러도 공감은 한 번');
select is((select like_count::text || '/' || liked_by_me::text from get_community_posts() where id = '00000000-0000-0000-0000-0000000000f9'), '1/true', 'T-COMM-LIKE-02 목록에도 공감 수가 나옴');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
select is((select like_count::text || '/' || liked_by_me::text from get_community_post('00000000-0000-0000-0000-0000000000f9')), '1/false', 'T-COMM-LIKE-03 다른 사람에게는 내가 누른 것으로 보이지 않음');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}';
select toggle_community_like('00000000-0000-0000-0000-0000000000f9', false);
select is((select like_count from get_community_post('00000000-0000-0000-0000-0000000000f9')), 0, 'T-COMM-LIKE-03 다시 누르면 취소');
select throws_ok($$ select toggle_community_like('00000000-0000-0000-0000-0000000000aa', true) $$, 'P0001', 'NOT_FOUND', 'T-COMM-LIKE-04 없는 글에는 공감할 수 없음');
select is((select count(*)::int from get_community_post('00000000-0000-0000-0000-0000000000aa')), 0, 'T-COMM-LIKE-04 없는 글은 나오지 않음');

select * from finish();
rollback;
