"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { pushWithLoading } from "@/lib/nav";
import { swipeTarget } from "@/lib/swipe";

/** 옆으로 넘기는 목록·입력칸·창 안에서 민 것은 탭 넘기기가 아니다 */
function blocksSwipe(el: Element | null): boolean {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.matches("input, textarea, select, [role=dialog], [data-no-swipe]")) return true;
    const ox = getComputedStyle(n).overflowX;
    if ((ox === "auto" || ox === "scroll") && n.scrollWidth > n.clientWidth + 2) return true;
  }
  return false;
}

/** 홈 · 소통광장 · 내 가게를 좌우로 밀어 바꾼다 */
export function TabSwipe() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let start: { x: number; y: number; t: number } | null = null;

    function onStart(e: TouchEvent) {
      if (e.touches.length !== 1 || blocksSwipe(e.target as Element)) {
        start = null;
        return;
      }
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
    }

    function onEnd(e: TouchEvent) {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const quick = Date.now() - start.t < 700;
      start = null;
      if (!quick) return;
      const to = swipeTarget(pathname, dx, dy);
      if (to) pushWithLoading(router, to);
    }

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [pathname, router]);

  return null;
}
