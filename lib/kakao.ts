// 카카오 로그인 (ADR-009). 서버에서만 쓴다: Client Secret 이 들어 있다.
// Supabase 의 카카오 연결은 이메일을 항상 요청해서, 이메일 권한이 없는 앱은 KOE205 로 막힌다.
// 그래서 우리 서버가 카카오에 닉네임만 요청하고, 받은 ID 토큰을 Supabase 에 넘겨 로그인한다.

export const KAKAO_STATE_COOKIE = "ok_kakao_state";
export const KAKAO_SCOPE = "openid profile_nickname";

export function kakaoEnv(): { restKey: string; secret: string } | null {
  const restKey = process.env.KAKAO_REST_API_KEY;
  const secret = process.env.KAKAO_CLIENT_SECRET;
  return restKey && secret ? { restKey, secret } : null;
}

/** 로그인 뒤 돌아갈 곳. 우리 사이트 안의 경로만 허용한다 */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/owner";
}

export function kakaoRedirectUri(origin: string): string {
  return `${origin}/auth/kakao/callback`;
}

export function kakaoAuthorizeUrl(restKey: string, origin: string, state: string): string {
  const u = new URL("https://kauth.kakao.com/oauth/authorize");
  u.searchParams.set("client_id", restKey);
  u.searchParams.set("redirect_uri", kakaoRedirectUri(origin));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", KAKAO_SCOPE);
  u.searchParams.set("state", state);
  return u.toString();
}
