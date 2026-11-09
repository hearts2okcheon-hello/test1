import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** 카카오 로그인에서 돌아오는 곳. 받은 코드로 세션을 만들고 원래 가려던 화면으로 보낸다 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/owner";
  // 다른 사이트로 보내지 않는다
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/owner";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${target}`);
  }
  return NextResponse.redirect(`${origin}/owner?login=failed`);
}
