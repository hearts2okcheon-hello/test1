// RPC 에러 코드 → 오소리 말투 문구

const MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: "로그인이 필요해요.",
  NOT_OWNER: "이 가게 사장님만 할 수 있어요.",
  NOT_ADMIN: "옥천신문 관리자만 할 수 있어요.",
  NOT_FOUND: "찾을 수 없어요. 새로고침 해 주세요.",
  DUPLICATE_REPORT: "이미 알려주셨어요. 30분 뒤에 다시 알려주세요.",
  OWN_REPORT: "내가 올린 제보에는 누를 수 없어요.",
  ALREADY_RESOLVED: "이미 확인이 끝난 소식이에요.",
  UNDO_WINDOW_PASSED: "5분이 지나서 되돌릴 수 없어요. 새 소식을 눌러 주세요.",
  UNDO_NOT_ALLOWED: "이 소식은 되돌릴 수 없어요.",
  INVALID_TIME: "시각을 다시 골라 주세요.",
  MEMO_TOO_LONG: "쪽지는 40자까지 쓸 수 있어요.",
  NO_QUESTION: "확인할 필요가 없는 제보예요.",
  INVALID_CODE: "코드가 맞지 않아요. 옥천신문에 다시 확인해 주세요.",
  TOO_MANY_ATTEMPTS: "여러 번 틀렸어요. 10분 뒤에 다시 넣어 주세요.",
  INVALID_NAME: "가게 이름을 써 주세요.",
};

export function errorMessage(error: unknown): string {
  const raw = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "";
  for (const code of Object.keys(MESSAGES)) {
    if (raw.includes(code)) return MESSAGES[code];
  }
  // Supabase 대시보드에서 익명 로그인이 꺼져 있을 때 (ADR-003)
  if (/anonymous sign-ins are disabled/i.test(raw)) return "지금은 이용할 수 없어요. 옥천신문에 알려 주세요. (관리자: Supabase 익명 로그인 켜기)";
  if (/fetch|network/i.test(raw)) return "인터넷 연결을 확인하고 다시 눌러 주세요.";
  return "잠깐 문제가 생겼어요. 다시 눌러 주세요.";
}
