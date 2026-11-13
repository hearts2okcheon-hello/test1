"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AppAlertCard } from "@/components/AppAlertCard";
import { FavoriteStar } from "@/components/FavoriteStar";
import { StoreLogo } from "@/components/StoreCard";
import { ScheduleBadge } from "@/components/ScheduleBadge";
import { SignChip } from "@/components/SignChip";
import { TimeAgo } from "@/components/TimeAgo";
import { seedFavorites, useFavorites } from "@/lib/favorites";
import type { StoreSign } from "@/lib/types";

/** 홈 "즐겨찾는 가게": 별을 누른 가게의 지금 팻말을 한눈에 */
export function HomeFavorites({ stores, initialIds }: { stores: StoreSign[]; initialIds: string[] }) {
  useEffect(() => seedFavorites(initialIds), [initialIds]);
  const favs = useFavorites();
  const ids = favs.ready ? favs.ids : new Set(initialIds);
  const byId = new Map(stores.map((s) => [s.store_id, s]));
  const order = [...initialIds, ...[...ids].filter((id) => !initialIds.includes(id))];
  const list = order.filter((id) => ids.has(id)).map((id) => byId.get(id)).filter((s): s is StoreSign => !!s);

  return (
    <section aria-labelledby="fav-title" className="flex flex-col gap-2.5">
      <h2 id="fav-title" className="flex items-center gap-1.5 font-display text-[22px] font-normal">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill="#F5C96A" stroke="#D9A43A" strokeWidth="2" strokeLinejoin="round">
          <path d="M12 3.2l2.7 5.5 6 .9-4.35 4.25 1 6L12 17l-5.35 2.85 1-6L3.3 9.6l6-.9z" />
        </svg>
        즐겨찾는 가게
      </h2>
      {list.length === 0 ? (
        <p className="rounded-[20px] border-2 border-dashed border-line px-4 py-3 text-[15px] leading-normal text-muted">
          가게 화면 오른쪽 위 <b className="text-ink">☆</b>을 누르면 여기에 모여요. 문 열었는지, 재료가 떨어졌는지 바로 볼 수 있어요.
        </p>
      ) : (
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
      )}
      {list.length > 0 && <AppAlertCard who="resident" />}
    </section>
  );
}
