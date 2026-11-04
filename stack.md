# stack.md — Tech Stack Reference

> 고정 스택. 여기 없는 라이브러리를 추가하려면 먼저 묻고 adr.md에 남긴다.

## 런타임·프레임워크

| 항목 | 버전/값 | 비고 |
|---|---|---|
| Node.js | 20 LTS 이상 | Vercel 기본과 맞춤 |
| Next.js | 15.x (App Router) | Server Components 기본, 상호작용 부분만 `"use client"` |
| React | 19 | Next 15 동봉 |
| TypeScript | 5.x, `strict: true` | |
| Tailwind CSS | 4.x (`@tailwindcss/postcss`) | 설정 파일 없음. 디자인 토큰은 `app/globals.css`의 `@theme` |
| 글꼴 | `next/font/google` — Jua(디스플레이), Noto Sans KR(본문) | design-system.md §3 |

## 백엔드

| 항목 | 값 | 비고 |
|---|---|---|
| Supabase | Postgres + Auth + RLS | 무료 티어 |
| `@supabase/supabase-js` | 2.x | |
| `@supabase/ssr` | 최신 | App Router 쿠키 세션 |
| Auth | Kakao OAuth (사장님) · Anonymous (이웃 제보) · Email (옥천신문 관리자) | ADR-002, ADR-003 |
| 시간대 | DB 함수에서 `Asia/Seoul` | ADR-004 |

## 배포

| 항목 | 값 |
|---|---|
| 호스팅 | Vercel (main → 프로덕션, PR → 프리뷰) |
| 환경변수 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (클라이언트) · `SUPABASE_SERVICE_ROLE_KEY` (서버 전용, seed·관리 스크립트에서만) |

## 테스트

| 항목 | 용도 |
|---|---|
| Vitest | `tests/*.test.ts` — 문구·시각 유틸 (`npm test`, TZ=UTC 로 실행해 서울 변환 확인) |
| pgTAP + Supabase CLI 로컬 스택 | `supabase/tests/*.sql` — 팻말 규칙·RPC (`npm run test:db`) |
| Playwright `(가정)` | 유저플로우 일부 자동화, 여유 있으면 |

## 폴더 구조

```
app/
  page.tsx, HomeReport.tsx # / 오늘의 마을방송
  stores/[id]/             # 가게 상세 (page + StoreClient)
  owner/                   # 사장님: page + OwnerPanel, login, claim
  admin/                   # 옥천신문: page + AdminPanels, login
  auth/callback/route.ts   # 카카오 로그인 콜백
components/                # SignChip, SignBoard, StoreCard, NoticeButtons, ConfirmCard, ReportSheet, Toast, Osori ...
lib/
  supabase/                # client.ts(+익명 세션), server.ts
  signs.ts                 # 팻말 코드 → 문구·색·표정 (규칙 계산은 하지 않음)
  time.ts                  # 서울 시각 표시
  errors.ts                # RPC 에러 코드 → 문구
  types.ts                 # RPC 응답 타입
middleware.ts              # Supabase 세션 갱신
public/osori/              # 오소리 표정 13종 (프로토타입에서 추출)
supabase/
  migrations/              # 스키마·RLS / RPC
  seed.sql                 # 예시 가게
  tests/                   # pgTAP
tests/                     # Vitest
```

## 자주 쓰는 명령어

```bash
npm run dev                         # 로컬 개발 서버
npm run build                       # 프로덕션 빌드 확인
npm test                            # Vitest
npx supabase start                  # 로컬 Supabase
npx supabase migration new <name>   # 마이그레이션 생성
npx supabase db reset               # 로컬 DB 초기화 + seed
npx supabase gen types typescript --local > lib/supabase/types.ts
```
