"use client";

import Link from "next/link";
import { useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { StatusCycle } from "@/components/StatusCycle";
import { StoreCard } from "@/components/StoreCard";
import { CATEGORIES, categoryOf, type CategoryId } from "@/lib/categories";
import { filterByStatus, storeStatus, type StatusFilter } from "@/lib/storeFilter";
import type { StoreSign } from "@/lib/types";

/** 홈에서는 이만큼만 보여 주고, 가게가 이보다 많으면 "더 보기"로 넘긴다 */
const HOME_LIMIT = 10;

/**
 * 홈 "무엇을 찾아요?": 카테고리를 옆으로 넘겨 고르면, 화면을 옮기지 않고 그 아래에 가게가 나온다
 */
export function HomeCategories({ stores }: { stores: StoreSign[] }) {
  const [cat, setCat] = useState<CategoryId | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");

  const inCat = cat ? stores.filter((s) => categoryOf(s.category) === cat) : [];
  const shown = filterByStatus(inCat, status);
  const name = CATEGORIES.find((c) => c.id === cat)?.name;

  return (
    <section aria-labelledby="find-title" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="find-title" className="font-display text-[19px] font-normal">무엇을 찾아요?</h2>
        <span className="text-sm text-muted">
          지금 문 연 가게 <b className="text-open">{stores.filter((s) => storeStatus(s) === "open").length}곳</b>
        </span>
      </div>

      {/* 카테고리: 옆으로 넘겨 본다 */}
      <div className="-mx-5">
        <div role="group" aria-label="카테고리" className="ok-scroll-x flex snap-x gap-2.5 overflow-x-auto px-5 pt-0.5 pb-2">
          {CATEGORIES.map((c) => {
            const on = cat === c.id;
            const open = stores.filter((s) => categoryOf(s.category) === c.id && storeStatus(s) === "open").length;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={(e) => {
                  setCat(on ? null : c.id);
                  setStatus("all");
                  e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
                }}
                style={on ? { boxShadow: "0 4px 0 var(--color-sage-deep)" } : undefined}
                className={`ok-sticker flex w-[92px] shrink-0 snap-start scroll-ml-5 flex-col items-center gap-1.5 rounded-[22px] border-2 px-0.5 pt-3 pb-2.5 ${on ? "border-sage-deep bg-sage-soft" : "border-line bg-card"}`}
              >
                <span className="flex size-[56px] items-center justify-center rounded-full border-2 border-white" style={{ background: c.bg, boxShadow: `0 0 0 2px ${c.bg}` }}>
                  <CategoryIcon id={c.id} />
                </span>
                <span className="font-display text-[15px] whitespace-nowrap">{c.name}</span>
                <span className={`text-[12px] font-bold ${open > 0 ? "text-open" : "text-muted"}`}>영업중 {open}</span>
              </button>
            );
          })}
        </div>
      </div>

      {cat === null ? (
        <p className="rounded-[20px] border-2 border-dashed border-line px-4 py-3.5 text-[15px] leading-normal text-muted">카테고리를 누르면 가게가 바로 아래에 나와요.</p>
      ) : (
        <div key={cat} className="ok-pop flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 flex-1 truncate font-display text-[17px] font-normal">
              {name} <span aria-live="polite" className="font-sans text-sm text-muted">{status === "all" ? `${inCat.length}곳` : `${shown.length}곳 / ${inCat.length}곳`}</span>
            </h3>
            <StatusCycle value={status} onChange={setStatus} />
            {inCat.length >= HOME_LIMIT && (
              <Link href={`/stores?cat=${cat}`} className="flex min-h-11 shrink-0 items-center gap-0.5 rounded-full border-2 border-line bg-card pr-2.5 pl-3.5 font-display text-[15px]">
                더 보기
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            )}
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-3">
            {shown.slice(0, HOME_LIMIT).map((s) => <StoreCard key={s.store_id} store={s} />)}
          </div>
          {shown.length === 0 && (
            <p className="rounded-[20px] border-2 border-dashed border-line px-4 py-3.5 text-[15px] leading-normal text-muted">
              {inCat.length === 0 ? `아직 등록된 ${name} 가게가 없어요.` : "지금 이 상태인 가게가 없어요. 버튼을 눌러 다른 상태를 봐 주세요."}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
