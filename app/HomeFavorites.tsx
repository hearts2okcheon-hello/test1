"use client";

import Link from "next/link";
import { FavoriteStar } from "@/components/FavoriteStar";
import { StoreLogo } from "@/components/StoreCard";
import { ScheduleBadge } from "@/components/ScheduleBadge";
import { SignChip } from "@/components/SignChip";
import { TimeAgo } from "@/components/TimeAgo";
import { useFavoriteStores } from "@/lib/favorites";
import type { StoreSign } from "@/lib/types";

/**
 * 홈 "즐겨찾는 가게". 별을 누른 가게가 있을 때만 나오고, 가게마다 지금 팻말을 한눈에 보여 준다.
 * 즐겨찾는 가게가 없으면 아무것도 그리지 않는다. 가게들이 올린 소식은 위의 "실시간 가게소식"에서 본다 (ADR-022).
 * 같은 목록을 내 공간의 "즐겨찾는 가게"에서도 볼 수 있다
 */
export function HomeFavorites({ stores, initialIds }: { stores: StoreSign[]; initialIds: string[] }) {
  const list = useFavoriteStores(stores, initialIds);
  if (list.length === 0) return null;

  return (
    <section aria-labelledby="fav-title" className="flex flex-col gap-2.5">
      <h2 id="fav-title" className="flex items-center gap-1.5 font-display text-[19px] font-normal">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill="#F5C96A" stroke="#D9A43A" strokeWidth="2" strokeLinejoin="round">
          <path d="M12 3.2l2.7 5.5 6 .9-4.35 4.25 1 6L12 17l-5.35 2.85 1-6L3.3 9.6l6-.9z" />
        </svg>
        즐겨찾는 가게
      </h2>
      <div className="grid grid-cols-2 gap-2.5 min-[560px]:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
        {list.map((s) => (
          <div key={s.store_id} className="relative">
            {/* 이름 길이·소식 유무와 상관없이 카드 크기가 같다 */}
            <Link href={`/stores/${s.store_id}`} className="ok-sticker flex h-[116px] flex-col items-start justify-between rounded-[20px] border-2 border-line bg-card py-3 pr-3 pl-3.5">
              <span className="flex w-full items-center gap-2 pr-6">
                <StoreLogo store={s} size={36} />
                <span className="min-w-0 truncate font-display text-[17px] leading-snug">{s.name}</span>
              </span>
              <span className="flex h-7 items-center">{s.sign === "none" ? <ScheduleBadge status={s.schedule_status} /> : <SignChip sign={s.sign} atTime={s.at_time} />}</span>
              <span className="h-4 text-[12px] leading-4 text-muted">{s.signed_at && s.sign !== "none" ? <TimeAgo iso={s.signed_at} /> : s.schedule_basis === "hours" ? "등록한 영업시간 기준" : ""}</span>
            </Link>
            <FavoriteStar storeId={s.store_id} storeName={s.name} size={20} initialOn className="absolute top-0 right-0" />
          </div>
        ))}
      </div>
    </section>
  );
}
