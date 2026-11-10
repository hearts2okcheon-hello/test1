-- 가게 즐겨찾기 (test.md T-FAV)
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000c1', true),
  ('00000000-0000-0000-0000-0000000000c2', true);
insert into stores (id, name) values
  ('00000000-0000-0000-0000-0000000000b1', '별가게'),
  ('00000000-0000-0000-0000-0000000000b2', '둘째가게');

select ok(not has_table_privilege('anon', 'store_favorites', 'select'), 'T-FAV-01 표를 직접 못 읽음');
select ok(not has_function_privilege('anon', 'toggle_favorite(uuid, boolean)', 'execute'), 'T-FAV-01 세션 없이는 못 누름');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select toggle_favorite('00000000-0000-0000-0000-0000000000b1', true);
select toggle_favorite('00000000-0000-0000-0000-0000000000b1', true);
select toggle_favorite('00000000-0000-0000-0000-0000000000b2', true);
select is((select count(*)::int from get_my_favorites()), 2, 'T-FAV-02 즐겨찾기 두 곳, 중복 없음');
select throws_ok($$ select toggle_favorite(gen_random_uuid(), true) $$, 'P0001', 'NOT_FOUND', 'T-FAV-03 없는 가게는 거절');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","is_anonymous":true}';
select is((select count(*)::int from get_my_favorites()), 0, 'T-FAV-04 남의 즐겨찾기는 안 보임');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select toggle_favorite('00000000-0000-0000-0000-0000000000b1', false);
select is((select array_agg(g)::text from get_my_favorites() g), '{00000000-0000-0000-0000-0000000000b2}', 'T-FAV-05 별 끄기');
delete from stores where id = '00000000-0000-0000-0000-0000000000b2';
select is((select count(*)::int from get_my_favorites()), 0, 'T-FAV-06 가게가 지워지면 즐겨찾기도 정리');

select * from finish();
rollback;
