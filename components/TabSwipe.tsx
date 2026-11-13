"use client";

import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { pushWithLoading } from "@/lib/nav";
import { TAB_ORDER, dragOffset, neighborTab, swipeLock, swipeTarget } from "@/lib/swipe";

const OUT_MS = 170;

/** 옆으로 넘기는 목록·입력칸·창 안에서 민 것은 탭 넘기기가 아니다 */
function blocksSwipe(el: Element | null): boolean {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.matches("input, textarea, select, [role=dialog], [data-no-swipe]")) return true;
    const ox = getComputedStyle(n).overflowX;
    if ((ox === "auto" || ox === "scroll") && n.scrollWidth > n.clientWidth + 2) return true;
  }
  return false;
}

/** 탭 화면의 내용(아래 탭 줄은 그대로 두고 이것만 민다) */
function page(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".ok-shell main");
}

// 넘긴 뒤 새 화면이 들어올 방향. 탭을 눌러 옮길 때는 null 이라 그냥 바뀐다
let enterFrom: "left" | "right" | null = null;

/**
 * 홈 · 소통광장 · 내 정보를 좌우로 밀어 바꾼다.
 * 미는 동안 화면이 손가락을 따라오고, 놓으면 옆으로 빠져나간 뒤 다음 화면이 반대쪽에서 들어온다
 */
export function TabSwipe() {
  const pathname = usePathname();
  const router = useRouter();

  // 새 탭 화면이 미끄러져 들어온다
  useEffect(() => {
    const from = enterFrom;
    enterFrom = null;
    const el = page();
    if (!from || !el) return;
    el.classList.remove("ok-slide-in-left", "ok-slide-in-right");
    void el.offsetWidth;
    el.classList.add(from === "right" ? "ok-slide-in-right" : "ok-slide-in-left");
    const done = () => {
      el.classList.remove("ok-slide-in-left", "ok-slide-in-right");
      // 미리 받아 둔 화면은 몇 분 전 것일 수 있다. 들어온 뒤 조용히 최신으로 바꾼다
      router.refresh();
    };
    el.addEventListener("animationend", done, { once: true });
    return () => el.removeEventListener("animationend", done);
  }, [pathname, router]);

  // 이웃 탭 화면을 통째로 미리 받아 둔다. 그래야 넘길 때 로딩 화면 없이 바로 바뀐다
  useEffect(() => {
    const i = TAB_ORDER.indexOf(pathname as (typeof TAB_ORDER)[number]);
    if (i < 0) return;
    const timer = window.setTimeout(() => {
      for (const to of [TAB_ORDER[i - 1], TAB_ORDER[i + 1]]) if (to) router.prefetch(to, { kind: PrefetchKind.FULL });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [pathname, router]);

  useEffect(() => {
    let start: { x: number; y: number } | null = null;
    let locked: boolean | null = null;
    let leaving = false;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function reset(animate: boolean) {
      const el = page();
      if (!el) return;
      el.style.transition = animate ? "transform 180ms ease-out" : "";
      el.style.transform = "";
      if (animate) window.setTimeout(() => (el.style.transition = ""), 200);
      el.style.willChange = "";
    }

    function onStart(e: TouchEvent) {
      locked = null;
      if (leaving || e.touches.length !== 1 || blocksSwipe(e.target as Element)) {
        start = null;
        return;
      }
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }

    function onMove(e: TouchEvent) {
      if (!start || leaving) return;
      const dx = e.touches[0].clientX - start.x;
      const dy = e.touches[0].clientY - start.y;
      if (locked === null) locked = swipeLock(dx, dy);
      if (!locked || calm) return;
      const el = page();
      if (!el) return;
      el.style.transition = "";
      el.style.willChange = "transform";
      el.style.transform = `translateX(${dragOffset(pathname, dx)}px)`;
    }

    function onEnd(e: TouchEvent) {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const wasLocked = locked;
      start = null;
      locked = null;
      // 가로로 민 것이 아니면(위아래 스크롤) 아무것도 하지 않는다
      const to = wasLocked ? swipeTarget(pathname, dx, 0) : null;
      if (!to || neighborTab(pathname, dx) !== to) return reset(true);

      enterFrom = dx < 0 ? "right" : "left";
      const el = page();
      if (!el || calm) {
        reset(false);
        return pushWithLoading(router, to);
      }
      leaving = true;
      el.style.transition = `transform ${OUT_MS}ms ease-in`;
      el.style.transform = `translateX(${dx < 0 ? "-100%" : "100%"})`;
      window.setTimeout(() => {
        leaving = false;
        pushWithLoading(router, to);
      }, OUT_MS);
    }

    function onCancel() {
      start = null;
      locked = null;
      if (!leaving) reset(true);
    }

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
      // 화면이 바뀌면 밀어 둔 흔적을 지운다 (새 화면은 새 main 이다)
      const el = page();
      if (el) {
        el.style.transition = "";
        el.style.transform = "";
        el.style.willChange = "";
      }
    };
  }, [pathname, router]);

  return null;
}
