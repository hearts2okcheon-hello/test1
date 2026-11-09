"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MEGAPHONE = "M3 10v4h4l6 5V5L7 10zM17 9a4 4 0 0 1 0 6";
const STORE = "M3 10l2-5h14l2 5M3 10c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3M5 13v7h14v-7";

// 동네 가게 = 내 가게 + 마을방송
function NeighborIcon() {
  return (
    <svg width="30" height="26" viewBox="0 0 34 28" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={STORE} strokeWidth="2.2" transform="translate(0 4)" />
      <path d={MEGAPHONE} strokeWidth="3.4" transform="translate(21 0) scale(.55)" />
    </svg>
  );
}

function PlainIcon({ d, size }: { d: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function BottomNav() {
  const path = usePathname();
  const onHome = path === "/";
  const onStores = path.startsWith("/stores");
  const onOwner = path.startsWith("/owner");
  const side = (on: boolean) => `flex min-h-14 flex-1 flex-col items-center justify-center gap-[3px] rounded-[18px] text-xs font-bold ${on ? "bg-yellow-soft text-ink" : "text-muted"}`;

  return (
    <nav aria-label="메뉴" className="sticky bottom-0 z-40 flex items-end gap-1 border-t-2 border-line bg-card px-3 pt-2 pb-[max(16px,env(safe-area-inset-bottom))]">
      <Link href="/stores" aria-current={onStores ? "page" : undefined} className={side(onStores)}>
        <NeighborIcon />
        동네 가게
      </Link>
      {/* 마을방송이 홈이라 가운데에 가장 크게 */}
      <Link href="/" aria-current={onHome ? "page" : undefined} className="-mt-7 flex flex-[1.25] flex-col items-center gap-1 font-display text-[15px] text-ink">
        <span className={`flex size-[68px] items-center justify-center rounded-full border-2 ${onHome ? "border-yellow-deep bg-yellow" : "border-line bg-yellow-soft"}`}>
          <PlainIcon d={MEGAPHONE} size={36} />
        </span>
        마을방송
      </Link>
      <Link href="/owner" aria-current={onOwner ? "page" : undefined} className={side(onOwner)}>
        <PlainIcon d={STORE} size={24} />
        내 가게
      </Link>
    </nav>
  );
}
