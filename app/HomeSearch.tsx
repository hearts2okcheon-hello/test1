"use client";

import { useMemo, useState } from "react";
import { Osori } from "@/components/Osori";
import { StoreCard } from "@/components/StoreCard";
import { categoryById, categoryOf } from "@/lib/categories";
import type { StoreSign } from "@/lib/types";

/** 검색창. 글자를 넣으면 홈 내용 대신 찾은 가게가 나온다 */
export function HomeSearch({ stores, menus, children }: { stores: StoreSign[]; menus: Record<string, string[]>; children: React.ReactNode }) {
  const [q, setQ] = useState("");
  const needle = q.trim();

  const results = useMemo(() => {
    if (!needle) return [];
    return stores
      .map((store) => {
        const hit = (menus[store.store_id] ?? []).find((m) => m.includes(needle));
        const catName = categoryById(categoryOf(store.category))?.name ?? "";
        const match = store.name.includes(needle) || (store.category ?? "").includes(needle) || catName.includes(needle) || !!hit;
        return match ? { store, extra: hit ? ` · 메뉴: ${hit}` : "" } : null;
      })
      .filter((r): r is { store: StoreSign; extra: string } => r !== null)
      .sort((a, b) => Number(b.store.schedule_status === "open") - Number(a.store.schedule_status === "open"));
  }, [needle, stores, menus]);

  return (
    <>
      <label className="ok-sticker flex min-h-[54px] items-center gap-2.5 rounded-full border-2 border-line bg-card px-[18px]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <span className="sr-only">가게 검색</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="가게 이름, 메뉴를 찾아봐요" className="min-w-0 flex-1 bg-transparent text-base outline-none" />
        {q && (
          <button type="button" aria-label="검색어 지우기" onClick={() => setQ("")} className="-mr-3 flex size-11 shrink-0 items-center justify-center text-muted">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          </button>
        )}
      </label>

      {needle ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-normal">&lsquo;{needle}&rsquo; 찾은 가게 {results.length}곳</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-3">
            {results.map((r) => <StoreCard key={r.store.store_id} store={r.store} extra={r.extra} />)}
          </div>
          {results.length === 0 && (
            <div className="flex flex-col items-center gap-2.5 py-8 text-center font-display text-[17px] text-muted">
              <Osori mood="think" size={120} />
              찾는 가게가 아직 없어요. 다른 말로 찾아볼까요?
            </div>
          )}
        </section>
      ) : (
        children
      )}
    </>
  );
}
