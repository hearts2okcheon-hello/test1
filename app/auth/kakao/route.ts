import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { KAKAO_STATE_COOKIE, kakaoAuthorizeUrl, kakaoEnv, safeNext } from "@/lib/kakao";

/** "카카오로 시작하기" → 카카오 로그인 화면으로 보낸다 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const env = kakaoEnv();
  if (!env) return NextResponse.redirect(`${url.origin}/owner?login=unavailable`);

  const state = crypto.randomUUID();
  const next = safeNext(url.searchParams.get("next"));
  (await cookies()).set(KAKAO_STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/auth/kakao",
    maxAge: 600,
  });
  return NextResponse.redirect(kakaoAuthorizeUrl(env.restKey, url.origin, state));
}
