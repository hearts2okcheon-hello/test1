"use client";

import { createContext, useContext, useId, useMemo, useState } from "react";
import { articlesByStore } from "@/lib/storeArticles";
import type { StoreArticle } from "@/lib/types";
import { ArticleRows } from "./ArticleRows";

const Articles = createContext<Record<string, StoreArticle[]>>({});

/** 가게에 붙인 옥천신문 기사를, 그 아래에 그려지는 가게 칸(StoreCard)들이 꺼내 쓰게 한다 */
export function StoreArticlesProvider({ articles, children }: { articles: StoreArticle[]; children: React.ReactNode }) {
  const map = useMemo(() => articlesByStore(articles), [articles]);
  return <Articles.Provider value={map}>{children}</Articles.Provider>;
}

/**
 * 가게 칸 맨 아래의 "옥천신문 기사" 줄 (ADR-020). 옥천신문이 기사를 붙인 가게에만 나온다.
 * 아래 화살표를 누르면 기사 제목(두 줄까지)과 오른쪽 사진이 펼쳐지고, 그 아래의 위 화살표로 접는다
 */
export function StoreArticles({ storeId, storeName }: { storeId: string; storeName: string }) {
  const list = useContext(Articles)[storeId];
  const [open, setOpen] = useState(false);
  // 한 번 펼친 뒤에만 목록을 그린다 (접혀 있는 가게의 기사 사진까지 미리 받지 않게)
  const [drawn, setDrawn] = useState(false);
  const id = useId();
  if (!list || list.length === 0) return null;

  return (
    <div className="flex flex-col border-t-2 border-line">
      <div
        id={id}
        role="region"
        aria-label={`${storeName} 옥천신문 기사`}
        inert={!open}
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          {drawn && <ArticleRows list={list} className="px-3.5" />}
        </div>
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setDrawn(true);
          setOpen(!open);
        }}
        className={`flex min-h-11 w-full items-center justify-center gap-1.5 rounded-b-[20px] text-[14px] font-bold text-muted active:!transform-none ${open ? "border-t-2 border-line" : ""}`}
      >
        {!open && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
            <path d="M4 5.5h13v13H6a2 2 0 0 1-2-2z" />
            <path d="M17 9h3v7.5a2 2 0 0 1-2 2" />
            <path d="M7.5 9.5h6" />
            <path d="M7.5 13h6" />
          </svg>
        )}
        {open ? "기사 접기" : `옥천신문 기사${list.length > 1 ? ` ${list.length}` : ""}`}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`shrink-0 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}
