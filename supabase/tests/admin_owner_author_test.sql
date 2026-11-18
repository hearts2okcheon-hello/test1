-- 관리자: 가게 정보의 주민 이름·주소, 작성자 확인 정보 (test.md T-ADMIN-INFO-01~04)
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'writer@test.local', '{"nickname":"카카오홍길동"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'admin@test.local', '{}');
insert into profiles (id, display_name, nickname, area, phone, registered_at) values ('00000000-0000-0000-0000-0000000000c1', '홍길동', '붕어빵러버', '이원면', '01012345678', now());
insert into profiles (id, role) values ('00000000-0000-0000-0000-0000000000c2', 'admin');
insert into stores (id, name, phone, address) values ('00000000-0000-0000-0000-0000000000c5', '정보분식', '01011112222', '옥천읍 중앙로 1');
insert into store_members (store_id, user_id) values ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c1');
insert into community_posts (id, author_id, anon_name, body) values ('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000c1', '익명1', '확인 테스트 글');

-- 관리자가 아니면 볼 수 없다
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is((select count(*)::int from admin_list_store_info()), 0, 'T-ADMIN-INFO-01 관리자가 아니면 가게 정보 목록이 비어 있음');
select throws_ok($$ select admin_reveal_community_author('00000000-0000-0000-0000-0000000000c9', '확인') $$, 'P0001', 'NOT_ADMIN', 'T-ADMIN-INFO-02 관리자만 작성자를 확인');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select is((select owner_name || '/' || owner_area || '/' || address from admin_list_store_info() where store_id = '00000000-0000-0000-0000-0000000000c5'),
          '홍길동/이원면/옥천읍 중앙로 1', 'T-ADMIN-INFO-01 가게 정보에 주민 이름·사는 곳·가게 주소');
select throws_ok($$ select admin_reveal_community_author('00000000-0000-0000-0000-0000000000c9', ' ') $$, 'P0001', 'REASON_REQUIRED', 'T-ADMIN-INFO-03 사유 없이는 확인할 수 없음');
select is((select (j ->> 'nickname') || '/' || (j ->> 'name') || '/' || (j ->> 'oksori_nickname') || '/' || (j ->> 'email') || '/' || (j ->> 'phone')
             from admin_reveal_community_author('00000000-0000-0000-0000-0000000000c9', '신고 확인') j),
          '카카오홍길동/홍길동/붕어빵러버/writer@test.local/01012345678', 'T-ADMIN-INFO-04 카카오 닉네임·옥!소리 이름·계정·전화번호');
select is((select count(*)::int from community_author_views where post_id = '00000000-0000-0000-0000-0000000000c9' and reason = '신고 확인'), 1, 'T-ADMIN-INFO-04 확인 기록이 남음');

select * from finish();
rollback;
