"use client";

import Link from "next/link";
import { useEffect } from "react";
import { FavoriteStar } from "@/components/FavoriteStar";
import { StoreLogo } from "@/components/StoreCard";
import { ScheduleBadge } from "@/components/ScheduleBadge";
import { SignChip } from "@/components/SignChip";
import { TimeAgo } from "@/components/TimeAgo";
import { seedFavorites, useFavorites } from "@/lib/favorites";
import { favoriteFeed } from "@/lib/homeTabs";
import { feedLine } from "@/lib/signs";
import type { FeedItem, StoreSign } from "@/lib/types";

/** 즐겨찾는 가게가 올린 소식은 이만큼만 보여 준다 (나머지는 소통광장에서) */
const NEWS_LIMIT = 10;

/**
 * 홈 "즐겨찾는 가게" (ADR-017). 별을 누른 가게가 있을 때만 나온다.
 * 그 가게가 오늘 소식을 올리면 맨 위에 글이 보이고, 아래에는 가게마다 지금 팻말을 보여 준다.
 * 즐겨찾는 가게가 없으면 아무것도 그리지 않아서 홈에는 전체 가게만 남는다
 */
export function HomeFavorites({ stores, feed, initialIds }: { stores: StoreSign[]; feed: FeedItem[]; initialIds: string[] }) {
  useEffect(() => seedFavorites(initialIds), [initialIds]);
  const favs = useFavorites();
  const ids = favs.ready ? favs.ids : new Set(initialIds);
  const byId = new Map(stores.map((s) => [s.store_id, s]));
  const order = [...initialIds, ...[...ids].filter((id) => !initialIds.includes(id))];
  const list = order.filter((id) => ids.has(id)).map((id) => byId.get(id)).filter((s): s is StoreSign => !!s);
  if (list.length === 0) return null;

  const news = favoriteFeed(feed, list.map((s) => s.store_id)).slice(0, NEWS_LIMIT);

  return (
    <section aria-labelledby="fav-title" className="flex flex-col gap-2.5">
      <h2 id="fav-title" className="flex items-center gap-1.5 font-display text-[19px] font-normal">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill="#F5C96A" stroke="#D9A43A" strokeWidth="2" strokeLinejoin="round">
          <path d="M12 3.2l2.7 5.5 6 .9-4.35 4.25 1 6L12 17l-5.35 2.85 1-6L3.3 9.6l6-.9z" />
        </svg>
        즐겨찾는 가게
      </h2>

      {news.length > 0 && (
        <ul aria-label="즐겨찾는 가게가 올린 소식" className="ok-sticker flex flex-col rounded-[22px] border-2 border-line bg-card px-4">
          {news.map((f, i) => (
            <li key={`${f.item_type}-${f.item_id}`} className={i > 0 ? "border-t-2 border-line" : ""}>
              <Link href={f.item_type === "post" ? `/stores/${f.store_id}/posts/${f.item_id}` : `/stores/${f.store_id}`} className="flex flex-col gap-0.5 py-3">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-display text-base">{f.store_name}</span>
                  <span className="shrink-0 text-[13px] text-muted">
                    {f.source === "owner" ? "사장님" : "옥천신문"} · <TimeAgo iso={f.created_at} />
                  </span>
                </span>
                <span className="line-clamp-2 text-[15px] leading-snug">{feedLine(f)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

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
