import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 카카오 로그인 후 돌아오는 곳
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/owner";
  // 같은 사이트 안 경로만 허용
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/owner";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/owner/login`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
