"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { REFRESHED } from "@/lib/nav";

/** 화면을 보고 있는 동안 일정 시간마다 새 소식을 받아 온다 (홈의 실시간 소식) */
export function LiveRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      window.dispatchEvent(new Event(REFRESHED));
    };
    const id = window.setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, seconds]);
  return null;
}
