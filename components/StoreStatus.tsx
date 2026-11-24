import { REPORT_STYLES } from "@/lib/signs";
import type { StoreSign } from "@/lib/types";
import { ScheduleBadge } from "./ScheduleBadge";
import { SignChip } from "./SignChip";
import { SourceLine } from "./SourceLine";
import { TimeAgo } from "./TimeAgo";

/**
 * 가게 화면 "운영 날짜 & 영업시간" 칸의 맨 위 줄 (ADR-025). 큰 팻말 화면을 없앤 대신 여기서 한 줄로 알려 준다.
 * 오늘 알린 팻말(영업중 · 외출 중 · 재료 소진 …)이 있으면 그 팻말을 출처·시각과 함께,
 * 없으면 영업시간으로 계산한 상태를 "등록한 영업시간 기준"이라는 말과 함께 보여 준다.
 * 상태를 여기서 다시 계산하지 않는다: 팻말은 current_sign, 영업 상태는 okc_schedule_status 가 정한 값이다
 */
export function StoreStatus({ store }: { store: StoreSign }) {
  if (store.sign === "none") return <ScheduleBadge status={store.schedule_status} basis={store.schedule_basis} large />;

  const checking = store.sign === "checking";
  return (
    <div className="flex flex-col gap-2">
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <SignChip sign={store.sign} atTime={store.at_time} />
        {store.signed_at && store.source && (
          <span className="text-[13px] text-muted">
            <SourceLine source={store.source} at={store.signed_at} verb={store.source === "neighbor" ? "제보" : "알림"} />
            {checking && store.agree_count > 0 ? ` · 이웃 ${store.agree_count}명도 봤어요` : ""}
          </span>
        )}
      </span>
      {/* 확인 전 제보는 확정처럼 보이면 안 된다: 누가 무엇을 봤다고 했는지만 적는다 */}
      {checking && store.report_kind && (
        <p className="text-[15px] leading-normal">이웃이 &ldquo;{REPORT_STYLES[store.report_kind].label}&rdquo;라고 알려줬어요. 사장님께 확인하고 있어요.</p>
      )}
      {store.memo && store.signed_at && (
        <p className="flex flex-col gap-0.5 rounded-2xl bg-memo px-3.5 py-2.5">
          <span className="text-[13px] text-muted">
            {store.source === "okcheon" ? "옥천신문 쪽지" : "사장님 쪽지"} · <TimeAgo iso={store.signed_at} />
          </span>
          <span className="font-display text-lg leading-snug">{store.memo}</span>
        </p>
      )}
    </div>
  );
}
