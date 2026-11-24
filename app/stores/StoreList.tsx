"use client";

import { useState } from "react";
import { Osori } from "@/components/Osori";
import { StatusSelect } from "@/components/StatusSelect";
import { StoreCard } from "@/components/StoreCard";
import { filterByStatus, matchesStore, storeStatus, type StatusFilter } from "@/lib/storeFilter";
import type { StoreSign } from "@/lib/types";

/** 카테고리 안의 가게 목록. 이 안에서 찾고, 상태(전체·영업중·휴무중·외출중)를 골라 본다 */
export function StoreList({ stores }: { stores: StoreSign[] }) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");
  const open = stores.filter((s) => storeStatus(s) === "open").length;
  const shown = filterByStatus(stores, status).filter((s) => matchesStore(s, q));

  return (
    <>
      <label className="flex min-h-12 items-center gap-2.5 rounded-full border-2 border-line bg-card px-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <span className="sr-only">이 목록에서 가게 찾기</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이 목록에서 가게 찾기" className="min-w-0 flex-1 bg-transparent text-base outline-none" />
        {q && (
          <button type="button" aria-label="검색어 지우기" onClick={() => setQ("")} className="-mr-3 flex size-11 shrink-0 items-center justify-center text-muted">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          </button>
        )}
      </label>
      <div className="flex items-center justify-between gap-2.5">
        <span aria-live="polite" className="text-sm text-muted">
          {status === "all" && !q.trim() ? (
            <>
              영업중 <b className={open > 0 ? "text-open" : ""}>{open}</b>곳 · 모두 {stores.length}곳
            </>
          ) : (
            <>
              찾은 가게 <b className="text-ink">{shown.length}</b>곳 · 모두 {stores.length}곳
            </>
          )}
        </span>
        <StatusSelect value={status} onChange={setStatus} />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] items-start gap-3">
        {shown.map((s) => <StoreCard key={s.store_id} store={s} />)}
      </div>
      {shown.length === 0 && (
        <div className="flex flex-col items-center gap-2.5 py-8 text-center font-display text-[17px] text-muted">
          <Osori mood="rest" size={120} />
          {stores.length === 0 ? "아직 등록된 가게가 없어요." : q.trim() ? "찾는 가게가 없어요. 다른 말로 찾아볼까요?" : "지금 이 상태인 가게가 없어요. 위에서 다른 상태를 골라 주세요."}
        </div>
      )}
    </>
  );
}
