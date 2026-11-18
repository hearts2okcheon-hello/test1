"use client";

import { SIGN_STYLES } from "@/lib/signs";
import { STATUS_FILTER_LABEL, nextStatusFilter, type StatusFilter } from "@/lib/storeFilter";

const DOT: Record<StatusFilter, string | null> = {
  all: null,
  open: SIGN_STYLES.open.dot,
  closed: SIGN_STYLES.closed_today.dot,
  out: SIGN_STYLES.out.dot,
};

/** 누를 때마다 전체 → 영업중 → 휴무중 → 외출중으로 바뀌는 버튼 */
export function StatusCycle({ value, onChange }: { value: StatusFilter; onChange: (v: StatusFilter) => void }) {
  const next = nextStatusFilter(value);
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-label={`지금 ${STATUS_FILTER_LABEL[value]} 보는 중. 누르면 ${STATUS_FILTER_LABEL[next]}`}
      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 font-display text-[15px] ${value === "all" ? "border-line bg-card" : "border-sage-deep bg-sage-soft text-sage-deep"}`}
    >
      {DOT[value] && <span aria-hidden className="size-2.5 rounded-full" style={{ background: DOT[value]! }} />}
      {STATUS_FILTER_LABEL[value]}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 8h13l-3-3M20 16H7l3 3" />
      </svg>
    </button>
  );
}
