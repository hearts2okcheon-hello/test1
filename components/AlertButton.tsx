"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ALERT_COUNT, badgeText } from "@/lib/alerts";
import { getPushState, type PushState } from "@/lib/push";

/**
 * 알림 종. 켜져 있으면 노란 종이 울리는 모양, 꺼져 있으면 빈 종에 X.
 * 선 색은 글자색(currentColor)을 따른다
 */
export function Bell({ off = false, size = 30 }: { off?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <g transform={off ? "translate(-1.6 1.6) scale(0.92)" : undefined}>
        <path d="M14 5.2v1.6" />
        <path d="M8.4 12.4a5.6 5.6 0 0 1 11.2 0v3.4l1.8 2.9H6.6l1.8-2.9z" fill={off ? "none" : "var(--color-yellow)"} />
        <path d="M11.9 21.4a2.1 2.1 0 0 0 4.2 0" />
      </g>
      {off ? (
        // 꺼짐: 종 오른쪽 위에 X
        <path d="M19.6 3.6l4.8 4.8M24.4 3.6l-4.8 4.8" strokeWidth="2.4" />
      ) : (
        // 켜짐: 양옆으로 울리는 선
        <path d="M4.9 9.2a8.6 8.6 0 0 0-1.2 3.9M23.1 9.2a8.6 8.6 0 0 1 1.2 3.9" strokeWidth="1.8" />
      )}
    </svg>
  );
}

/** 동그란 알림 버튼의 모양만 (누르는 동작은 밖에서 감싼다). 흰 바탕 대신 종이색, 켜지면 황갈색 테두리 · 꺼지면 빨간 테두리 */
export function BellFace({ on, count = 0 }: { on: boolean; count?: number }) {
  return (
    <span className={`relative flex size-12 shrink-0 items-center justify-center rounded-full border-2 bg-cream ${on ? "border-line-strong text-olive" : "border-coral text-danger"}`}>
      <Bell off={!on} />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#E5484D] px-1 text-[13px] leading-none font-bold text-white">
          {badgeText(count)}
        </span>
      )}
    </span>
  );
}

/**
 * 홈 오른쪽 위 알림 버튼. 누르면 받은 알림 목록(/alerts)으로 간다. 켜고 끄는 것도 거기서 한다
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
    <Link href="/alerts" aria-label={`${on ? "알림 켜짐" : "알림 꺼짐"}. 받은 알림 보기${count > 0 ? `, 안 읽은 알림 ${count}개` : ""}`} className="shrink-0 rounded-full">
      <BellFace on={on} count={count} />
    </Link>
  );
}
