import { SCHEDULE_BASIS, SCHEDULE_STYLES } from "@/lib/signs";
import type { ScheduleStatus } from "@/lib/types";

/** 공지 팻말(SignChip)과 같은 모양·색. 색만으로 구분하지 않는다 */
export function ScheduleBadge({ status, basis, large = false }: { status: ScheduleStatus; basis?: "notice" | "hours"; large?: boolean }) {
  const s = SCHEDULE_STYLES[status];
  return (
    <span className={`inline-flex shrink-0 flex-wrap items-center gap-1.5 ${large ? "" : "whitespace-nowrap"}`}>
      <span className={`ok-sign ${large ? "text-lg" : ""}`} style={{ background: s.bg, color: s.fg, borderColor: s.border, boxShadow: `0 2px 0 ${s.border}` }}>
        <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: s.dot }} />
        {s.label}
      </span>
      {basis && status !== "unknown" && <span className="text-[13px] text-muted">{SCHEDULE_BASIS[basis]}</span>}
    </span>
  );
}
