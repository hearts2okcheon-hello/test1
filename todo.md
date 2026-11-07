# todo.md — Task List & Progress

> plan.md를 작업 단위로 쪼갠 체크리스트. 끝낼 때마다 체크하고, 관련 테스트 ID를 함께 적는다.
> 상태: `[ ]` 할 일 · `[~]` 코드 작성됨, 실행 확인 전 · `[x]` 완료(실행·테스트 확인)
>
> **2026-11-03 현황:** MVP 코드(DB·화면) 1차 작성 완료. 작성 환경에 Node가 없어 `npm install` · 빌드 · 테스트를 아직 한 번도 돌리지 못했다. 그래서 코드 항목은 전부 `[~]`. README "처음 실행하기"를 따라 돌려 보고 `[x]`로 바꾼다.
> **2026-11-04 현황:** Node 설치 후 typecheck·Vitest·build 통과. pgTAP(DB 테스트)과 실제 Supabase 연결은 아직 — Supabase 클라우드 프로젝트 연결 후 확인.

---

## Phase 0 — 개발 준비 (4주차)

### 현장
- [ ] 사장님 인터뷰 3~5명 (공지 의향 · 걸림돌 · 원하는 방식 · 현재 공지 방법 · 가게 코드 방식이 편한지 · 카카오톡 사용 여부)
- [ ] 인터뷰 기록 정리 → brd §3 "아직 모르는 것" 갱신
- [ ] 시범 참여 가게 약 10곳 확정 + 평소 영업시간·카테고리·주소 수집 → `supabase/seed.sql` 교체 또는 관리자 화면에서 등록
- [ ] 이웃 제보단 모집

### 셋업
- [~] Next.js 15 + TypeScript + Tailwind 4 프로젝트 파일 (package.json, tsconfig, postcss, next.config)
- [x] `npm install` → `npm run typecheck` 통과 · `npm test` 17개 통과 · `next build` 성공 (2026-11-04)
- [x] Supabase 프로젝트 `test1` (ref encttfcrxuckoqkrakoi, 서울) — 마이그레이션 3개 · 예시 가게 5곳 · pgTAP 51개 통과, `.env.local` 작성 (2026-11-05)
- [ ] **새 프로젝트에서 익명 로그인 켜기** (이웃 제보·가게 코드 연결에 필요)
- [ ] **Vercel 환경변수를 새 프로젝트 값으로 바꾸고 Redeploy** (지금 배포 사이트는 삭제된 프로젝트를 가리킴)
- [ ] 관리자 계정 만들기 (README "Supabase 설정")
- [x] Vercel 연결 + 배포 확인 — https://test1-black-psi.vercel.app (2026-11-05)
- [ ] Supabase Auth URL Configuration 에 배포 주소 등록 (Site URL · Redirect URL)
- [ ] (나중) 카카오 로그인 재검토 — ADR-002
- [x] Supabase 대시보드에서 익명 로그인 켜기 (2026-11-04, 삭제된 OhaiyoOkcheon 프로젝트 기준)
- [x] 테스트: Vitest 18개 통과 · pgTAP 41개 클라우드 DB에서 통과(롤백, 2026-11-04)

### 데이터
- [x] 마이그레이션 3개 클라우드 적용: 스키마 · RPC · 권한 강화(`20261104000000`)
- [x] RLS 정책 (쓰기는 RPC만) — 보안 점검(advisor) 반영, 로그인 안 한 방문자는 읽기 RPC만
- [x] seed: 예시 가게 5곳 클라우드에 넣음 (2026-11-07 삭제)

---

## Phase 1 — 공지 (5주차)

- [~] 만료 계산을 다음 날 00:00(Asia/Seoul)으로 통일 (T-SIGN-12~17 먼저)
- [~] current_sign(store_id) 함수 작성, 네 RPC가 이를 호출하도록 연결 (T-SIGN-18~20 먼저)
- [~] admin_upsert_store RPC 작성, stores 직접 쓰기 RLS 제거 (T-ADMIN-03~06 먼저)
- [~] 마을방송 화면에서 알림(종) 아이콘 제외 (T-FEED-06) — 처음부터 넣지 않음, 실제 화면 확인 필요
- [~] 테스트: T-SIGN-01·03·06·07, T-NOTICE-02·04·05 (pgTAP) · 문구/시각 (Vitest)
- [~] RPC `get_store_signs` · `get_store_detail` · `get_today_feed`
- [~] RPC `post_notice` · `set_notice_memo` · `undo_notice` · `end_notice`
- [~] 컴포넌트: SignChip, SignBoard, SourceLine, TimeAgo, Osori, Toast, BottomNav
- [~] 화면 `/` 마을방송 + 가게 목록 — 가짜 데이터로 375px 화면 확인함, 실제 DB 연결 전
- [~] 화면 `/stores/[id]` 가게 상세 — 가짜 데이터로 화면·제보 시트 확인함, 실제 DB 연결 전
- [x] 사장님 연결을 가게 코드로 변경 (ADR-006): `/owner` 코드 입력 화면 + RPC `redeem_store_code` — pgTAP T-AUTH 통과, 화면 확인
- [~] `/admin` 가게 코드 탭 + RPC `admin_issue_store_code` · `admin_list_store_codes` — DB 테스트 통과, 화면은 관리자 계정 생긴 뒤 확인
- [~] 화면 `/owner` 공지 버튼 5개 + 시각 선택 + 쪽지(빠른 문구·40자) + 되돌리기 토스트 + "오늘 문 여셨나요?" 카드
- [~] 빈 상태(오소리) · 에러 문구
- [x] 로딩 상태 (`app/loading.tsx`) · 에러 화면 (`app/error.tsx`, 설정 누락 안내)
- [ ] 프로토타입(1) 배포

## Phase 2 — 검증 (6주차)

- [~] 테스트: T-SIGN-04·08, T-REPORT-02·04·05·09·10·11·13 (pgTAP)
- [x] 익명 로그인 자동 생성 (제보 버튼 누를 때) — 실제 DB로 확인
- [x] RPC `post_report` (30분 중복 제한) — 실제 DB로 제보·중복 거부 확인
- [~] `get_store_signs`에 "확인 중" 규칙
- [~] 제보 바텀 시트 (마을방송 · 가게 상세 공용)
- [~] RPC `agree_report` + 나도 봤어요 버튼
- [~] RPC `answer_report` + `/owner` 확인 질문 카드(네/아니요)
- [~] RPC `admin_get_queue` + `/admin` 엇갈림·무응답 탭
- [~] `/admin` 대리 등록 탭 · 가게 관리 탭
- [ ] T-FLOW-04 수동 (폰 2대)
- [ ] 프로토타입(2) 배포

## Phase 3 — 보강 + 시범 운영 (7주차)

- [~] `late_open` 시각 만료 (T-SIGN-09) — DB 자동 테스트는 아직 없음
- [~] 제보 만료 3시간 / 줄이 길어요 1시간
- [ ] 만료 임박 흐림 (T-SIGN-11, P2)
- [ ] 지표 정의 확정(분모·측정 기간) → design §7 갱신
- [~] 지표 이벤트: page_view · store_view (클라이언트) · notice_created · report_created · confirm_answered (서버)
- [~] `/admin` 지표 탭
- [~] PWA manifest (홈 화면 바로가기)
- [ ] 360px 레이아웃 점검, 색+글자 상태 구분 점검
- [ ] P1 테스트 전부 + 엣지 케이스 체크리스트 (test.md §9)
- [ ] T-FLOW-01·02 (70대 사장님) · 03 · 05 · 06
- [ ] 프로덕션 배포 + 시범 가게 사장님 전원 인증·온보딩
- [ ] 시범 운영 약 1주일 + 공지 정확도 현장 표본 확인
- [ ] 오류 수정
- [ ] 시범 운영 결과보고서

## Phase 4 — 결과 반영·발표 (8주차)

- [ ] 시범 결과 반영 수정 + 재테스트
- [ ] 사장님 반복 공지 여부 재검증
- [ ] 참여 유도 방법(보상) 검토
- [ ] 확장 기능 진행 여부 결정 → plan.md 갱신
- [ ] 최종 발표자료

---

## 추가 — 사장님 가게 페이지 (ADR-007, 2026-11-07)

- [x] DB: 사장님 코드, 메뉴·사진·소식·공감·댓글·임시휴무, 영업 상태, 저장소 (pgTAP 95개)
- [x] 관리자: 전화번호 → 코드, 발급 목록, 게시물 관리
- [x] 사장님: 코드 입력, 가게 등록·수정, 소식 쓰기·고치기, 임시휴무 달력·사유·취소
- [x] 가게 페이지 7구역, 마을방송 반영
- [ ] 익명 로그인을 켠 뒤 실제 흐름 확인 (T-FLOW-07), 사진 올리기 포함
- [ ] 관리자 계정으로 코드 발급·게시물 화면 확인
- [x] 예시 가게 5곳 삭제, seed.sql 비움 (2026-11-07)

## 회고

> Phase가 끝날 때마다 채운다. 다음 Phase 계획과 문서(brd·design)에 반영할 것을 적는다.

### Phase 0
- 잘된 것:
- 막힌 것:
- 문서에 반영할 것:

### Phase 1
- 잘된 것:
- 막힌 것:
- 문서에 반영할 것:

### Phase 2
- 잘된 것:
- 막힌 것:
- 문서에 반영할 것:

### Phase 3 (시범 운영)
- 지표 결과:
- 사장님 반응:
- 주민 반응:
- 문서에 반영할 것:

### Phase 4
- 최종 회고:
