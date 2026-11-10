import Link from "next/link";
import { categoryById, categoryOf } from "@/lib/categories";
import { REPORT_STYLES, SCHEDULE_BASIS } from "@/lib/signs";
import { todayHours } from "@/lib/time";
import type { StoreSign } from "@/lib/types";
import { FavoriteStar } from "./FavoriteStar";
import { ScheduleBadge } from "./ScheduleBadge";
import { SignChip } from "./SignChip";
import { SourceLine } from "./SourceLine";

/** 가게 한 줄: 대표 사진(없으면 첫 글자) · 이름 · 팻말 */
export function StoreCard({ store, extra }: { store: StoreSign; extra?: string }) {
  const c = categoryById(categoryOf(store.category))!;
  return (
    <div className="relative">
    <Link href={`/stores/${store.store_id}`} className="ok-sticker flex min-h-[78px] w-full items-center gap-3.5 rounded-[22px] border-2 border-line bg-card py-3.5 pr-11 pl-4 text-left">
      <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl font-display text-lg" style={{ background: c.bg, color: c.fg }}>
        {store.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.cover_url} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          store.name.charAt(0)
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 font-display text-[19px] break-words">{store.name}</span>
          {store.sign === "none" ? <ScheduleBadge status={store.schedule_status} /> : <SignChip sign={store.sign} atTime={store.at_time} />}
        </span>
        <span className="line-clamp-2 text-[13px] leading-snug text-muted">
          <StoreNote store={store} />
          {extra}
        </span>
      </span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-line-strong)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
        <path d="M9 6l6 6-6 6" />
      </svg>
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
