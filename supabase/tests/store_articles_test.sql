-- 가게에 붙이는 옥천신문 기사 (test.md T-ARTICLE-01~06)
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'resident@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'admin@test.local');
insert into profiles (id) values ('00000000-0000-0000-0000-0000000000f1');
insert into profiles (id, role) values ('00000000-0000-0000-0000-0000000000f2', 'admin');
insert into stores (id, name, phone) values
  ('00000000-0000-0000-0000-0000000000f8', '기사분식', '01011112222'),
  ('00000000-0000-0000-0000-0000000000f9', '기사카페', '01033334444');

-- 관리자가 아니면 붙일 수 없다. 읽기는 누구나
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
select throws_ok($$ select admin_link_store_article('00000000-0000-0000-0000-0000000000f8', '302950', '제목') $$, 'P0001', 'NOT_ADMIN', 'T-ARTICLE-01 관리자만 기사를 붙임');
select is((select count(*)::int from get_store_articles()), 0, 'T-ARTICLE-01 붙인 기사가 없으면 비어 있음');

-- 관리자가 붙이면 누구에게나 보인다
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}';
select admin_link_store_article('00000000-0000-0000-0000-0000000000f8', '302950', '  청산면주민자치회, 돌봄 배웠다 ', 'https://cdn.okinews.com/news/photo/a.jpg', '2026-11-24T07:27:24+09:00');
set local request.jwt.claims to '{"role":"anon"}';
select is((select title || '|' || image_url from get_store_articles() where store_id = '00000000-0000-0000-0000-0000000000f8'),
          '청산면주민자치회, 돌봄 배웠다|https://cdn.okinews.com/news/photo/a.jpg', 'T-ARTICLE-02 붙인 기사의 제목·사진이 로그인 없이 보임');

-- 같은 기사를 다시 붙이면 한 줄만 남고 내용이 바뀐다
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}';
select admin_link_store_article('00000000-0000-0000-0000-0000000000f8', '302950', '고친 제목');
select is((select count(*)::text || '|' || max(title) || '|' || coalesce(max(image_url), '사진 없음') from get_store_articles() where store_id = '00000000-0000-0000-0000-0000000000f8'),
          '1|고친 제목|사진 없음', 'T-ARTICLE-03 같은 기사는 한 번만 붙고 내용이 바뀜');

-- 잘못된 값은 받지 않는다
select throws_ok($$ select admin_link_store_article('00000000-0000-0000-0000-0000000000f8', 'abc', '제목') $$, 'P0001', 'INVALID_ARTICLE', 'T-ARTICLE-04 기사 번호는 숫자만');
select throws_ok($$ select admin_link_store_article('00000000-0000-0000-0000-0000000000f8', '11', '   ') $$, 'P0001', 'INVALID_ARTICLE', 'T-ARTICLE-04 제목이 비면 거절');
select throws_ok($$ select admin_link_store_article('00000000-0000-0000-0000-0000000000f8', '11', '제목', 'https://evil.example/a.jpg') $$, 'P0001', 'INVALID_ARTICLE', 'T-ARTICLE-04 옥천신문 사진 주소가 아니면 거절');
select throws_ok($$ select admin_link_store_article('00000000-0000-0000-0000-0000000000f0', '11', '제목') $$, 'P0001', 'NOT_FOUND', 'T-ARTICLE-04 없는 가게에는 붙일 수 없음');

-- 가게마다 5개까지
select admin_link_store_article('00000000-0000-0000-0000-0000000000f8', n::text, '기사 ' || n) from generate_series(1, 4) n;
select throws_ok($$ select admin_link_store_article('00000000-0000-0000-0000-0000000000f8', '99', '여섯째') $$, 'P0001', 'TOO_MANY_ARTICLES', 'T-ARTICLE-05 가게마다 5개까지');
select admin_link_store_article('00000000-0000-0000-0000-0000000000f8', '302950', '다시 고친 제목');
select is((select title from get_store_articles() where store_id = '00000000-0000-0000-0000-0000000000f8' and article_id = '302950'), '다시 고친 제목', 'T-ARTICLE-05 꽉 차 있어도 이미 붙인 기사는 고칠 수 있음');

-- 새로 올라온 기사가 먼저
select admin_link_store_article('00000000-0000-0000-0000-0000000000f9', '1', '옛 기사', null, '2026-11-01T09:00:00+09:00');
select admin_link_store_article('00000000-0000-0000-0000-0000000000f9', '2', '새 기사', null, '2026-11-20T09:00:00+09:00');
select is((select string_agg(t.article_id, ',' order by t.ord) from get_store_articles() with ordinality as t(store_id, article_id, title, image_url, published_at, ord)
            where t.store_id = '00000000-0000-0000-0000-0000000000f9'), '2,1', 'T-ARTICLE-02 새로 올라온 기사가 먼저');

-- 표는 직접 읽을 수 없다 (RPC 로만)
create temp table direct_read (result text);
do $$
begin
  set local role authenticated;
  begin
    perform 1 from store_articles;
    reset role;
    insert into direct_read values ('read');
  exception when others then
    reset role;
    insert into direct_read values (sqlstate);
  end;
end;
$$;
select is((select result from direct_read), '42501', 'T-ARTICLE-01 표를 직접 읽을 수 없음');

-- 떼기도 관리자만
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
select throws_ok($$ select admin_unlink_store_article('00000000-0000-0000-0000-0000000000f9', '1') $$, 'P0001', 'NOT_ADMIN', 'T-ARTICLE-06 관리자만 기사를 뗌');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}';
select admin_unlink_store_article('00000000-0000-0000-0000-0000000000f9', '1');
select is((select string_agg(article_id, ',') from get_store_articles() where store_id = '00000000-0000-0000-0000-0000000000f9'), '2', 'T-ARTICLE-06 뗀 기사는 사라지고 나머지는 남음');
select throws_ok($$ select admin_unlink_store_article('00000000-0000-0000-0000-0000000000f9', '1') $$, 'P0001', 'NOT_FOUND', 'T-ARTICLE-06 이미 뗀 기사는 찾을 수 없음');

-- 가게를 지우면 붙인 기사도 지워진다
delete from stores where id = '00000000-0000-0000-0000-0000000000f9';
select is((select count(*)::int from store_articles where store_id = '00000000-0000-0000-0000-0000000000f9'), 0, 'T-ARTICLE-06 가게를 지우면 붙인 기사도 지워짐');

select * from finish();
rollback;
