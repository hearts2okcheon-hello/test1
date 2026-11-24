"use client";

import { useFavoriteStores } from "@/lib/favorites";
import type { StoreSign } from "@/lib/types";
import { Osori } from "./Osori";
import { StoreCard } from "./StoreCard";

/**
 * 내 공간의 "즐겨찾는 가게" 목록. 별을 누른 가게를 가게 칸으로 보여 준다.
 * 여기서 별을 다시 누르면 목록에서 바로 빠진다
 */
export function FavoriteList({ stores, initialIds }: { stores: StoreSign[]; initialIds: string[] }) {
  const list = useFavoriteStores(stores, initialIds);

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2.5 rounded-[22px] border-2 border-dashed border-line px-4 py-7 text-center">
        <Osori mood="find" size={96} />
        <p className="font-display text-lg">아직 즐겨찾는 가게가 없어요</p>
        <p className="text-base leading-normal text-muted">
          가게 칸이나 가게 화면의 <b className="text-ink">☆</b>을 누르면 여기에 모여요.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="text-base text-muted">
        모두 <b className="text-ink">{list.length}곳</b>
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] items-start gap-3">
        {list.map((s) => (
          <StoreCard key={s.store_id} store={s} />
        ))}
      </div>
    </>
  );
}
