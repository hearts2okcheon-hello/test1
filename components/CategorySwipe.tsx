"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { LIST_TABS, neighborListTab, type ListTabId } from "@/lib/homeTabs";
import { swipeLock } from "@/lib/swipe";

const MIN_DX = 70;
// 넘긴 뒤 새 목록이 들어올 방향
let enterFrom: "left" | "right" | null = null;

const hrefOf = (id: ListTabId) => (id === "all" ? "/stores" : `/stores?cat=${id}`);

/**
 * 가게 목록 위의 카테고리 줄 (전체 · 카페 · 빵집 · 다과 · 한식 … 홈의 묶음 순서대로 카테고리를 하나씩).
 * 줄에서 눌러 바꾸거나, 화면을 옆으로 밀어 앞뒤 카테고리로 넘긴다
 */
export function CategorySwipe({ current }: { current: ListTabId }) {
  const router = useRouter();
  const row = useRef<HTMLDivElement>(null);

  // 지금 카테고리가 줄 가운데에 오게 하고, 밀어서 왔으면 미끄러져 들어온다
  useEffect(() => {
    const on = row.current?.querySelector<HTMLElement>("[aria-current=page]");
    if (row.current && on) row.current.scrollLeft = on.offsetLeft - (row.current.clientWidth - on.offsetWidth) / 2;
    const from = enterFrom;
    enterFrom = null;
    const list = document.getElementById("store-list");
    if (!from || !list || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cls = from === "right" ? "ok-slide-in-right" : "ok-slide-in-left";
    list.classList.add(cls);
    const done = () => list.classList.remove(cls);
    list.addEventListener("animationend", done, { once: true });
    return done;
  }, [current]);

  // 이웃 카테고리를 미리 받아 둔다
  useEffect(() => {
    for (const dir of [-1, 1] as const) {
      const to = neighborListTab(current, dir);
      if (to) router.prefetch(hrefOf(to));
    }
  }, [current, router]);

  useEffect(() => {
    let start: { x: number; y: number } | null = null;
    let locked: boolean | null = null;

    function onStart(e: TouchEvent) {
      locked = null;
      const el = e.target as Element | null;
      // 카테고리 줄처럼 옆으로 넘기는 곳, 입력칸, 창 안에서는 넘기지 않는다
      start = e.touches.length !== 1 || el?.closest("input, textarea, [role=dialog], [data-no-swipe]") ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    function onMove(e: TouchEvent) {
      if (!start || locked !== null) return;
      locked = swipeLock(e.touches[0].clientX - start.x, e.touches[0].clientY - start.y);
    }
    function onEnd(e: TouchEvent) {
      if (!start) return;
      const dx = e.changedTouches[0].clientX - start.x;
      const wasLocked = locked;
      start = null;
      locked = null;
      if (!wasLocked || Math.abs(dx) < MIN_DX) return;
      const to = neighborListTab(current, dx < 0 ? 1 : -1);
      if (!to) return;
      enterFrom = dx < 0 ? "right" : "left";
      router.replace(hrefOf(to), { scroll: false });
    }

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
  }, [current, router]);

  return (
    <nav aria-label="카테고리" className="-mx-5">
      <div ref={row} data-no-swipe className="ok-scroll-x relative flex gap-2 overflow-x-auto px-5 pb-1">
        {LIST_TABS.map((c) => {
          const on = c.id === current;
          return (
            <Link
              key={c.id}
              href={hrefOf(c.id)}
              replace
              scroll={false}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center rounded-full border-2 px-4 font-display text-[15px] whitespace-nowrap ${on ? "border-sage-deep bg-sage text-white" : "border-line bg-card"}`}
            >
              {c.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
