"use client";

import { useEffect, useState } from "react";
import type { DayPlan, RegularHours, TempClosure } from "@/lib/types";
import { OwnerCalendar } from "./OwnerCalendar";

/**
 * 가게 이름 옆 달력 버튼: 누르면 오늘부터 한 달 달력이 창으로 뜬다.
 * 주민은 날짜를 눌러 그날 일정을 보고, 사장님(canManage)은 같은 달력에서 바로 넣고 고친다
 */
export function StoreCalendarButton({
  storeId,
  storeName,
  hours,
  closures,
  plans,
  canManage,
}: {
  storeId: string;
  storeName: string;
  hours: RegularHours | null;
  closures: TempClosure[];
  plans: DayPlan[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="달력으로 영업 일정 보기"
        onClick={() => setOpen(true)}
        className="relative flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-line bg-card"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 6h14v14H5z" />
          <path d="M5 10h14" />
          <path d="M9 3.5v4" />
          <path d="M15 3.5v4" />
        </svg>
        {(closures.length > 0 || plans.length > 0) && <span aria-hidden className="absolute top-0.5 right-0.5 size-3 rounded-full border-2 border-card bg-blue" />}
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="store-cal-title" data-no-swipe className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/30 sm:items-center" onClick={() => setOpen(false)}>
          <div className="ok-pop flex max-h-[92dvh] w-full max-w-[520px] flex-col rounded-t-[28px] border-2 border-line bg-paper sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-4 pt-4 pb-2">
              <h2 id="store-cal-title" className="min-w-0 flex-1 truncate font-display text-[23px] font-normal">{storeName} 일정 달력</h2>
              <button type="button" aria-label="달력 닫기" onClick={() => setOpen(false)} className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-line bg-card text-2xl leading-none">
                ×
              </button>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-[max(18px,env(safe-area-inset-bottom))]">
              <OwnerCalendar storeId={storeId} storeName={storeName} hours={hours} closures={closures} plans={plans} editable={canManage} embedded />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
