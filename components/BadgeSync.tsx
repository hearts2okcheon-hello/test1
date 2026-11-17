"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { alertIdFrom, markAlertRead, syncBadge } from "@/lib/alerts";

/**
 * 앱 아이콘의 안 읽은 알림 숫자를 맞춘다.
 * 휴대폰 알림을 눌러 들어왔으면(?alert=번호) 그 알림을 읽음으로 바꾼다
 */
export function BadgeSync() {
  const pathname = usePathname();

  useEffect(() => {
    async function run() {
      try {
        const id = alertIdFrom(window.location.search);
        if (id !== null) {
          const url = new URL(window.location.href);
          url.searchParams.delete("alert");
          window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
          await markAlertRead(id);
        }
        await syncBadge();
      } catch {
        // 숫자를 못 맞춰도 화면은 그대로
      }
    }
    run();
    const onShow = () => document.visibilityState === "visible" && run();
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [pathname]);

  return null;
}
