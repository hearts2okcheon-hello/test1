-- 주요 뉴스 조회수·공감 (test.md T-NEWS)
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000c1', true),
  ('00000000-0000-0000-0000-0000000000c2', true);

select ok(not has_table_privilege('anon', 'news_likes', 'select'), 'T-NEWS-01 공감 표를 직접 못 읽음');
select ok(has_function_privilege('anon', 'record_news_view(text)', 'execute'), 'T-NEWS-02 로그인 없이 조회 기록');

select record_news_view('302605');
select record_news_view('302605');
select is((select views from get_news_stats(array['302605', '1'])  where article_id = '302605'), 2, 'T-NEWS-02 조회수 증가');
select is((select views from get_news_stats(array['1'])), 0, 'T-NEWS-02 기록 없는 기사는 0');
select throws_ok($$ select record_news_view('abc') $$, 'P0001', 'NOT_FOUND', 'T-NEWS-03 기사 번호가 아니면 거절');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select toggle_news_like('302605', true);
select toggle_news_like('302605', true);
select is((select likes from get_news_stats(array['302605'])), 1, 'T-NEWS-04 한 사람 한 번만 공감');
select is((select liked_by_me from get_news_stats(array['302605'])), true, 'T-NEWS-04 내 공감 표시');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","is_anonymous":true}';
select is((select liked_by_me from get_news_stats(array['302605'])), false, 'T-NEWS-05 남의 공감은 내 것 아님');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select toggle_news_like('302605', false);
select is((select likes from get_news_stats(array['302605'])), 0, 'T-NEWS-06 공감 취소');

select * from finish();
rollback;
