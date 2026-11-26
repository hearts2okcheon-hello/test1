// 로그아웃 (ADR-027): 누르면 먼저 묻고, 처리가 늦어질 때만 스피너를 보이고, 끝나면 비로그인 홈으로 간다.
// 실패하면 알리고 다시 시도하게 한다. 로그아웃한 뒤에는 로그인했을 때 그린 화면이 남아 있지 않게 한다

/** 확인 창과 버튼의 글 */
export const SIGN_OUT_COPY = {
  title: "로그아웃 하시겠어요?",
  detail: "다시 이용하려면 로그인해야 해요.",
  cancel: "취소",
  confirm: "로그아웃",
  working: "로그아웃 중",
  failed: "로그아웃하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.",
  retry: "다시 시도",
} as const;

/** 로그아웃이 끝나면 가는 곳: 비로그인 상태의 홈 */
export const AFTER_SIGN_OUT = "/";
/** 이만큼 안에 끝나면 로딩 표시 없이 넘어가고, 더 걸릴 때만 스피너를 보인다 */
export const SPINNER_AFTER_MS = 400;
/** 답이 오지 않으면 이만큼 기다린 뒤 실패로 본다 (끝없이 돌지 않게) */
export const SIGN_OUT_TIMEOUT_MS = 10_000;

/** 확인 창의 상태: 묻는 중 · 처리 중(끝나고 화면이 넘어가기를 기다리는 동안도) · 실패 */
export type SignOutPhase = "ask" | "working" | "failed";

/** 처리하는 동안에는 버튼을 누를 수 없다 (두 번 눌러도 한 번만 처리한다) */
export function canPress(phase: SignOutPhase): boolean {
  return phase !== "working";
}

/** 스피너는 처리가 늦어질 때만 보인다. elapsedMs 는 누른 뒤 지난 시간 */
export function showsSpinner(phase: SignOutPhase, elapsedMs: number): boolean {
  return phase === "working" && elapsedMs >= SPINNER_AFTER_MS;
}

/**
 * 로그아웃을 한 번 해 본다. signOut 은 Supabase 의 auth.signOut 모양(오류가 있으면 error 에 담아 돌려준다).
 * 오류를 돌려주거나 · 도중에 터지거나 · 정해 둔 시간 안에 답이 없으면 failed (그때 세션은 그대로라 다시 시도할 수 있다)
 */
export async function runSignOut(signOut: () => Promise<{ error: unknown }>, timeoutMs: number = SIGN_OUT_TIMEOUT_MS): Promise<"done" | "failed"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<"failed">((resolve) => {
    timer = setTimeout(() => resolve("failed"), timeoutMs);
  });
  try {
    return await Promise.race([signOut().then(({ error }): "done" | "failed" => (error ? "failed" : "done")), late]);
  } catch {
    return "failed";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 화면을 그릴 때는 로그인해 있었는데 지금은 아니면, 그 화면에는 로그인한 사람의 것이 남아 있다.
 * 뒤로 가기로 되살아난 화면이나 다른 탭에 남아 있던 화면이 다시 보일 때 이것으로 확인하고, 참이면 새로 받는다
 */
export function staleAfterSignOut(wasSignedIn: boolean, isSignedIn: boolean): boolean {
  return wasSignedIn && !isSignedIn;
}
