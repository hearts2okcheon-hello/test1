"use client";

import { useState } from "react";
import { Osori } from "@/components/Osori";
import { StoreCard } from "@/components/StoreCard";
import type { StoreSign } from "@/lib/types";

/** 카테고리 안의 가게 목록. 문 연 가게를 위로 */
export function StoreList({ stores }: { stores: StoreSign[] }) {
  const [openOnly, setOpenOnly] = useState(false);
  const open = stores.filter((s) => s.schedule_status === "open");
  const shown = openOnly ? open : [...open, ...stores.filter((s) => s.schedule_status !== "open")];

  return (
    <>
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-sm text-muted">
          영업중 <b className="text-[#2F6E3B]">{open.length}</b>곳 · 전체 {stores.length}곳
        </span>
        <button
          type="button"
          aria-pressed={openOnly}
          onClick={() => setOpenOnly(!openOnly)}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-3.5 font-display text-[15px] ${openOnly ? "border-sage-deep bg-sage text-white" : "border-line bg-card"}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12l5 5 9-10" />
          </svg>
          영업중만 보기
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-3">
        {shown.map((s) => <StoreCard key={s.store_id} store={s} />)}
      </div>
      {shown.length === 0 && (
        <div className="flex flex-col items-center gap-2.5 py-8 text-center font-display text-[17px] text-muted">
          <Osori mood="rest" size={120} />
          {stores.length === 0 ? "아직 등록된 가게가 없어요." : "지금은 다들 쉬는 중이에요. '영업중만 보기'를 끄면 모두 보여요."}
        </div>
      )}
    </>
  );
}
