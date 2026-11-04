"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// MVP 탭은 둘. 동네지도·옥천소식은 확장 단계에서 추가 (brd §7)
const TABS = [
  { href: "/", label: "마을방송", icon: <path d="M3 10v4h4l6 5V5L7 10zM17 9a4 4 0 0 1 0 6" /> },
  {
    href: "/owner",
    label: "내 가게",
    icon: <path d="M3 10l2-5h14l2 5M3 10c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3M5 13v7h14v-7" />,
  },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="메뉴" className="sticky bottom-0 z-40 flex gap-1 border-t-2 border-line bg-card px-3 pt-2 pb-[max(16px,env(safe-area-inset-bottom))]">
      {TABS.map((t) => {
        const on = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-[3px] rounded-[18px] text-xs font-bold ${on ? "bg-yellow-soft text-ink" : "text-muted"}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {t.icon}
            </svg>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
