import { SCHEDULE_BASIS, SCHEDULE_STYLES } from "@/lib/signs";
import type { ScheduleStatus } from "@/lib/types";

/** 공지 칩(SignChip)과 같은 모양: 글자를 둥글게 감싸고 상태 색을 입힌다. 색만으로 구분하지 않는다 */
export function ScheduleBadge({ status, basis, large = false }: { status: ScheduleStatus; basis?: "notice" | "hours"; large?: boolean }) {
  const s = SCHEDULE_STYLES[status];
  return (
    <span className={`inline-flex shrink-0 flex-wrap items-center gap-1.5 ${large ? "" : "whitespace-nowrap"}`}>
      <span
        className={`inline-block rounded-xl border-2 font-bold whitespace-nowrap text-ink ${large ? "px-3 py-1 text-lg" : "px-2.5 py-1 text-sm"}`}
        style={{ background: `color-mix(in srgb, ${s.dot} 18%, white)`, borderColor: s.dot }}
      >
        {s.label}
      </span>
      {basis && status !== "unknown" && <span className="text-[13px] text-muted">{SCHEDULE_BASIS[basis]}</span>}
    </span>
  );
}
