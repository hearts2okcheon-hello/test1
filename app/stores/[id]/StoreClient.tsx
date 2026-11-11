"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Osori } from "@/components/Osori";
import { ReportSheet } from "@/components/ReportSheet";
import { TimeAgo } from "@/components/TimeAgo";
import { useToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import { REPORT_STYLES } from "@/lib/signs";
import { createClient, ensureSession } from "@/lib/supabase/client";
import type { ReportKind, StoreDetail, StoreReport } from "@/lib/types";

const THANKS = "고마워요! 이웃들에게 알리고, 사장님께도 확인을 부탁했어요. 알림을 켜 두면 사장님 답도 바로 알려 드려요.";
const THANKS_LINE = "고마워요! 이웃들에게 알렸어요.";

export function StoreClient({ detail, reported }: { detail: StoreDetail; reported?: string }) {
  const { store, reports } = detail;
  const router = useRouter();
  const { node, show } = useToast();
  const [sheet, setSheet] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const greeted = useRef(false);

  // 마을방송에서 제보하고 넘어온 경우 한 번만 인사
  useEffect(() => {
    if (!reported || greeted.current) return;
    greeted.current = true;
    show(reported === "seen_long_line" ? THANKS_LINE : THANKS, "together");
    router.replace(`/stores/${store.store_id}`, { scroll: false });
  }, [reported, router, show, store.store_id]);

  async function toggleAgree(r: StoreReport) {
    setBusyId(r.id);
    try {
      const supabase = createClient();
      await ensureSession(supabase);
      const { error } = await supabase.rpc("agree_report", { p_report_id: r.id, p_on: !r.agreed_by_me });
      if (error) throw error;
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusyId(null);
    }
  }

  function onReported(_storeId: string, kind: ReportKind) {
    setSheet(false);
    show(kind === "seen_long_line" ? THANKS_LINE : THANKS, "together");
    router.refresh();
  }

  return (
    <>
      {store.sign === "checking" && (
        <section className="flex items-center gap-2.5 rounded-[22px] border-2 border-yellow-line bg-cream px-3.5 py-3">
          <Osori mood="curious" size={48} />
          <span className="flex-1 text-[15px] leading-normal">
            <b>사장님께 확인을 부탁했어요.</b> 답이 오면 팻말이 바로 바뀌어요.
          </span>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <h2 className="font-display text-xl font-normal">오늘 이웃들의 제보</h2>
        {reports.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-[18px] border-2 border-dashed border-line px-3.5 py-2.5 text-sm text-muted">
            <Osori mood="think" size={40} />
            오늘은 아직 제보가 없어요
          </div>
        ) : (
          reports.map((r) => (
            <div
              key={r.id}
              className={`flex flex-col gap-2 rounded-[20px] border-2 border-line px-3.5 py-3 ${r.status === "pending" ? "bg-card" : "bg-card/60"}`}
            >
              <div className="flex items-center gap-2">
                <span className="flex-1 text-base font-bold">{REPORT_STYLES[r.kind].label}</span>
                <span className="text-[13px] text-muted">
                  <TimeAgo iso={r.created_at} />
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-[10px] bg-[#EFE9DF] px-2 py-0.5 text-xs font-bold text-[#6B5D52]">이웃 제보</span>
                <ReportOutcome r={r} />
              </div>
              {r.status === "pending" &&
                (r.is_mine ? (
                  <span className="text-[13px] text-muted">내가 알린 제보예요</span>
                ) : (
                  <button
                    type="button"
                    aria-pressed={r.agreed_by_me}
                    disabled={busyId === r.id}
                    onClick={() => toggleAgree(r)}
                    className={`min-h-10 self-start rounded-[14px] border-2 px-3.5 text-sm font-bold ${r.agreed_by_me ? "border-sage-deep bg-sage-soft" : "border-line bg-white"}`}
                  >
                    나도 봤어요 {r.agree_count}
                  </button>
                ))}
            </div>
          ))
        )}
      </section>

      <div className="sticky bottom-0 z-20 -mx-[18px] mt-auto bg-paper px-[18px] pt-2.5 pb-[max(18px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => setSheet(true)}
          className="min-h-[58px] w-full rounded-[22px] border-2 border-sage-deep bg-sage font-display text-xl text-white"
        >
          지나가다 봤어요, 알려주기
        </button>
      </div>

      {sheet && (
        <ReportSheet
          stores={[{ store_id: store.store_id, name: store.name }]}
          initialStoreId={store.store_id}
          onClose={() => setSheet(false)}
          onDone={onReported}
        />
      )}
      {node}
    </>
  );
}

function ReportOutcome({ r }: { r: StoreReport }) {
  const who = r.resolved_source === "okcheon" ? "옥천신문이" : "사장님이";
  if (r.status === "confirmed") return <span className="text-[13px] font-bold text-[#4E6E44]">{who} 맞다고 했어요</span>;
  if (r.status === "rejected") return <span className="text-[13px] font-bold text-[#A4423F]">{who} 아니라고 했어요</span>;
  if (r.status === "expired") return <span className="text-[13px] text-muted">시간이 지나 끝난 제보</span>;
  if (r.kind === "seen_long_line") return <span className="text-[13px] text-muted">1시간 동안 보여요</span>;
  return <span className="text-[13px] font-bold text-[#715212]">확인 중</span>;
}
