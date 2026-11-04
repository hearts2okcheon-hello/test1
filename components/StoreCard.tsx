import Link from "next/link";
import { REPORT_STYLES, SIGN_STYLES } from "@/lib/signs";
import { todayHours } from "@/lib/time";
import type { StoreSign } from "@/lib/types";
import { Osori } from "./Osori";
import { SignChip } from "./SignChip";
import { SourceLine } from "./SourceLine";

/** 마을방송 목록의 가게 한 줄 */
export function StoreCard({ store }: { store: StoreSign }) {
  const s = SIGN_STYLES[store.sign];
  return (
    <Link
      href={`/stores/${store.store_id}`}
      className="flex min-h-[78px] w-full items-center gap-2.5 rounded-[22px] border-2 border-line bg-card py-2 pr-3 pl-2 text-left"
    >
      <span className="flex size-[60px] shrink-0 items-center justify-center overflow-hidden rounded-[18px]" style={{ background: s.bg }}>
        <Osori mood={s.mood} size={54} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[17px] font-bold">{store.name}</span>
        <span className="line-clamp-2 text-[13px] leading-snug text-muted">
          <StoreNote store={store} />
        </span>
      </span>
      <SignChip sign={store.sign} atTime={store.at_time} />
    </Link>
  );
}

function StoreNote({ store }: { store: StoreSign }) {
  if (store.sign === "none") {
    return <>{todayHours(store.regular_hours) ?? "평소 영업시간 정보 없음"}</>;
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
