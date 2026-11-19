"use client";

import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { pushWithLoading } from "@/lib/nav";
import { REFRESHED } from "@/lib/nav";
import { dragOffset, innerPagerTakes, isWarm, neighborTab, otherTabs, swipeLock, swipeTarget } from "@/lib/swipe";
import { blocksSwipe } from "@/lib/swipeDom";

const OUT_MS = 170;

/** 탭 화면의 내용(아래 탭 줄은 그대로 두고 이것만 민다) */
function page(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".ok-shell main");
}

// 넘긴 뒤 새 화면이 들어올 방향. 탭을 눌러 옮길 때는 null 이라 그냥 바뀐다
let enterFrom: "left" | "right" | null = null;

// 앱이 기억하고 있는 탭 화면: 받은 시각과, 그때부터 기억이 유지되는 시간
// (들어가서 본 화면은 30초, 미리 통째로 받아 둔 화면은 5분. 새로 고침을 하면 모두 지워진다)
let kept: Record<string, { at: number; life: number }> = {};
const SEEN_LIFE = 28_000;
const FULL_LIFE = 280_000;
const RE_WARM_MS = 20_000;

/**
 * 홈 · 소통광장 · 내 공간을 좌우로 밀어 바꾼다.
 * 미는 동안 화면이 손가락을 따라오고, 놓으면 옆으로 빠져나간 뒤 다음 화면이 반대쪽에서 들어온다.
 * 홈에서는 옆 밀기가 먼저 카테고리를 넘기고(HomePager), 마지막 카테고리에서 더 밀 때만 여기로 온다
 */
export function TabSwipe() {
  const pathname = usePathname();
  const router = useRouter();

  // 새 탭 화면이 미끄러져 들어온다
  useEffect(() => {
    const from = enterFrom;
    enterFrom = null;
    const el = page();
    if (!from || !el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.classList.remove("ok-slide-in-left", "ok-slide-in-right");
    void el.offsetWidth;
    el.classList.add(from === "right" ? "ok-slide-in-right" : "ok-slide-in-left");
    const done = () => el.classList.remove("ok-slide-in-left", "ok-slide-in-right");
    el.addEventListener("animationend", done, { once: true });
    return () => el.removeEventListener("animationend", done);
  }, [pathname]);

  /**
   * 나머지 두 탭 화면을 통째로 미리 받아 둔다. 그래야 탭을 바꿀 때 로딩 없이 바로 바뀐다.
   * 들어온 화면이 받은 지 25초가 넘었으면 조용히 새로 받고, 그때 지워진 나머지 탭도 다시 받아 둔다
   */
  useEffect(() => {
    const others = otherTabs(pathname);
    if (others.length === 0) return;
    const timers: number[] = [];

    // 이미 새것을 기억하고 있으면 prefetch 는 아무 일도 하지 않는다. 기억이 끝난 것만 다시 받는다
    function warm() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      for (const to of others) {
        const k = kept[to];
        if (!k || now - k.at > k.life) kept[to] = { at: now, life: FULL_LIFE };
        router.prefetch(to, { kind: PrefetchKind.FULL });
      }
    }
    // 새로 고침은 기억해 둔 화면을 모두 지운다. 끝난 뒤 나머지 탭을 다시 받아 둔다
    function afterRefresh() {
      kept = { [pathname]: { at: Date.now(), life: SEEN_LIFE } };
      timers.push(window.setTimeout(warm, 700));
    }

    const here = kept[pathname];
    if (isWarm(here?.at, Date.now())) {
      timers.push(window.setTimeout(warm, 300));
    } else {
      // 기억해 둔 화면이 오래됐다: 지금 화면을 새로 받는다 (처음 들어온 화면은 이미 새것)
      if (here) router.refresh();
      afterRefresh();
    }
    // 방금 떠난 탭의 기억은 30초 뒤 끝난다. 그 직후와, 그 뒤로도 주기적으로 다시 받아 둔다
    timers.push(window.setTimeout(warm, SEEN_LIFE + 2500));
    const again = window.setInterval(warm, RE_WARM_MS);
    window.addEventListener(REFRESHED, afterRefresh);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearInterval(again);
      window.removeEventListener(REFRESHED, afterRefresh);
      // 떠나는 화면은 "본 화면"으로 30초 기억된다
      const k = kept[pathname];
      if (k) kept[pathname] = { at: k.at, life: Math.min(k.life, SEEN_LIFE + (Date.now() - k.at)) };
    };
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
      if (locked === null) {
        locked = swipeLock(dx, dy);
        // 홈의 카테고리처럼 화면 안에 넘길 것이 있으면 그쪽에 맡긴다. 끝에 닿았을 때만 탭을 넘긴다
        if (locked && innerPagerTakes(dx)) {
          start = null;
          locked = null;
          return;
        }
      }
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
