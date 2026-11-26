import { createClient } from "./supabase/client";

/** 알림 종류 (ADR-013 의 네 가지): 즐겨찾는 가게 소식 · 오픈 시간 확인 · 이웃 제보(사장님께) · 제보 답장. 모르는 것은 other */
export type AlertKind = "favorite" | "open_check" | "report" | "reply" | "other";
const ALERT_KINDS: AlertKind[] = ["favorite", "open_check", "report", "reply", "other"];

/**
 * 받은 알림 하나 (get_my_alerts). kind 와 needs_action 은 DB 가 정해서 준다:
 * needs_action 은 "아직 할 일이 남은 가장 새 알림"일 때만 참 (오늘 온 오픈 시간 확인인데 아직 오늘 소식을 올리지 않았을 때)
 */
export type AlertItem = { id: number; title: string; body: string; url: string; created_at: string; is_read: boolean; kind?: string | null; needs_action?: boolean | null };

/** 서버가 알려 준 종류. 모르는 값이면 other (그때는 기본 아이콘) */
export function alertKind(value: string | null | undefined): AlertKind {
  return ALERT_KINDS.find((k) => k === value) ?? "other";
}

/** 목록에 보일 제목. 휴대폰 알림용으로 앞에 붙인 그림 글자(⭐ 🔔 💬)는 뗀다. 종류는 아이콘이 알려 준다 */
export function alertTitle(title: string): string {
  return title.replace(/^(?:⭐|🔔|💬)️?\s*/u, "");
}

export const ALERT_ACTION_LABEL = "영업 상태 설정";

/**
 * 알림 아래에 보일 "누를 곳". 할 일이 남은 오픈 시간 확인에만 있다 (이미 처리했거나 날이 지났으면 DB 가 needs_action 을 거짓으로 준다).
 * 소식만 전하는 알림에는 없다
 */
export function alertAction(a: AlertItem): { label: string; href: string } | null {
  if (alertKind(a.kind) !== "open_check" || a.needs_action !== true) return null;
  return { label: ALERT_ACTION_LABEL, href: a.url || "/owner/store" };
}

/** 안 읽은 수가 바뀌었음을 벨 버튼에 알리는 이벤트 */
export const ALERT_COUNT = "ok:alert-count";

const DAY = 86_400_000;

/** 알림 목록의 묶음: 오늘 · 이번 주(7일 안) · 이전 */
export function alertGroup(iso: string, now: Date = new Date()): "오늘" | "이번 주" | "이전" {
  const age = now.getTime() - new Date(iso).getTime();
  if (age < DAY) return "오늘";
  return age < 7 * DAY ? "이번 주" : "이전";
}

/** 벨 위 숫자: 99개가 넘으면 99+ */
export function badgeText(count: number): string {
  return count > 99 ? "99+" : String(Math.max(0, count));
}

/** 알림을 눌러 들어온 주소에서 알림 번호를 꺼낸다 (?alert=12). 없으면 null */
export function alertIdFrom(search: string): number | null {
  const v = new URLSearchParams(search).get("alert");
  return v && /^\d+$/.test(v) ? Number(v) : null;
}

/** 앱 아이콘 숫자와 벨 숫자를 맞춘다. 숫자를 못 쓰는 기기에서는 아무 일도 없다 */
export function showBadge(count: number) {
  const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try {
    if (count > 0) nav.setAppBadge?.(count)?.catch(() => {});
    else nav.clearAppBadge?.()?.catch(() => {});
  } catch {
    // 지원하지 않는 기기
  }
  window.dispatchEvent(new CustomEvent(ALERT_COUNT, { detail: count }));
}

/** 서버에서 안 읽은 수를 받아 아이콘·벨에 반영한다 */
export async function syncBadge(): Promise<number> {
  const supabase = createClient();
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return 0;
  const { data } = await supabase.rpc("get_my_alert_count");
  const count = typeof data === "number" ? data : 0;
  showBadge(count);
  return count;
}

export async function markAlertRead(id: number): Promise<void> {
  const { data } = await createClient().rpc("mark_alert_read", { p_id: id });
  if (typeof data === "number") showBadge(data);
}
