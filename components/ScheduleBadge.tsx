import { SCHEDULE_BASIS, SCHEDULE_STYLES } from "@/lib/signs";
import type { ScheduleStatus } from "@/lib/types";

/** 동그라미 + 글자. 색만으로 구분하지 않는다 */
export function ScheduleBadge({ status, basis, large = false }: { status: ScheduleStatus; basis?: "notice" | "hours"; large?: boolean }) {
  const s = SCHEDULE_STYLES[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 ${large ? "" : "whitespace-nowrap"}`}>
      <span aria-hidden className={`shrink-0 rounded-full ${large ? "size-5" : "size-3"}`} style={{ background: s.dot }} />
      <span className={large ? "font-display text-[22px]" : "text-sm font-bold"}>{s.label}</span>
      {basis && status !== "unknown" && <span className="text-[13px] text-muted">· {SCHEDULE_BASIS[basis]}</span>}
    </span>
  );
}
