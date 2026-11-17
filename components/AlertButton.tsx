"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ALERT_COUNT, badgeText } from "@/lib/alerts";
import { getPushState, type PushState } from "@/lib/push";

export function Bell({ off = false, size = 22 }: { off?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <g transform={off ? "translate(-2.2 2) scale(0.88)" : undefined}>
        <path d="M6 10.5a6 6 0 0 1 12 0v3.7l1.6 2.6H4.4L6 14.2z" />
        <path d="M10 19.5a2 2 0 0 0 4 0" />
      </g>
      {/* 꺼짐: 벨 오른쪽 위에 X */}
      {off && <path d="M17 2.5l4.5 4.5M21.5 2.5L17 7" strokeWidth="2.6" />}
    </svg>
  );
}

/**
 * 홈 오른쪽 위 벨. 켜져 있으면 초록 테두리 벨, 꺼져 있으면 빨간 테두리 X 벨.
 * 누르면 받은 알림 목록(/alerts)으로 간다. 켜고 끄는 것도 거기서 한다
 */
export function AlertButton() {
  const [state, setState] = useState<PushState | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    getPushState().then(setState);
    const onCount = (e: Event) => setCount((e as CustomEvent<number>).detail);
    window.addEventListener(ALERT_COUNT, onCount);
    return () => window.removeEventListener(ALERT_COUNT, onCount);
  }, []);

  if (state === null || state === "unsupported" || state === "need-install") return null;
  const on = state === "on";

  return (
    <Link
      href="/alerts"
      aria-label={`${on ? "알림 켜짐" : "알림 꺼짐"}. 받은 알림 보기${count > 0 ? `, 안 읽은 알림 ${count}개` : ""}`}
      className={`relative flex size-12 shrink-0 items-center justify-center rounded-full border-[2.5px] bg-card ${on ? "border-sage text-sage-deep" : "border-coral text-[#A4423F]"}`}
    >
      <Bell off={!on} />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#E5484D] px-1 text-[13px] leading-none font-bold text-white">
          {badgeText(count)}
        </span>
      )}
    </Link>
  );
}
