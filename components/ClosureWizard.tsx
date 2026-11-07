"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addMonth, monthGrid, pickRange, seoulToday } from "@/lib/calendar";
import { errorMessage } from "@/lib/errors";
import { pushWithLoading } from "@/lib/nav";
import { formatRange } from "@/lib/signs";
import { createClient } from "@/lib/supabase/client";
import { Osori } from "./Osori";
import { useToast } from "./Toast";

const REASON_MAX = 200;
const REASON_CHIPS = ["가족 행사", "개인 사정", "가게 공사", "병원 진료"];
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

/** 달력에서 언제부터 언제까지 고르고, 다음 화면에서 사유를 쓴다 */
export function ClosureWizard({ storeId, storeName }: { storeId: string; storeName: string }) {
  const router = useRouter();
  const { node, show } = useToast();
  const today = seoulToday();
  const [ym, setYm] = useState<[number, number]>(() => {
    const [y, m] = today.split("-").map(Number);
    return [y, m];
  });
  const [range, setRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [step, setStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [y, m] = ym;
  const end = range.end ?? range.start;

  async function submit() {
    if (!range.start || !end) return;
    setBusy(true);
    try {
      const { error } = await createClient().rpc("set_temp_closure", {
        p_store_id: storeId,
        p_start: range.start,
        p_end: end,
        p_reason: reason.trim() || null,
      });
      if (error) throw error;
      pushWithLoading(router, "/owner");
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
      setBusy(false);
    }
  }

  if (step === 2 && range.start && end) {
    return (
      <>
        <header className="flex items-center gap-2.5">
          <Osori mood="rest" size={76} />
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-base text-muted">{formatRange(range.start, end)}</span>
            <h1 className="font-display text-[26px] leading-tight font-normal">왜 쉬시나요?</h1>
          </div>
        </header>
        <p className="text-lg text-muted">간단히 알려 주시면 이웃들이 궁금해하지 않아요. 안 쓰셔도 괜찮아요.</p>
        <div className="flex flex-wrap gap-2">
          {REASON_CHIPS.map((c) => (
            <button key={c} type="button" onClick={() => setReason(c)} className={`min-h-12 rounded-[22px] border-2 px-4 text-base font-bold ${reason === c ? "border-yellow-deep bg-yellow" : "border-line bg-card"}`}>
              {c}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-lg font-bold">사유</span>
          <textarea value={reason} maxLength={REASON_MAX} rows={3} onChange={(e) => setReason(e.target.value)} placeholder="예: 가족 여행으로 쉬어요" className="w-full rounded-2xl border-2 border-line bg-white p-3.5 text-lg leading-relaxed" />
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setStep(1)} className="min-h-16 shrink-0 rounded-[22px] border-2 border-line bg-card px-4 text-lg font-bold">
            날짜 다시 고르기
          </button>
          <button type="button" disabled={busy} onClick={submit} className="min-h-16 flex-1 rounded-[22px] border-2 border-sage-deep bg-sage font-display text-xl text-white disabled:opacity-60">
            {busy ? "올리는 중…" : "임시휴무 알리기"}
          </button>
        </div>
        {node}
      </>
    );
  }

  const prevDisabled = `${y}-${String(m).padStart(2, "0")}` <= today.slice(0, 7);

  return (
    <>
      <header className="flex items-center gap-2.5">
        <Osori mood="rest" size={76} />
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-base text-muted">{storeName}</span>
          <h1 className="font-display text-[26px] leading-tight font-normal">언제 쉬시나요?</h1>
        </div>
      </header>
      <p className="text-lg text-muted">{!range.start ? "시작하는 날을 눌러 주세요." : !range.end ? "끝나는 날을 눌러 주세요. 하루만 쉬시면 같은 날을 한 번 더요." : `${formatRange(range.start, range.end)}을(를) 골랐어요.`}</p>

      <section className="flex flex-col gap-2 rounded-[22px] border-2 border-line bg-card p-3">
        <div className="flex items-center">
          <button type="button" aria-label="이전 달" disabled={prevDisabled} onClick={() => setYm(addMonth(y, m, -1))} className="flex size-12 items-center justify-center rounded-full border-2 border-line bg-white text-xl font-bold disabled:opacity-30">
            ‹
          </button>
          <span className="flex-1 text-center font-display text-[21px]" aria-live="polite">
            {y}년 {m}월
          </span>
          <button type="button" aria-label="다음 달" onClick={() => setYm(addMonth(y, m, 1))} className="flex size-12 items-center justify-center rounded-full border-2 border-line bg-white text-xl font-bold">
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {WEEK.map((w, i) => (
            <span key={w} className={`py-1 text-base font-bold ${i === 0 ? "text-[#A4423F]" : "text-muted"}`}>
              {w}
            </span>
          ))}
          {monthGrid(y, m).map((day, i) => {
            if (!day) return <span key={`e${i}`} />;
            const past = day < today;
            const isEdge = day === range.start || day === range.end;
            const inRange = !!range.start && !!range.end && day > range.start && day < range.end;
            return (
              <button
                key={day}
                type="button"
                disabled={past}
                aria-pressed={isEdge || inRange}
                aria-label={day}
                onClick={() => setRange((cur) => pickRange(cur, day))}
                className={`min-h-12 text-lg font-bold disabled:font-normal disabled:text-line ${isEdge ? "rounded-xl bg-yellow-deep text-ink" : inRange ? "bg-yellow-soft" : ""} ${day === today && !isEdge ? "rounded-xl border-2 border-sage-deep" : ""}`}
              >
                {Number(day.slice(-2))}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex gap-2">
        <button type="button" onClick={() => pushWithLoading(router, "/owner")} className="min-h-16 shrink-0 rounded-[22px] border-2 border-line bg-card px-4 text-lg font-bold">
          취소
        </button>
        <button
          type="button"
          disabled={!range.start}
          onClick={() => setStep(2)}
          className="min-h-16 flex-1 rounded-[22px] border-2 border-sage-deep bg-sage font-display text-xl text-white disabled:border-line disabled:bg-[#EFE9DF] disabled:text-muted"
        >
          {range.start ? "다음으로" : "날짜를 골라 주세요"}
        </button>
      </div>
      {node}
    </>
  );
}
