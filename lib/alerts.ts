import { createClient } from "./supabase/client";

export type AlertItem = { id: number; title: string; body: string; url: string; created_at: string; is_read: boolean };

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
