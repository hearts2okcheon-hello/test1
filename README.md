# 옥!소리 — 주머니 속 마을방송

옥천 가게의 '오늘' 소식(당일 휴무·늦은 오픈·재료 소진)을 사장님이 원탭으로 알리고, 이웃이 채우고, 옥천신문이 확인하는 동네 알림 웹앱.
고려대 세종 하츠투옥천 팀 · 운영 파트너 옥천신문.

- 무엇을, 왜: [brd.md](brd.md) · [cps.md](cps.md)
- 어떻게: [design.md](design.md) · [design-system.md](design-system.md)
- 언제: [plan.md](plan.md) · [todo.md](todo.md)
- 개발 규칙: [CLAUDE.md](CLAUDE.md)

## 처음 실행하기

필요한 것: Node.js 20 이상, Docker Desktop(로컬 Supabase용).

```bash
npm install
cp .env.example .env.local
npx supabase start
```

`supabase start`가 끝나면 출력되는 `API URL`과 `anon key`를 `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 넣는다. 마이그레이션과 예시 가게 5곳(seed)이 자동으로 들어간다.

```bash
npm run typecheck
npm run test:db
npm test
npm run dev
```

http://localhost:3000 에서 마을방송이 보이면 성공. DB를 처음 상태로 돌리려면 `npx supabase db reset`.

## 화면

| 경로 | 누가 | 무엇 |
|---|---|---|
| `/` | 주민 | 오늘의 마을방송, 가게 팻말, 이웃 제보 |
| `/stores/[id]` | 주민 | 큰 팻말, 쪽지, 제보 목록, 나도 봤어요 |
| `/owner` | 사장님 | 공지 버튼 5개, 쪽지, 확인 질문 |
| `/owner/claim` | 사장님 | 내 가게 인증 요청 |
| `/admin` | 옥천신문 | 엇갈림·무응답, 대리 등록, 가게 인증, 가게 관리, 지표 |

## 사장님으로 테스트하기 (카카오 없이)

`.env.local`에 `NEXT_PUBLIC_DEV_EMAIL_LOGIN=true`면 `/owner/login`에 개발용 이메일 로그인이 보인다. 가입 → 내 가게 찾기 → 인증 요청 후, 관리자 화면에서 승인하면 공지 버튼이 열린다. **프로덕션에서는 이 값을 끈다.**

## 관리자 만들기

1. Supabase Studio(로컬은 http://127.0.0.1:54323) → Authentication → Add user 로 이메일·비밀번호 계정을 만든다.
2. SQL Editor에서:

```sql
insert into profiles (id, role)
select id, 'admin' from auth.users where email = '관리자@이메일'
on conflict (id) do update set role = 'admin';
```

3. `/admin/login`으로 로그인.

## 카카오 로그인 켜기

1. [Kakao Developers](https://developers.kakao.com)에서 앱을 만들고 카카오 로그인을 활성화한다. Redirect URI는 `https://<프로젝트>.supabase.co/auth/v1/callback` (로컬: `http://127.0.0.1:54321/auth/v1/callback`).
2. 로컬: `.env.local`에 `SUPABASE_AUTH_EXTERNAL_KAKAO_CLIENT_ID`·`SECRET`을 넣고 `supabase/config.toml`의 `[auth.external.kakao] enabled = true`, `npx supabase stop && npx supabase start`.
3. 클라우드: Supabase 대시보드 → Authentication → Providers → Kakao에 키 입력. **Anonymous sign-ins도 켠다**(이웃 제보용).

## 배포 (Vercel + Supabase)

```bash
npx supabase link --project-ref <프로젝트 ref>
npx supabase db push
```

Vercel에 저장소를 연결하고 환경변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 넣는다. Supabase Auth의 Site URL과 Redirect URL에 Vercel 주소(`/auth/callback`)를 추가한다.
