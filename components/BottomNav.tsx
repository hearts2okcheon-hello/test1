"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "홈", match: (p: string) => p === "/" || p.startsWith("/stores"), paths: ["M4 11l8-7 8 7v9H4z", "M10 20v-5h4v5"] },
  { href: "/news", label: "소통광장", match: (p: string) => p.startsWith("/news"), paths: ["M4 5h13v14H6a2 2 0 0 1-2-2z", "M17 9h3v8a2 2 0 0 1-2 2", "M8 9h5", "M8 13h5"] },
  { href: "/owner", label: "내 정보", match: (p: string) => p.startsWith("/owner"), paths: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4.5 20a7.5 7.5 0 0 1 15 0"] },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="메뉴" className="sticky bottom-0 z-40 border-t-2 border-line bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid h-[72px] max-w-[640px] grid-cols-3">
        {TABS.map((t) => {
          const on = t.match(path);
          return (
            <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className={`flex flex-col items-center justify-center gap-[3px] font-display text-sm ${on ? "text-sage-deep" : "text-muted"}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {t.paths.map((d) => <path key={d} d={d} />)}
              </svg>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
