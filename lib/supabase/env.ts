// .env.local 이 비어 있으면 모든 요청이 알 수 없는 에러로 죽는 대신, 무엇을 넣어야 하는지 알려 준다

export function supabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export const MISSING_ENV =
  "Supabase 설정이 없어요. .env.local 에 NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_ANON_KEY 를 넣고 서버를 다시 켜 주세요. (README 참고)";

export function requireSupabaseEnv() {
  const env = supabaseEnv();
  if (!env) throw new Error(MISSING_ENV);
  return env;
}
