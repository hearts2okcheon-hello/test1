import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Supabase 세션 쿠키 갱신
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  // 설정이 없으면 건너뛰고, 화면의 에러 페이지가 안내한다
  const env = supabaseEnv();
  if (!env) return response;

  const supabase = createServerClient(
    env.url,
    env.key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|osori/|logo.webp|app-icon.jpg|manifest.webmanifest).*)"],
};
