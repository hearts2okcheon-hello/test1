import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseEnv } from "./env";

export function createClient() {
  const { url, key } = requireSupabaseEnv();
  return createBrowserClient(url, key);
}

/** 이웃 제보·나도 봤어요 직전에 부른다. 세션이 없으면 보이지 않는 익명 로그인 (ADR-003) */
export async function ensureSession(supabase: ReturnType<typeof createClient>) {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}

const VISITOR_KEY = "oksori.visitor";

/** 재방문율 측정용 무작위 id. 개인정보 없음 (design §7) */
export function visitorId(): string | null {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}
