# design.md — Application Design

> cps.md의 솔루션을 시스템으로 옮긴 문서. 스택 · 데이터 모델 · 상태 규칙 · UI/UX · API.
> 상태 표시 규칙(§3)이 이 앱의 심장이다. 화면·API·테스트는 전부 이 규칙을 따른다.

---

## 1. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Next.js 15 (App Router) + TypeScript | 팀 기존 스택, Vercel 배포 일체화 |
| 스타일 | Tailwind CSS | 큰 버튼·고대비 UI를 빠르게 |
| DB·인증 | Supabase (Postgres + Auth + RLS) | 무료 티어, RLS로 권한 규칙을 DB에 둠 |
| 배포 | Vercel | 프리뷰 배포로 시범 운영 전 점검 |
| 시간대 | `Asia/Seoul` 고정 | "오늘"의 경계가 기능의 핵심 |

상세 버전·명령어는 stack.md. 결정 이유는 adr.md.

---

## 2. 사용자와 권한

| 역할 | 인증 | 할 수 있는 것 |
|---|---|---|
| 주민(열람) | 없음 | 마을방송·가게 팻말 보기 |
| 이웃(제보) | Supabase 익명 로그인 (화면엔 안 보임) | 제보 4종, 나도 봤어요 |
| 사장님 | **사장님 코드** (전화번호당 1개, 옥천신문 발급) → 그 기기의 익명 세션이 연결됨 | 가게 등록·수정, 소식·공지, 임시휴무, 공지 5종·쪽지, 확인 질문 네/아니요, 자기 가게 댓글 삭제 |
| 옥천신문(관리자) | 이메일 로그인, `role = admin` | 확인 표시, 대리 등록, 사장님 코드 발급, 가게 등록, 게시물 관리 |

- 이웃 제보의 신원은 어디에도 노출하지 않는다. 익명 세션 id는 중복 제보·도배 방지에만 쓴다.
- 사장님 연결 방식은 adr.md ADR-006. 옥천신문이 전화·방문으로 사장님임을 확인한 뒤 코드를 불러 드리고, 사장님은 "내 가게" 탭에 한 번 넣는다. 가족 휴대폰도 같은 코드로 연결할 수 있고, 10분 안에 5번 틀리면 잠시 막힌다. 카카오 로그인은 나중에 다시 검토한다.

---

## 3. 상태 표시 규칙 (핵심)

### 3.1 공지 종류 (사장님·옥천신문 대리)
| 코드 | 버튼 문구 | 팻말 | 유효기간 |
|---|---|---|---|
| `open` | 영업 중이에요 | 영업 중 | 당일 자정 (MVP 단순화 — 평소 마감 시각 반영은 시범 후 검토) |
| `closed_today` | 오늘 쉬어요 | 오늘 휴무 | 당일 자정 |
| `late_open` | 늦게 열어요 | 늦게 열어요 (○시 오픈) | 시각을 골랐으면 그 시각에 만료(→ 소식 없음), 안 골랐으면 당일 자정 |
| `sold_out` | 재료 소진 | 재료 소진 | 당일 자정 |
| `early_close` | 일찍 닫아요 | 일찍 닫아요 (○시 마감) | 당일 자정 |

"당일 자정"은 다음 날 00:00(Asia/Seoul)을 뜻한다. `expires_at`은 이 값으로 저장하고, 23:59:59에는 유효, 00:00:00에는 만료로 판단한다.

`late_open` · `early_close`는 누르는 즉시 방송되고, 그 뒤에 "몇 시에 여세요/닫으세요?" 30분 단위 버튼이 뜬다(선택, 고르면 같은 공지를 시각과 함께 다시 방송). 쪽지는 최대 40자, 빠른 문구 3개 + 직접 쓰기, 선택.

### 3.2 제보 종류 (이웃)
| 코드 | 버튼 문구 | 확인 질문 (사장님에게) | 유효기간 |
|---|---|---|---|
| `seen_closed` | 문 닫혀 있었어요 | 오늘 문 닫았나요? | 3시간 `(가정)` |
| `seen_open` | 열려 있었어요 | 지금 열려 있나요? | 3시간 `(가정)` |
| `seen_sold_out` | 재료 다 떨어졌대요 | 재료 다 떨어졌나요? | 3시간 `(가정)` |
| `seen_long_line` | 줄이 길어요 | (질문 없음 — 확인 불필요) | 1시간 `(가정)` |

- 사장님이 **"네"** → 대응 공지가 출처 `owner`로 생성되고 제보는 `confirmed`.
  (`seen_closed`→`closed_today`, `seen_open`→`open`, `seen_sold_out`→`sold_out`)
- 사장님이 **"아니요"** → 제보는 `rejected`, 반대 공지가 출처 `owner`로 생성된다(프로토타입 문구를 따름).
  (`seen_closed`→"아니요, 열었어요"→`open`, `seen_open`→"아니요, 쉬어요"→`closed_today`, `seen_sold_out`→"아니요, 있어요"→`open`)
- 옥천신문이 확인 → 위와 같고 출처는 `okcheon`.
- `seen_long_line`은 상태가 아니라서 팻말을 바꾸지 않는다(상세의 제보 목록에만 1시간 보임).
- 아무도 답하지 않으면 유효기간 후 `expired`.

### 3.3 가게의 '지금' 팻말 결정 순서
가게마다 아래 순서로 **첫 번째로 해당하는 것** 하나를 팻말로 쓴다.

1. 유효한 공지 중 가장 최근 것 (출처 `owner` 또는 `okcheon`) → 해당 팻말 + 출처 배지 + 알린 시각
2. 유효한 `pending` 제보가 있으면 → **"확인 중"** + 제보 내용 + "이웃 제보" 배지 + 제보 시각 + 나도 봤어요 수
3. 둘 다 없으면 → **"소식 없음"** + 평소 영업시간 (있으면)

- **절대 규칙:** 3번에서 평소 영업시간 안이라도 팻말을 "영업 중"으로 표시하지 않는다. 영업시간으로 계산한 영업 상태는 팻말과 별개로 `okc_schedule_status`가 내고 "등록한 영업시간 기준" 문구와 함께 보여 준다 (ADR-007).
- **임시휴무:** 오늘이 기간 안이면 팻말은 `temp_closed`. 임시휴무보다 나중에 올린 유효 공지가 있으면 그 공지가 우선한다.
- 공지가 있어도 그 이후 들어온 `pending` 제보는 상세 화면에 "이웃 제보 (확인 중)"로 따로 보인다(팻말은 공지가 우선). 공지와 제보가 엇갈리면 관리자 화면의 "엇갈림" 목록에 뜬다.
- 만료가 임박한 정보(남은 시간 < 1시간)는 흐리게 표시 `(가정)`.

### 3.4 출처 배지
| 배지 | 조건 |
|---|---|
| 사장님 | 공지 `source = owner` (직접 공지 또는 제보에 "네") |
| 옥천신문 확인 | 공지 `source = okcheon` (대리 등록 또는 확인) |
| 이웃 제보 | `pending` 제보 |

배지 옆에는 항상 상대 시각("12분 전 알림", "오전 9:40 확인")을 쓴다.

---

## 4. 데이터 모델 (Supabase / Postgres)

```sql
-- 역할
create type user_role as enum ('owner', 'admin');
create type notice_kind as enum ('open', 'closed_today', 'late_open', 'sold_out', 'early_close', 'out'); -- out = 외출 중 (ADR-014)
create type notice_source as enum ('owner', 'okcheon');
create type report_kind as enum ('seen_closed', 'seen_open', 'seen_sold_out', 'seen_long_line');
create type report_status as enum ('pending', 'confirmed', 'rejected', 'expired');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role user_role not null,
  display_name text,
  phone text,                       -- 옥천신문이 연락용으로만 사용
  created_at timestamptz default now()
);

create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,                    -- 식당·카페·약국·의원 등
  address text,
  regular_hours jsonb,              -- { "mon": [["11:00","21:00"]], "sun": null, ... }
  is_pilot boolean default true,    -- 시범 참여 가게
  created_at timestamptz default now()
);

-- store_codes 는 ADR-007에서 owner_codes 로 대체됨. 추가 표는 §4 끝 참고
create table store_codes (           -- (삭제됨) 가게 코드 (ADR-006)
  store_id uuid primary key references stores(id),
  code text unique not null,        -- 숫자 6자리
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table store_members (         -- 코드를 넣은 기기 = 사장님. 한 가게에 여러 기기 가능
  store_id uuid references stores(id),
  user_id uuid references profiles(id),
  created_at timestamptz default now(),
  primary key (store_id, user_id)
);

create table code_attempts (         -- 틀린 코드 연속 입력 제한용
  id bigserial primary key,
  user_id uuid not null,
  ok boolean not null,
  created_at timestamptz default now()
);

create table notices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) not null,
  kind notice_kind not null,
  at_time time,                     -- late_open의 오픈 시각 / early_close의 마감 시각
  memo text check (char_length(memo) <= 40),
  source notice_source not null,
  created_by uuid references profiles(id) not null,
  from_report_id uuid,              -- 제보 확인으로 생긴 공지면 연결
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  ended_at timestamptz              -- 사장님이 수동 종료 / 새 공지로 대체
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) not null,
  kind report_kind not null,
  reporter_id uuid not null,        -- 익명 auth uid. 화면 노출 금지
  status report_status default 'pending',
  resolved_by uuid references profiles(id),
  resolved_source notice_source,
  resolved_at timestamptz,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

create table report_agrees (          -- 나도 봤어요
  report_id uuid references reports(id) on delete cascade,
  user_id uuid not null,            -- 익명 auth uid
  created_at timestamptz default now(),
  primary key (report_id, user_id)
);

create table events (                -- 시범 지표 측정용
  id bigserial primary key,
  name text not null,               -- page_view, notice_created, report_created, confirm_answered ...
  store_id uuid,
  anon_id uuid,
  props jsonb,
  created_at timestamptz default now()
);
```

### 4.0 가게 페이지 표 (ADR-007, `20261107000000_store_profile.sql`)

`stores`에 `neighborhood`·`phone`(공개)·`intro` 추가. `owner_codes`(phone·code·store_id 각각 unique), `owner_code_members`, `store_menus`, `store_photos`(store/food/daily), `store_posts`(news/notice, 소프트 삭제), `post_likes`, `store_comments`(소프트 삭제), `temp_closures`(취소는 `canceled_at`). 버킷 `store-media`.

### 4.0-1 내 정보·가게 번호·캘린더 (ADR-014, `20261113010000_my_info_calendar.sql`)

- `profiles`: `display_name`(이름)·`area`(사는 곳)·`phone`·`avatar_url`·`registered_at`·`store_notice_ack_at`. 쓰기는 `save_my_profile`, `ack_store_notice`. 본인과 관리자만 읽는다.
- `stores.store_phone`(가게 번호, 선택)·`store_phone_public`. 표 직접 읽기 권한이 없고 `get_store_detail`의 `profile.store_phone`(공개한 것)·`manage_store_phone`(관리자·사장님)으로만 준다.
- `store_day_plans(store_id, day, kind, start_time, end_time, note)`: kind 는 `late_open`·`early_close`·`out`, 가게·날짜·종류마다 하나. 쓰기는 `set_day_plan`(오늘~한 달, `closed`는 하루짜리 `temp_closures`로 넣는다)·`clear_day_plan`. 읽기는 `get_store_detail`의 `plans`.
- `okc_schedule_status`는 외출 중 공지와 오늘의 일정(늦게 열기·일찍 닫기·외출)을 반영한다.
- `stores.logo_url`(가게 프로필 사진, 쓰기는 `set_store_logo`). `get_store_signs`가 `logo_url`과 `card_photos`(갤러리 사진 먼저, 그다음 메뉴 사진, 4장까지)를 함께 준다 (`20261113030000_store_logo_card_photos.sql`).

### 4.1 파생 뷰
- `current_sign(store_id)` — §3.3 규칙으로 가게의 현재 팻말 1행을 계산하는 DB 함수. 규칙은 이 함수에만 구현한다. `get_store_signs()`, `get_store_detail()`, `get_owner_home()`, `get_today_feed()`는 이 함수를 호출해서 쓰고, 화면은 이 RPC들의 결과만 읽는다. **규칙을 화면 코드나 다른 RPC에 중복 구현하지 않는다.**
- `admin_get_queue()` RPC — 유효한 공지와 다른 `pending` 제보가 공존하는 가게(엇갈림), 또는 공지 없이 30분 넘게 사장님 답이 없는 제보(무응답).
- 실제 스키마는 `supabase/migrations/20261103000000_schema.sql`. 위 SQL에 더해 `notices.replaced_by`(되돌리기 복원용)가 있다.

### 4.2 무결성 규칙
- 같은 가게에 유효한 공지가 동시에 여러 개면 가장 최근 것만 유효 — 새 공지 생성 시 기존 유효 공지의 `ended_at`을 채운다(트랜잭션/RPC).
- 같은 익명 사용자는 같은 가게에 30분 안에 제보 1건만 `(가정)`.
- 자기 제보에 나도 봤어요 불가.
- 만료는 조회 시 `expires_at > now()`로 판단(크론 없이). `expired` 상태 갱신은 하루 1회 정리로 충분.

### 4.3 RLS 요약
**쓰기는 전부 §6의 RPC(security definer)로만 한다.** 테이블 정책은 읽기 위주로 최소화했다.

| 테이블 | 직접 select | 직접 쓰기 |
|---|---|---|
| stores | 모두 | 없음 (`admin_upsert_store` RPC) |
| notices | 모두 | 없음 (RPC) |
| reports | **없음** — `reporter_id` 비노출, RPC로만 읽음 | 없음 (RPC) |
| report_agrees | 없음 (RPC 집계) | 없음 (RPC) |
| owner_codes · owner_code_members · store_members · code_attempts · store_menus · store_photos · store_posts · post_likes · store_comments · temp_closures | 없음 (RPC) | 없음 (RPC) |
| profiles | 본인, admin | 없음 (RPC) |
| events | 없음 | 없음 (`log_event`는 page_view·store_view만) |

---

## 5. UI/UX

색·글꼴·형태·오소리 표정 쓰임은 **design-system.md**. 시안 원본은 `옥!소리 프로토타입.html`(클릭형 프로토타입).

### 5.1 원칙
- 모바일 세로 화면 기준(360px~). 데스크톱은 가운데 정렬 모바일 폭.
- **사장님 화면:** 버튼 최소 높이 64px, 본문 18px 이상, 한 화면 한 가지 일. 확인 단계 없이 누르면 방송되고 **"되돌리기"** 5초 토스트.
- **주민 화면:** 팻말 색 + 글자로 상태 표현(색만으로 구분 금지).
- 팻말 색: 프로토타입 값 확정 (design-system.md §2). 상태마다 오소리 표정이 함께 바뀐다.
- 하단 탭은 MVP에서 **마을방송 · 내 가게** 두 개. 프로토타입의 동네지도·옥천소식·광장 소식은 확장 단계(brd §7).
- 사장님 화면: 평소 여는 시간이 지났는데 오늘 소식이 없으면 "사장님, 오늘 문 여셨나요? [네, 열었어요] [오늘 쉬어요]" 카드를 먼저 보여준다(프로토타입 반영, 앱을 열었을 때만 — 푸시 아님).
- 프로토타입의 알림(종) 아이콘은 MVP에서 뺀다. 푸시 알림이 없으므로(brd §7) 누르면 아무 일도 없는 아이콘을 두지 않는다.

### 5.2 화면 목록
| 경로 | 화면 | 사용자 |
|---|---|---|
| `/` | 오늘의 마을방송 — 상단: 오늘 소식 피드(최신순), 하단: 가게 목록 + 팻말, 카테고리 필터 | 주민 |
| `/stores/[id]` | 가게 상세 — 큰 팻말, 출처 배지·시각, 쪽지, 평소 영업시간, 확인 중 제보 + 나도 봤어요, 제보 버튼 4개 | 주민·이웃 |
| `/owner` | 사장님 홈 — 내 가게 현재 팻말, 공지 버튼 5개, 쪽지 입력, **확인 질문 카드(네/아니요)** 상단 고정 | 사장님 |
| `/owner` (연결 전) | 사장님 코드 입력(글자 버튼 + 숫자 5자리) | 사장님 |
| `/owner/register` | 처음 가게 등록 (7구역) | 사장님 |
| `/owner/edit` · `/owner/news` · `/owner/closure` | 가게 수정 · 소식·공지 쓰기·고치기 · 임시휴무(달력 → 사유) | 사장님 |
| `/admin` | 옥천신문 — 탭: 사장님 코드 / 게시물 / 엇갈림·무응답 / 대리 등록 / 가게 관리 / 지표 | 관리자 |

### 5.3 핵심 플로우
**사장님 공지 (목표: 앱 열고 2탭)**
`/owner` → [오늘 쉬어요] → 방송됨 토스트(되돌리기) → (선택) 쪽지 입력

**이웃 제보 → 사장님 확인**
주민 `/stores/[id]` → [문 닫혀 있었어요] → "고마워요! 사장님께 물어볼게요" → 팻말 "확인 중"
→ 사장님 `/owner` 상단 카드 "이웃이 '문 닫혀 있었어요'라고 알려줬어요. 오늘 문 닫았나요? [네] [아니요]"
→ [네] → 팻말 "오늘 휴무 · 사장님 · 방금"

**옥천신문 대리 등록**
사장님 전화 → `/admin` 대리 등록 → 가게 선택 → 공지 버튼 → 출처 "옥천신문 확인"

### 5.4 사장님에게 확인 질문이 닿는 방법
MVP에 푸시 알림은 없다(brd 범위 밖). 그래서:
1. 사장님이 `/owner`를 열면 상단에 질문 카드가 보인다.
2. 30분 넘게 답이 없으면 `/admin` 무응답 목록에 올라가고, 옥천신문이 필요 시 전화로 확인한다.
3. 홈 화면 바로가기(PWA manifest) 추가를 사장님 온보딩 때 도와드린다.

---

## 6. API

데이터 읽기는 Supabase 클라이언트 + RLS로 직접, **상태가 바뀌는 쓰기는 Postgres RPC 함수**로 한 곳에 모은다(규칙 중복 방지).

| RPC | 호출자 | 하는 일 |
|---|---|---|
| `get_store_signs(category?)` | 모두 | 가게별 현재 팻말 목록 (§3.3) |
| `get_store_detail(store_id)` | 모두 | 팻말 + 오늘 제보 목록(동의 수, 내가 동의했는지, 내 제보인지) |
| `get_today_feed(limit)` | 모두 | 오늘 생긴 공지 최신순 (지금 유효한지 표시) |
| `get_owner_home()` | 사장님 | 인증 상태 / 내 가게 팻말 + 현재 공지 + 확인 질문 목록 |
| `post_notice(store_id, kind, at_time?, memo?)` | owner(자기 가게), admin | 기존 유효 공지 종료 + 새 공지 생성 + 만료 시각 계산. 사장님이 아니고 admin이면 source=okcheon |
| `set_notice_memo(notice_id, memo)` | owner, admin | 현재 공지에 쪽지 붙이기/바꾸기 |
| `undo_notice(notice_id)` | 작성자 | 생성 후 5분 이내만 삭제, 밀려난 이전 공지 복원 |
| `end_notice(notice_id)` | owner, admin | 수동 종료 |
| `post_report(store_id, kind)` | 익명 포함 로그인 | 30분 중복 제한 확인 후 제보 생성 |
| `agree_report(report_id, on?)` | 익명 포함 로그인 | 나도 봤어요 켜기/끄기(본인 제보 불가), 동의 수 반환 |
| `answer_report(report_id, yes)` | 해당 가게 owner, admin | §3.2 규칙으로 공지 생성 + confirmed/rejected. 호출자에 따라 source owner/okcheon |
| `redeem_store_code(code)` | 익명 포함 로그인 | 사장님 코드 확인 → 이 기기를 연결. 가게가 없으면 `needs_store`. 틀리면 `{ok:false, error}` (10분 5회 제한) |
| `admin_issue_code(phone, store_id?)` | admin | 번호의 코드 조회·없으면 발급. 같은 번호 = 같은 코드 |
| `admin_reissue_code(phone)` | admin | 새 코드로 교체하고 연결된 기기 모두 끊기 |
| `register_store(...)` · `update_store_profile(...)` · `save_store_media(store, menus, photos)` | 사장님 | 가게 등록·수정·메뉴와 사진 저장 |
| `save_store_post(store, body, kind?, image?, post?)` · `delete_store_post(post)` | 사장님·admin | 소식·공지 쓰기·고치기·지우기 |
| `toggle_post_like(post, on?)` · `post_store_comment(store, body)` · `delete_store_comment(comment)` | 익명 포함 로그인 | 공감·댓글. 삭제는 쓴 사람·사장님·admin |
| `set_temp_closure(store, start, end, reason?)` · `cancel_temp_closure(id)` | 사장님·admin | 임시휴무 잡기·취소 |
| `admin_list_content()` | admin | 소식·댓글 최근 50개 |
| `admin_upsert_store(store_id?, name, category?, address?, regular_hours?, is_pilot?)` | admin | 가게 등록·수정 (store_id가 없으면 새로 등록) |
| `admin_get_queue()` | admin | 엇갈림·무응답 제보 |
| `admin_list_owner_codes()` | admin | 번호·코드·가게·연결된 기기 수 |
| `admin_metrics(from, to)` | admin | §7 지표 |
| `log_event(name, anon_id?, store_id?)` | 모두 | page_view·store_view만 (나머지 이벤트는 RPC 안에서 서버가 기록) |

- 모든 RPC는 `security definer` + 함수 안에서 권한 확인. 시간 계산은 DB에서 `now() at time zone 'Asia/Seoul'`.
- 에러 코드: `NOT_AUTHENTICATED`, `NOT_OWNER`, `NOT_ADMIN`, `NOT_FOUND`, `DUPLICATE_REPORT`, `OWN_REPORT`, `ALREADY_RESOLVED`, `UNDO_WINDOW_PASSED`, `UNDO_NOT_ALLOWED`, `INVALID_TIME`, `MEMO_TOO_LONG`, `NO_QUESTION`, `INVALID_CODE`, `TOO_MANY_ATTEMPTS` → 문구는 `lib/errors.ts`.
- 구현: `supabase/migrations/20261103000100_functions.sql`.

---

## 7. 지표 수집 (시범 운영)

| 지표 | 정의 `(가정 — 7주차 확정)` | 이벤트 |
|---|---|---|
| 공지 등록률 | 시범 기간 중 직접 공지를 1회 이상 올린 가게 수 ÷ 인증된 시범 가게 수 (+ 가게당 공지 일수) | `notice_created` (source=owner) |
| 확인 요청 응답률 | 사장님이 답한 확인 질문 ÷ 확인 질문이 생긴 제보 수 | `confirm_answered` |
| 주민 재방문율 | 시범 기간 중 2일 이상 방문한 익명 방문자 ÷ 전체 익명 방문자 | `page_view` (anon_id) |
| 공지 정확도 | 표본 현장 확인에서 앱 팻말과 실제 상태가 일치한 비율 | 수기 기록 → admin 입력 |

- 열람만 하는 주민은 로그인하지 않으므로 `page_view`의 `anon_id`는 브라우저 `localStorage`에 저장한 무작위 UUID를 쓴다. 제보 시 생기는 익명 auth uid와는 별개이며, 개인을 식별하는 값은 담지 않는다.
