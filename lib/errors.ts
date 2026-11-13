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
  INVALID_CODE: "코드가 맞지 않아요. 글자와 숫자를 다시 확인해 주세요.",
  TOO_MANY_ATTEMPTS: "여러 번 틀렸어요. 10분 뒤에 다시 넣어 주세요.",
  INVALID_MY_NAME: "이름을 써 주세요. (20자까지)",
  INVALID_AREA: "사는 곳을 골라 주세요.",
  DAY_CLOSED: "이날은 휴무로 잡혀 있어요. 휴무를 먼저 취소해 주세요.",
  INVALID_NAME: "가게 이름을 써 주세요.",
  INVALID_PHONE: "전화번호를 다시 확인해 주세요. (예: 010-1234-5678)",
  INVALID_HOURS: "영업하는 요일을 하루 이상 넣어 주세요.",
  INVALID_PHOTO: "사진을 다시 올려 주세요.",
  INVALID_MENU: "메뉴 이름을 써 주세요.",
  INVALID_BODY: "내용을 써 주세요.",
  INVALID_DATES: "날짜를 다시 골라 주세요.",
  IMAGE_READ: "이 사진은 읽을 수 없어요. 다른 사진을 골라 주세요.",
  TEXT_TOO_LONG: "글이 너무 길어요. 조금 줄여 주세요.",
  TOO_MANY_ITEMS: "메뉴는 20개, 사진은 60장까지 넣을 수 있어요.",
  ALREADY_REGISTERED: "이 코드로 등록한 가게가 이미 있어요.",
  CODE_HAS_STORE: "이 번호는 이미 다른 가게와 연결돼 있어요.",
  STORE_HAS_CODE: "이 가게는 이미 다른 번호와 연결돼 있어요.",
  CLOSURE_OVERLAP: "이미 임시휴무가 잡힌 날이 있어요. 먼저 취소해 주세요.",
  COMMENT_TOO_FAST: "조금 뒤에 다시 써 주세요.",
  LOGIN_REQUIRED: "카카오로 로그인한 뒤 할 수 있어요.",
  REASON_REQUIRED: "확인하는 이유를 적어 주세요.",
  WRONG_PASSWORD: "비밀번호가 맞지 않아요.",
  PROTECTED_CODE: "보호된 코드는 바꿀 수 없어요.",
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
