// 팻말 코드 → 문구·색·오소리 표정 (design-system.md §2, §7)
// 상태를 "계산"하지 않는다. 계산은 DB(get_store_signs)에서만 한다. (ADR-001)

import { CATEGORIES } from "./categories";
import type { FeedItem, NoticeKind, PhotoCategory, ReportKind, ScheduleStatus, SignKind, Source } from "./types";

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
  /** 팻말 안의 동그라미 */
  dot: string;
  mood: Mood;
  moodAlt: string;
};

// 팻말 색은 세 갈래: 영업 / 주의 / 닫힘
const TONE_OPEN = { bg: "#DDF3DF", fg: "#2F6E3B", border: "#6DBA78", dot: "#3FA052" };
const TONE_WARN = { bg: "#FFE9CC", fg: "#8A4A0B", border: "#E7A35A", dot: "#E58A2E" };
const TONE_CLOSED = { bg: "#EFE9DF", fg: "#5E5246", border: "#BFB19A", dot: "#A8987F" };
const TONE_HOLIDAY = { bg: "#FBE3E1", fg: "#A4423F", border: "#E5A29E", dot: "#D9706F" };

export const SIGN_STYLES: Record<SignKind, SignStyle> = {
  open: { chip: "영업중", title: "오늘도 열었어요", button: "영업 중이에요", ...TONE_OPEN, mood: "happy", moodAlt: "신난 오소리" },
  closed_today: { chip: "오늘 휴무", title: "오늘은 쉬어요", button: "오늘 쉬어요", ...TONE_HOLIDAY, mood: "rest", moodAlt: "쉬고 있는 오소리" },
  late_open: { chip: "늦게 열어요", title: "조금 늦게 열어요", button: "늦게 열어요", ...TONE_WARN, mood: "move", moodAlt: "가게로 가는 오소리" },
  sold_out: { chip: "재료 소진", title: "재료가 다 떨어졌어요", button: "재료 소진", ...TONE_WARN, mood: "surprise", moodAlt: "놀란 오소리" },
  early_close: { chip: "일찍 닫아요", title: "오늘은 일찍 닫아요", button: "일찍 닫아요", ...TONE_WARN, mood: "smile", moodAlt: "웃는 오소리" },
  temp_closed: { chip: "임시휴무", title: "임시휴무 중이에요", button: "", ...TONE_HOLIDAY, mood: "rest", moodAlt: "쉬고 있는 오소리" },
  checking: { chip: "확인 중", title: "사장님께 확인 중이에요", button: "", ...TONE_WARN, mood: "curious", moodAlt: "궁금한 오소리" },
  none: { chip: "소식 없음", title: "아직 오늘 소식이 없어요", button: "", ...TONE_CLOSED, mood: "basic", moodAlt: "오소리" },
};

/** 영업 상태 칩. 공지 칩과 같은 색을 써서 어디서 나온 상태든 같은 모양으로 보인다 */
function scheduleChip(label: string, s: SignStyle) {
  return { label, bg: s.bg, fg: s.fg, border: s.border, dot: s.dot };
}
export const SCHEDULE_STYLES: Record<ScheduleStatus, { label: string; bg: string; fg: string; border: string; dot: string }> = {
  open: scheduleChip(SIGN_STYLES.open.chip, SIGN_STYLES.open),
  closed: scheduleChip("영업종료", SIGN_STYLES.none),
  regular_holiday: scheduleChip("정기휴일", SIGN_STYLES.late_open),
  temp_closed: scheduleChip(SIGN_STYLES.temp_closed.chip, SIGN_STYLES.temp_closed),
  unknown: scheduleChip("영업시간 정보 없음", SIGN_STYLES.none),
};

/** 어디서 나온 상태인지 함께 보여 준다. 시간으로 계산한 값은 실제와 다를 수 있다 */
export const SCHEDULE_BASIS = { hours: "등록한 영업시간 기준", notice: "오늘 알림 기준" } as const;

export const PHOTO_CATEGORIES: { id: PhotoCategory; label: string }[] = [
  { id: "store", label: "매장" },
  { id: "food", label: "음식" },
  { id: "daily", label: "일상" },
];

export const STORE_CATEGORIES = CATEGORIES.map((c) => c.name);

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
/** 옥천신문 대리 등록에서만 더 보이는 쪽지 */
export const PROXY_MEMO_CHIPS = [...MEMO_CHIPS, "개인 사정으로 휴무합니다"];

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

/** "2026-11-07" → "11월 7일" */
export function formatDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일`;
}

/** 임시휴무 기간 문구. 하루면 하루만 */
export function formatRange(start: string, end: string): string {
  return start === end ? formatDate(start) : `${formatDate(start)} ~ ${formatDate(end)}`;
}

/** 오늘 들어온 소식 한 줄 */
export function feedLine(f: Pick<FeedItem, "item_type" | "kind" | "at_time" | "memo" | "closure_start" | "closure_end">): string {
  if (f.item_type === "closure" && f.closure_start && f.closure_end) {
    return `${formatRange(f.closure_start, f.closure_end)} 임시휴무${f.memo ? ` · ${f.memo}` : ""}`;
  }
  if (f.item_type === "post") return f.memo ?? "";
  return castLine(f.kind as NoticeKind, f.at_time, f.memo);
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

/** 가게마다 가장 최근 것 하나만, 최신순으로 (홈 마을방송이 한 가게로 도배되지 않게) */
export function latestPerStore<T extends { store_id: string; created_at: string }>(items: T[]): T[] {
  const best = new Map<string, T>();
  for (const it of items) {
    const cur = best.get(it.store_id);
    if (!cur || it.created_at > cur.created_at) best.set(it.store_id, it);
  }
  return [...best.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}
