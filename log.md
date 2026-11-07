# log.md — Dev Log

> 작업할 때마다 위에 새 항목을 추가한다(최신이 위). 한 항목은 짧게.
> 형식: `## YYYY-MM-DD` → 한 일 / 결정 / 막힌 것 / 다음

---

## 2026-11-07
- ADR-008: 관리자 가게 고르기·지우기, 코드 지우기, 보호 코드(코드에만 적용, 비밀번호는 DB에 해시로만), 새 가게 + 코드 연결, 모든 삭제에 예/아니오 창. 등록 화면에 뒤로, 카테고리 직접 적기, 카카오 주소 찾기, 번호 자동. 영업 상태도 칩 모양으로. pgTAP 19개 추가. 관리자 화면은 로그인이 필요해 브라우저 확인 못 함.
- 코드 입력 화면에 관리자 입구(신문 읽는 오소리), 로그인 화면에 돌아가기·비밀번호 보기, 화면 전환 로딩, 터치 표시, 대리 등록 쪽지 "개인 사정으로 휴무합니다" 추가. 대리 등록 쪽지는 관리자 로그인이 필요해 화면 확인 못 함.
- 요청: 전화번호별 코드(가~하 + 숫자 5자리), 관리자 코드 발급, 사장님이 직접 만드는 가게 페이지(시안 7구역), 소식·임시휴무, 마을방송 반영.
- 결정 (ADR-007): 참고 시안에 따라 가게 이름은 두고 "등록 영역" 칸을 전화번호로. 번호는 공개하고 전화하기 버튼 연결. 주민 댓글·공감 추가(기존 금지 규칙 수정). "영업중"은 "등록한 영업시간 기준" 문구와 함께 표시하고 팻말 규칙은 유지. 지도는 키 없이 카카오맵 링크.
- 확인: typecheck · Vitest 30 · 클라우드 pgTAP 95개(기존 51 + 새 44) · 공개 키로 새 표 직접 읽기·관리자 RPC 차단 · 360px 화면.
- 막힌 것: 익명 로그인이 꺼져 있고 관리자 계정이 없어 실제 등록·발급 흐름과 사진 올리기는 브라우저에서 확인 못 함. DB 수준은 테스트로 확인.
- 예시 가게 5곳을 클라우드에서 지우고 seed.sql을 비움(연결된 공지·제보·소식 0건).
- 익명 로그인 켠 뒤 로컬에서 코드 입력 → 사진 포함 등록 → 소식 → 임시휴무·취소 → 마을방송 반영까지 확인하고 시험 데이터 삭제. 관리자 권한 부여. 관리자 화면 로그인은 사용자 비밀번호가 필요해 아직 확인 못 함.
- 실제 전화번호와 코드는 저장소가 아니라 DB에만 넣음.

## 2026-11-05
- 사용자가 Supabase `OhaiyoOkcheon` 프로젝트 삭제(이전 버전과 섞이지 않게) → 배포 사이트가 "불러오지 못했어요"로 바뀜. 같은 조직 "Welcome, hearts2okcheon"의 새 프로젝트 `test1`(ref encttfcrxuckoqkrakoi, 서울)에 다시 구축. 새 프로젝트 생성은 무료 한도에 걸려 사용자가 대시보드에서 만듦.
- 결정 (ADR-006): 카카오 로그인은 미루고 **가게 코드 6자리**로 사장님 연결. 옥천신문이 관리자 화면에서 발급·재발급(연결 모두 끊기 포함), 사장님은 "내 가게" 탭에 한 번 입력 → 그 기기의 익명 세션이 `store_members`에 연결. 10분 5회 오입력 제한.
- 바뀐 것: `store_claims`·`stores.owner_id` 제거 → `store_codes`·`store_members`·`code_attempts`. RPC `request_claim`·`review_claim`·`admin_list_claims` 제거 → `redeem_store_code`·`admin_issue_store_code`·`admin_list_store_codes`. `/owner/login`·`/owner/claim`·`/auth/callback`·개발용 이메일 로그인 삭제, `/owner`에 코드 입력 화면, 관리자 "가게 코드" 탭.
- 확인: typecheck · Vitest 18 · 새 프로젝트에서 pgTAP 51개(코드 테스트 10개 추가) 통과, 예시 가게 5곳 seed, 보안 점검 이상 없음(의도된 항목만). `/owner` 코드 입력 화면 375px 확인.
- 남은 것: 새 프로젝트 익명 로그인 켜기, Vercel 환경변수 교체 + Redeploy, 관리자 계정 만들기. 커밋 안 함.

## 2026-11-04
- Node 26 설치 후 처음으로 실행 확인: `npm install` → typecheck 에러 10개(Supabase 쿠키 콜백 타입) 수정 → typecheck 통과, Vitest 17개 통과, `next build` 성공.
- 가짜 API로 375px 화면 확인(마을방송·가게 상세·제보 시트·사장님 로그인·사장님 화면). 고친 것: Next 이미지 최적화가 투명 WebP 오소리를 깨뜨려서 `unoptimized`로 변경, 가게 카드 보조 줄이 한 줄에서 잘려 2줄로.
- 추가: 로딩 화면, 에러 화면, `.env.local` 누락 시 안내(미들웨어는 건너뜀).
- 아직: pgTAP DB 테스트, 실제 Supabase 연결, 관리자 화면 눈으로 확인.
- Supabase 연결: 새 무료 프로젝트는 한도(2개) 초과로 못 만듦 → 기존 OhaiyoOkcheon 프로젝트 사용. 이전 스키마는 `ohaiyo_legacy`로 옮겨 보존, cron 2개·가입 트리거만 끔 (ADR-005).
- 마이그레이션 3개 적용, 예시 가게 5곳 seed. pgTAP 41개 클라우드 DB에서 전부 통과(트랜잭션 롤백, 남은 데이터 없음 확인).
- 보안 점검 반영: 로그인 안 한 방문자(anon)는 쓰기·관리자 RPC 실행 불가, 도우미 함수 search_path 고정 (`20261104000000_harden_rpc_grants.sql`).
- 실제 DB로 마을방송 화면 확인. 이웃 제보는 실패 — 프로젝트의 익명 로그인이 꺼져 있음. 대시보드에서 켜야 함. 그 전까지 앱이 원인을 안내하도록 문구 추가.
- 익명 로그인 켠 뒤 실제 DB로 확인: 제보 → 팻말 "확인 중" · 마을방송 맨 위로, 내 제보엔 나도 봤어요 숨김, 30분 안 재제보 거부. 시험 데이터(제보 1·익명 사용자 1·이벤트 6)는 삭제.
- GitHub `main`에 첫 커밋 푸시, Vercel 배포: https://test1-black-psi.vercel.app (팀 hearts2okcheon, GitHub hearts2okcheon-hello 연결, Vercel Supabase 통합은 쓰지 않음). 환경변수 3개, `NEXT_PUBLIC_DEV_EMAIL_LOGIN=false`. 홈·가게·로그인 화면 응답 200, 실제 가게 목록 표시 확인.
- 남은 설정: Supabase Auth URL 설정에 배포 주소 등록, 카카오 로그인 연결(그 전까지 배포 사이트에서는 사장님 로그인 불가).
- 클라우드 이메일 가입은 메일 인증이 켜져 있음(mailer_autoconfirm=false) → 개발용 이메일 가입은 받은 메일의 링크를 눌러야 로그인됨.
- design §3.1·§4.1·§4.3·§5.1·§6 수정(만료 시각 통일, current_sign 단일화, admin_upsert_store 추가, 알림 아이콘 제외), brd §4 표기 복구, CLAUDE.md 코딩 원칙 2줄 수정, test.md T-SIGN-12~20 · T-ADMIN-03~06 · T-FEED-06 추가
- 코드 반영: 마이그레이션에 `okc_notice_valid`·`current_sign`·`admin_upsert_store` 추가, `get_store_signs`·`get_owner_home`·`get_today_feed`·`admin_get_queue`가 `current_sign`을 쓰도록 변경, stores 직접 쓰기 정책 삭제, 관리자 가게 등록 폼을 RPC로 변경, pgTAP 24 → 41개. 실행 확인 전.

## 2026-11-03
- 한 일: 캐릭터 시트·앱 아이콘·HTML 프로토타입으로 design-system.md 작성, 프로토타입에 들어 있던 오소리 표정 13종을 `public/osori/`로 추출. MVP 1차 코드 작성 — Supabase 스키마·RLS·RPC 17개·seed·pgTAP 24개, Next.js 화면(마을방송·가게 상세·사장님·가게 인증·관리자 5탭), Vitest 3파일.
- 결정:
  - 사장님 "아니요" 답은 반대 공지를 만든다(아니요, 열었어요 → 영업 중). 프로토타입 문구를 따름. design §3.2 갱신.
  - `late_open`에 시각을 고르면 그 시각에 만료, `open`은 자정 만료로 단순화.
  - 쓰기는 전부 RPC, reports 테이블은 직접 읽기 불가(제보자 id 보호).
  - MVP 탭은 마을방송·내 가게 2개. 지도·옥천소식·광장은 확장으로.
  - 프로토타입의 "단골 손님에게도 알림이 갔어요" 문구는 쓰지 않음(푸시 없음).
  - 로컬 테스트용 개발 이메일 로그인(`NEXT_PUBLIC_DEV_EMAIL_LOGIN`) 추가.
- 막힌 것: 작성 PC에 Node가 없어 설치·빌드·테스트를 못 돌림. 코드는 실행 확인 전.
- 다음: README "처음 실행하기"대로 `npm install` → `npm run typecheck` → `npx supabase start` → `npm run test:db` → `npm test` → `npm run dev`. 에러 나면 고치고 todo `[~]` → `[x]`.
