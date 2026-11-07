-- 사장님 코드·가게 등록·소식·댓글·임시휴무·영업 상태 (test.md T-CODE, T-STORE, T-POST, T-COMMENT, T-CLOSURE, T-SCHED)
begin;
create extension if not exists pgtap with schema extensions;
select plan(44);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a2', 'admin@test.local');
insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000c1', true),
  ('00000000-0000-0000-0000-0000000000c2', true),
  ('00000000-0000-0000-0000-0000000000c3', true);
insert into profiles (id, role) values ('00000000-0000-0000-0000-0000000000a2', 'admin');
create temp table v (k text primary key, val text);

-- ── 코드 발급 ──────────────────────────────────────
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
insert into v select 'code1', admin_issue_code('010-1111-2222') ->> 'code';
select ok((select val ~ '^[가나다라마바사아자차카타파하]-[0-9]{5}$' from v where k = 'code1'), 'T-CODE-01 형식 가~하 + 숫자 5자리');
select is(admin_issue_code('01011112222') ->> 'code', (select val from v where k = 'code1'), 'T-CODE-02 같은 번호는 항상 같은 코드');
select is(admin_issue_code('010 1111 2222') ->> 'created', 'false', 'T-CODE-02 다시 넣으면 새로 만들지 않음');
select isnt(admin_issue_code('010-3333-4444') ->> 'code', (select val from v where k = 'code1'), 'T-CODE-03 다른 번호는 다른 코드');
select throws_ok($$ select admin_issue_code('1234') $$, 'P0001', 'INVALID_PHONE', 'T-CODE-04 전화번호 형식 검사');
select cmp_ok((select count(*)::int from admin_list_owner_codes()), '>=', 2, 'T-CODE-05 관리자는 발급 목록을 봄');
-- 미리 정해 둔 번호·코드도 조회된다 (시험용 번호)
insert into owner_codes (phone, code) values ('01055556666', '타-00001');
select is(admin_issue_code('010-5555-6666') ->> 'code', '타-00001', 'T-CODE-06 미리 넣어 둔 번호·코드 조회');

-- ── 코드 입력 → 가게 등록 ──────────────────────────
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select is(get_owner_home() ->> 'state', 'no_store', 'T-STORE-01 코드 전에는 코드 입력 화면');
select throws_ok($$ select register_store('가게', '0432001234', '{"mon":[["09:00","20:00"]]}') $$, 'P0001', 'NOT_OWNER', 'T-STORE-02 코드 없이 등록 불가');
select is(redeem_store_code('타 00001') ->> 'needs_store', 'true', 'T-STORE-03 가게 없는 코드는 등록 화면으로');
select is(get_owner_home() ->> 'state', 'needs_store', 'T-STORE-03 사장님 홈 상태 needs_store');
select throws_ok($$ select register_store('', '0432001234', '{"mon":[["09:00","20:00"]]}') $$, 'P0001', 'INVALID_NAME', 'T-STORE-04 이름 필수');
select throws_ok($$ select register_store('가게', '12', '{"mon":[["09:00","20:00"]]}') $$, 'P0001', 'INVALID_PHONE', 'T-STORE-04 전화번호 필수');
select throws_ok($$ select register_store('가게', '0432001234', '{"mon":null}') $$, 'P0001', 'INVALID_HOURS', 'T-STORE-04 영업일 하루 이상');
select throws_ok($$ select register_store('가게', '0432001234', '{"mon":[["아침","20:00"]]}') $$, 'P0001', 'INVALID_HOURS', 'T-STORE-04 영업시간 형식');
insert into v select 'store', register_store('대박 분식', '043-200-1234',
  '{"mon":[["00:00","00:00"]],"tue":[["00:00","00:00"]],"wed":[["00:00","00:00"]],"thu":[["00:00","00:00"]],"fri":[["00:00","00:00"]],"sat":[["00:00","00:00"]],"sun":[["00:00","00:00"]]}',
  '분식', '우리동네 사랑방', '소개글', '충북 옥천군 옥천읍 중앙로 1');
select is(get_owner_home() ->> 'state', 'owner', 'T-STORE-05 등록하면 사장님 화면');
select throws_ok($$ select register_store('또', '0432001234', '{"mon":[["09:00","20:00"]]}') $$, 'P0001', 'ALREADY_REGISTERED', 'T-STORE-06 코드 하나에 가게 하나');
select is(get_store_detail((select val::uuid from v where k = 'store')) -> 'profile' ->> 'phone', '0432001234', 'T-STORE-07 공개 전화번호');
select is(get_store_detail((select val::uuid from v where k = 'store')) ->> 'can_manage', 'true', 'T-STORE-07 사장님은 관리 가능');

-- 다른 휴대폰도 같은 코드로 연결된다
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","is_anonymous":true}';
select is(redeem_store_code('타-00001') ->> 'store_name', '대박 분식', 'T-STORE-08 등록 후 코드를 넣으면 수정 가능한 사장님이 됨');
select is(get_store_detail((select val::uuid from v where k = 'store')) ->> 'can_manage', 'true', 'T-STORE-08 관리 가능');

-- 다른 사람은 고칠 수 없다
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated","is_anonymous":true}';
select is(get_store_detail((select val::uuid from v where k = 'store')) ->> 'can_manage', 'false', 'T-STORE-09 주민은 관리 불가');
select throws_ok(format($$ select update_store_profile(%L, '바꿈', '0432001234', '{"mon":[["09:00","20:00"]]}') $$, (select val from v where k = 'store')), 'P0001', 'NOT_OWNER', 'T-STORE-09 수정 불가');
select throws_ok(format($$ select save_store_post(%L, '글') $$, (select val from v where k = 'store')), 'P0001', 'NOT_OWNER', 'T-POST-01 주민은 소식 불가');

-- ── 메뉴·사진 ──────────────────────────────────────
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select throws_ok(format($$ select save_store_media(%L, '[]', '[{"category":"food","url":"https://evil.example/x.jpg"}]') $$, (select val from v where k = 'store')), 'P0001', 'INVALID_PHOTO', 'T-STORE-10 다른 사이트 사진 주소 거부');
select lives_ok(format($$ select save_store_media(%1$L, '[{"name":"떡볶이","price":5000},{"name":"튀김","price":null}]', jsonb_build_array(jsonb_build_object('category','food','url','https://x.supabase.co/storage/v1/object/public/store-media/%1$s/a.webp'))) $$, (select val from v where k = 'store')), 'T-STORE-11 메뉴·사진 저장');
select is(jsonb_array_length(get_store_detail((select val::uuid from v where k = 'store')) -> 'menus'), 2, 'T-STORE-11 메뉴 2개');
select is(jsonb_array_length(get_store_detail((select val::uuid from v where k = 'store')) -> 'photos'), 1, 'T-STORE-11 사진 1장');

-- ── 소식 ───────────────────────────────────────────
insert into v select 'post', save_store_post((select val::uuid from v where k = 'store'), '오늘 떡볶이 나왔어요');
select is((select count(*)::int from get_today_feed(50) where item_type = 'post' and store_name = '대박 분식'), 1, 'T-POST-02 소식이 오늘 들어온 소식에 뜸');
select lives_ok(format($$ select save_store_post(%L, '고친 글', 'notice', null, %L) $$, (select val from v where k = 'store'), (select val from v where k = 'post')), 'T-POST-03 수정');
select is((select memo from get_today_feed(50) where item_type = 'post' and store_name = '대박 분식'), '고친 글', 'T-POST-03 수정 내용 반영');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated","is_anonymous":true}';
select is(toggle_post_like((select val::uuid from v where k = 'post')), 1, 'T-POST-04 공감');
select is(toggle_post_like((select val::uuid from v where k = 'post')), 1, 'T-POST-04 한 사람 한 번');

-- ── 댓글 ───────────────────────────────────────────
insert into v select 'c1', post_store_comment((select val::uuid from v where k = 'store'), '오늘도 갈게요');
select throws_ok(format($$ select post_store_comment(%L, '도배') $$, (select val from v where k = 'store')), 'P0001', 'COMMENT_TOO_FAST', 'T-COMMENT-01 연속 작성 제한');
select ok(not (get_store_detail((select val::uuid from v where k = 'store')) -> 'comments' -> 0 ? 'author_id'), 'T-COMMENT-02 작성자 id 비노출');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","is_anonymous":true}';
select lives_ok(format($$ select delete_store_comment(%L) $$, (select val from v where k = 'c1')), 'T-COMMENT-03 사장님이 삭제');
select is(get_store_detail((select val::uuid from v where k = 'store')) ->> 'comment_count', '0', 'T-COMMENT-03 삭제 반영');

-- ── 영업 상태·임시휴무 ─────────────────────────────
select is((select schedule_status || '/' || schedule_basis from get_store_signs() where name = '대박 분식'), 'open/hours', 'T-SCHED-01 영업시간 안 = 영업중(시간 기준)');
select is((select sign from get_store_signs() where name = '대박 분식'), 'none', 'T-SCHED-02 팻말은 그대로 소식 없음 (시간으로 확정하지 않음)');
insert into v select 'cl', set_temp_closure((select val::uuid from v where k = 'store'),
  (now() at time zone 'Asia/Seoul')::date, (now() at time zone 'Asia/Seoul')::date + 2, '가족 여행');
select is((select sign || '/' || memo from get_store_signs() where name = '대박 분식'), 'temp_closed/가족 여행', 'T-CLOSURE-01 임시휴무가 팻말이 됨');
select is((select schedule_status from get_store_signs() where name = '대박 분식'), 'temp_closed', 'T-CLOSURE-01 영업 상태도 임시휴무');
select throws_ok(format($$ select set_temp_closure(%L, (now() at time zone 'Asia/Seoul')::date + 1, (now() at time zone 'Asia/Seoul')::date + 3) $$, (select val from v where k = 'store')), 'P0001', 'CLOSURE_OVERLAP', 'T-CLOSURE-02 겹치는 기간 불가');
select lives_ok(format($$ select cancel_temp_closure(%L) $$, (select val from v where k = 'cl')), 'T-CLOSURE-03 언제든 취소');
select is((select schedule_status from get_store_signs() where name = '대박 분식'), 'open', 'T-CLOSURE-03 취소하면 원래대로');

select * from finish();
rollback;
