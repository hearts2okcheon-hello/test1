# 옥!소리 — 주머니 속 마을방송

옥천 가게의 '오늘' 소식(당일 휴무·늦은 오픈·재료 소진)을 사장님이 원탭으로 알리고, 이웃이 채우고, 옥천신문이 확인하는 동네 알림 웹앱.
고려대 세종 하츠투옥천 팀 · 운영 파트너 옥천신문.

- 무엇을, 왜: [brd.md](brd.md) · [cps.md](cps.md)
- 어떻게: [design.md](design.md) · [design-system.md](design-system.md)
- 언제: [plan.md](plan.md) · [todo.md](todo.md)
- 개발 규칙: [CLAUDE.md](CLAUDE.md)

**배포 주소:** https://test1-black-psi.vercel.app (Vercel 팀 hearts2okcheon, `main`에 올리면 자동 재배포)
**DB:** Supabase 프로젝트 `test1` (ref `encttfcrxuckoqkrakoi`, 서울, 조직 "Welcome, hearts2okcheon")

## 처음 실행하기

필요한 것: Node.js 20 이상.

```bash
npm install
cp .env.example .env.local
```

`.env.local`에 Supabase 대시보드 → Project Settings → API의 URL과 publishable 키를 넣는다.

```bash
npm run typecheck
npm test
npm run dev
```

http://localhost:3000 에서 마을방송이 보이면 성공.

- **DB 테스트(pgTAP):** Docker가 있으면 `npx supabase start` 후 `npm run test:db`. 없으면 `supabase/tests/signs_test.sql`을 Supabase SQL Editor에서 실행한다(파일이 `begin … rollback`이라 데이터가 남지 않는다).
- **DB 구조 바꾸기:** `supabase/migrations/`에 파일을 추가하고 `npx supabase link --project-ref encttfcrxuckoqkrakoi` → `npx supabase db push`.

## 화면

| 경로 | 누가 | 무엇 |
|---|---|---|
| `/` | 주민 | 오늘의 마을방송, 가게 팻말, 이웃 제보 |
| `/stores/[id]` | 주민 | 큰 팻말, 쪽지, 제보 목록, 나도 봤어요 |
| `/owner` | 사장님 | 처음엔 사장님 코드 입력 → 가게 등록 → 소식·임시휴무·가게 수정, 공지 버튼 5개, 쪽지, 확인 질문 |
| `/admin` | 옥천신문 | 사장님 코드, 게시물, 엇갈림·무응답, 대리 등록, 가게 관리, 지표 |

## Supabase 설정 (대시보드에서 한 번)

1. **익명 로그인 켜기:** Authentication → Sign In / Providers → **Allow anonymous sign-ins** 켜고 Save. 이웃 제보와 사장님 코드 연결이 모두 이걸로 동작한다.
2. **관리자 만들기:** Authentication → Users → Add user로 이메일·비밀번호 계정을 만들고, SQL Editor에서:

```sql
insert into profiles (id, role)
select id, 'admin' from auth.users where email = '관리자@이메일'
on conflict (id) do update set role = 'admin';
```

3. `/admin/login`으로 로그인.

## 사장님 연결하기 (사장님 코드, ADR-007)

1. 옥천신문이 `/admin` → **사장님 코드** 탭에 사장님 전화번호를 넣고 **코드 보기**를 누른다. 번호 하나에 코드 하나이고, 다시 넣으면 같은 코드가 나온다.
2. 사장님이 맞는지 확인한 뒤 코드(예: 타-00000)를 불러 드린다.
3. 사장님이 "내 가게" 탭에서 첫 글자를 고르고 숫자 5자리를 넣으면 가게 등록 화면으로 간다. 등록하면 마을방송에 나온다.
4. 그 뒤에는 코드를 넣은 휴대폰에서 소식·임시휴무·가게 수정을 할 수 있다. 코드가 샜거나 휴대폰을 잃어버리면 **새 코드로**를 누른다. 연결된 기기가 모두 끊어진다.

## 배포 (Vercel)

Vercel 프로젝트 환경변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 `.env.local`과 같은 값을 넣고 Redeploy 한다.
