import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { KAKAO_STATE_COOKIE, kakaoEnv, kakaoRedirectUri, safeNext } from "@/lib/kakao";
import { createClient } from "@/lib/supabase/server";

/** 카카오에서 돌아오는 곳: 코드를 ID 토큰으로 바꾸고, 그 토큰으로 Supabase 에 로그인한다 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const fail = (reason: string) => NextResponse.redirect(`${url.origin}/owner?login=${reason}`);

  const env = kakaoEnv();
  if (!env) return fail("unavailable");

  const jar = await cookies();
  const saved = jar.get(KAKAO_STATE_COOKIE)?.value;
  jar.delete({ name: KAKAO_STATE_COOKIE, path: "/auth/kakao" });
  let expected: { state?: string; next?: string } = {};
  try {
    expected = saved ? JSON.parse(saved) : {};
  } catch {
    expected = {};
  }

  // 사용자가 카카오 화면에서 취소했거나, 다른 곳에서 온 요청
  const code = url.searchParams.get("code");
  if (!code || !expected.state || url.searchParams.get("state") !== expected.state) return fail("failed");

  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: env.restKey,
      client_secret: env.secret,
      redirect_uri: kakaoRedirectUri(url.origin),
      code,
    }),
    cache: "no-store",
  }).catch(() => null);
  const token = tokenRes?.ok ? ((await tokenRes.json()) as { id_token?: string }) : null;
  if (!token?.id_token) return fail("failed");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithIdToken({ provider: "kakao", token: token.id_token });
  if (error) return fail("failed");

  return NextResponse.redirect(`${url.origin}${safeNext(expected.next)}`);
}
