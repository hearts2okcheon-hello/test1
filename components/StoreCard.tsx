import Link from "next/link";
import { categoryById, categoryOf } from "@/lib/categories";
import { REPORT_STYLES, SCHEDULE_BASIS } from "@/lib/signs";
import { todayHours } from "@/lib/time";
import type { StoreSign } from "@/lib/types";
import { FavoriteStar } from "./FavoriteStar";
import { ScheduleBadge } from "./ScheduleBadge";
import { SignChip } from "./SignChip";
import { SourceLine } from "./SourceLine";

const TILES = 3;

/** 가게 프로필 동그라미: 올린 프로필 사진, 없으면 가게 이름 첫 글자 */
export function StoreLogo({ store, size = 48 }: { store: Pick<StoreSign, "name" | "category" | "logo_url">; size?: number }) {
  const c = categoryById(categoryOf(store.category))!;
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-line font-display text-lg" style={{ width: size, height: size, background: c.bg, color: c.fg }}>
      {store.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={store.logo_url} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        store.name.charAt(0)
      )}
    </span>
  );
}

/**
 * 가게 카드: 프로필 동그라미 · 이름 · 팻말 한 줄, 그 아래 가게·메뉴 사진 세 칸.
 * 사진이 있든 없든, 이름이 길든 짧든 카드 크기가 같다
 */
export function StoreCard({ store, extra }: { store: StoreSign; extra?: string }) {
  const photos = (store.card_photos ?? []).slice(0, TILES);
  const c = categoryById(categoryOf(store.category))!;
  return (
    <div className="relative">
      <Link href={`/stores/${store.store_id}`} className="ok-sticker flex w-full flex-col gap-2.5 rounded-[22px] border-2 border-line bg-card px-3.5 pt-3.5 pb-3 text-left">
        <span className="flex h-[52px] items-center gap-3 pr-8">
          <StoreLogo store={store} />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-center gap-2">
              <span className="min-w-0 truncate font-display text-[19px] leading-tight">{store.name}</span>
              <span className="shrink-0">{store.sign === "none" ? <ScheduleBadge status={store.schedule_status} /> : <SignChip sign={store.sign} atTime={store.at_time} />}</span>
            </span>
            <span className="truncate text-[13px] leading-snug text-muted">
              <StoreNote store={store} />
              {extra}
            </span>
          </span>
        </span>
        <span className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: TILES }, (_, i) =>
            photos[i] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={photos[i]} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-xl border border-line object-cover" />
            ) : (
              <span key={i} aria-hidden className="flex aspect-[4/3] w-full items-center justify-center rounded-xl text-[12px]" style={{ background: c.bg, color: c.fg, opacity: 0.55 }}>
                {i === photos.length && photos.length === 0 ? "사진 준비 중" : ""}
              </span>
            ),
          )}
        </span>
      </Link>
      <FavoriteStar storeId={store.store_id} storeName={store.name} size={22} className="absolute top-0.5 right-0.5" />
    </div>
  );
}

function StoreNote({ store }: { store: StoreSign }) {
  if (store.sign === "none") {
    return <>{todayHours(store.regular_hours) ?? "평소 영업시간 정보 없음"}{store.schedule_status === "open" ? ` · ${SCHEDULE_BASIS.hours}` : ""}</>;
  }
  if (store.sign === "checking" && store.signed_at) {
    return (
      <>
        <SourceLine source="neighbor" at={store.signed_at} verb="제보" />
        {store.report_kind ? ` · ${REPORT_STYLES[store.report_kind].label}` : ""}
      </>
    );
  }
  if (store.source && store.signed_at) {
    return (
      <>
        <SourceLine source={store.source} at={store.signed_at} />
        {store.memo ? ` · ${store.memo}` : ""}
      </>
    );
  }
  return null;
}
