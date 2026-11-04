import { SIGN_STYLES, REPORT_STYLES, signTitle } from "@/lib/signs";
import { todayHours } from "@/lib/time";
import type { StoreSign } from "@/lib/types";
import { Osori } from "./Osori";
import { SourceLine } from "./SourceLine";
import { TimeAgo } from "./TimeAgo";

/** 가게 상세의 큰 팻말 + 사장님 쪽지 */
export function SignBoard({ store }: { store: StoreSign }) {
  const s = SIGN_STYLES[store.sign];
  const hours = todayHours(store.regular_hours);
  return (
    <>
      <section className="flex flex-col items-center">
        <Osori mood={s.mood} size={130} alt={s.moodAlt} className="ok-bob relative z-10 -mb-3.5" />
        <div
          className="flex w-full flex-col items-center gap-1 rounded-[26px] border-2 px-4 pt-[22px] pb-4 text-center"
          style={{ background: s.bg, borderColor: s.border, borderStyle: store.sign === "checking" ? "dashed" : "solid" }}
        >
          <span className="font-display text-[34px] leading-tight" style={{ color: s.fg }}>
            {signTitle(store.sign, store.at_time)}
          </span>
          {store.sign === "checking" && store.report_kind && (
            <span className="text-[15px] font-bold" style={{ color: s.fg }}>
              이웃이 &ldquo;{REPORT_STYLES[store.report_kind].label}&rdquo;라고 알려줬어요
            </span>
          )}
          {hours && <span className="text-sm text-[#6B5D52]">{hours}</span>}
          {store.signed_at && store.source && (
            <span className="mt-1.5 rounded-xl bg-card px-3 py-1 text-[13px]">
              <SourceLine source={store.source} at={store.signed_at} verb={store.source === "neighbor" ? "제보" : "알림"} />
              {store.sign === "checking" && store.agree_count > 0 ? ` · 이웃 ${store.agree_count}명도 봤어요` : ""}
            </span>
          )}
        </div>
      </section>

      {store.memo && store.signed_at && (
        <section className="relative flex -rotate-1 flex-col gap-1 rounded-lg bg-memo px-4 pt-[18px] pb-3.5 shadow-[0_3px_8px_rgba(110,85,50,0.14)]">
          <span className="absolute -top-2 left-1/2 h-4 w-[70px] -translate-x-1/2 bg-white/75" aria-hidden />
          <span className="text-[13px] text-muted">
            {store.source === "okcheon" ? "옥천신문 쪽지" : "사장님 쪽지"} · <TimeAgo iso={store.signed_at} />
          </span>
          <span className="font-display text-xl leading-snug">{store.memo}</span>
        </section>
      )}
    </>
  );
}
