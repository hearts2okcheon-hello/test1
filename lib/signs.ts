// 팻말 코드 → 문구·색·오소리 표정 (design-system.md §2, §7)
// 상태를 "계산"하지 않는다. 계산은 DB(get_store_signs)에서만 한다. (ADR-001)

import type { NoticeKind, ReportKind, SignKind, Source } from "./types";

export type Mood =
  | "basic" | "happy" | "curious" | "surprise" | "proud" | "smile" | "move"
  | "rest" | "talk" | "together" | "think" | "find" | "work";

export type SignStyle = {
  chip: string;
  title: string;
  /** 사장님 공지 버튼 문구 */
  button: string;
  bg: string;
  fg: string;
  border: string;
  mood: Mood;
  moodAlt: string;
};

export const SIGN_STYLES: Record<SignKind, SignStyle> = {
  open: { chip: "영업 중", title: "오늘도 열었어요", button: "영업 중이에요", bg: "#E6F0DF", fg: "#4E6E44", border: "#B9D0AC", mood: "happy", moodAlt: "신난 오소리" },
  closed_today: { chip: "오늘 휴무", title: "오늘은 쉬어요", button: "오늘 쉬어요", bg: "#FBE3E1", fg: "#A4423F", border: "#EFB9B5", mood: "rest", moodAlt: "쉬고 있는 오소리" },
  late_open: { chip: "늦게 열어요", title: "조금 늦게 열어요", button: "늦게 열어요", bg: "#FFF1CF", fg: "#7E5810", border: "#F0D697", mood: "move", moodAlt: "가게로 가는 오소리" },
  sold_out: { chip: "재료 소진", title: "재료가 다 떨어졌어요", button: "재료 소진", bg: "#FDE7D6", fg: "#954A18", border: "#F2C7A6", mood: "surprise", moodAlt: "놀란 오소리" },
  early_close: { chip: "일찍 닫아요", title: "오늘은 일찍 닫아요", button: "일찍 닫아요", bg: "#F9E6E9", fg: "#97404F", border: "#EDBFC7", mood: "smile", moodAlt: "웃는 오소리" },
  checking: { chip: "확인 중", title: "사장님께 확인 중이에요", button: "", bg: "#FFF4D6", fg: "#715212", border: "#F0D697", mood: "curious", moodAlt: "궁금한 오소리" },
  none: { chip: "소식 없음", title: "아직 오늘 소식이 없어요", button: "", bg: "#EFE9DF", fg: "#5F5249", border: "#DCD1C0", mood: "basic", moodAlt: "오소리" },
};

/** 사장님 공지 버튼 순서 */
export const NOTICE_KINDS: NoticeKind[] = ["open", "closed_today", "late_open", "sold_out", "early_close"];

/** 시각을 함께 고를 수 있는 공지 */
export const TIMED_KINDS: NoticeKind[] = ["late_open", "early_close"];

export const SOURCE_STYLES: Record<Source, { label: string; fg: string; bg: string }> = {
  owner: { label: "사장님", fg: "#4E6E44", bg: "#E6F0DF" },
  okcheon: { label: "옥천신문 확인", fg: "#7E5810", bg: "#FFF1CF" },
  neighbor: { label: "이웃 제보", fg: "#6B5D52", bg: "#EFE9DF" },
};

export type ReportStyle = {
  label: string;
  color: string;
  /** 사장님에게 묻는 질문. 없으면 확인 질문을 만들지 않는다 */
  question: string | null;
  yes: string;
  no: string;
};

export const REPORT_STYLES: Record<ReportKind, ReportStyle> = {
  seen_closed: { label: "문 닫혀 있었어요", color: "#D9706F", question: "오늘 가게 문 닫았나요?", yes: "네, 오늘 쉬어요", no: "아니요, 열었어요" },
  seen_open: { label: "열려 있었어요", color: "#7E9F72", question: "지금 가게 열려 있나요?", yes: "네, 열었어요", no: "아니요, 쉬어요" },
  seen_sold_out: { label: "재료 다 떨어졌대요", color: "#E59A55", question: "재료가 다 떨어졌나요?", yes: "네, 다 팔렸어요", no: "아니요, 있어요" },
  seen_long_line: { label: "줄이 길어요", color: "#D9A132", question: null, yes: "", no: "" },
};

export const REPORT_KINDS: ReportKind[] = ["seen_closed", "seen_open", "seen_sold_out", "seen_long_line"];

/** 사장님 쪽지 빠른 문구 */
export const MEMO_CHIPS = ["마감 할인해요", "새 메뉴 나왔어요", "내일은 정상 영업해요"];

export const MEMO_MAX = 40;

/** "11:00:00" → "11시", "13:30" → "오후 1시 30분" */
export function formatClock(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}시${m ? ` ${m}분` : ""}`;
}

/** 팻말 큰 문구. 시각이 있으면 덧붙인다 */
export function signTitle(sign: SignKind, atTime: string | null): string {
  const base = SIGN_STYLES[sign].title;
  if (!atTime) return base;
  if (sign === "late_open") return `${formatClock(atTime)}에 열어요`;
  if (sign === "early_close") return `${formatClock(atTime)}에 닫아요`;
  return base;
}

/** 칩 문구 (목록용, 짧게) */
export function signChip(sign: SignKind, atTime: string | null): string {
  const base = SIGN_STYLES[sign].chip;
  if (!atTime) return base;
  if (sign === "late_open") return `${formatClock(atTime).replace(/^(오전|오후) /, "")} 오픈`;
  if (sign === "early_close") return `${formatClock(atTime).replace(/^(오전|오후) /, "")} 마감`;
  return base;
}

/** 마을방송 한 줄: 쪽지가 있으면 쪽지, 없으면 공지 문구 */
export function castLine(kind: NoticeKind, atTime: string | null, memo: string | null): string {
  if (memo) return memo;
  if (atTime && (kind === "late_open" || kind === "early_close")) return signTitle(kind, atTime);
  return SIGN_STYLES[kind].button;
}

/** 30분 단위 시각 버튼 (오전 7시 ~ 오후 10시) */
export function timeOptions(from = 7, to = 22): string[] {
  const out: string[] = [];
  for (let h = from; h <= to; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    if (h < to) out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
}
