"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addMonth, monthGrid, seoulToday } from "@/lib/calendar";
import { askDelete } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { closureOn, dayLabel, dayLine, dayTone, lastPlanDay, planText, type DayTone } from "@/lib/plans";
import { MEMO_MAX, formatRange } from "@/lib/signs";
import { createClient } from "@/lib/supabase/client";
import type { DayPlan, RegularHours, TempClosure } from "@/lib/types";
import { useToast } from "./Toast";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const TONE_TEXT: Record<DayTone, string> = { closed: "text-[#C8403D]", plan: "text-blue", normal: "text-ink" };

type Kind = "closed" | "late_open" | "early_close" | "out";
const KINDS: { id: Kind; label: string }[] = [
  { id: "closed", label: "휴무" },
  { id: "late_open", label: "늦게 열어요" },
  { id: "early_close", label: "일찍 닫아요" },
  { id: "out", label: "외출" },
];
const TIME_INPUT = "min-h-14 w-full min-w-0 rounded-2xl border-2 border-line bg-white px-3 text-lg";

/** 오늘부터 한 달: 날짜를 누르고 그날 휴무·늦게 열기·일찍 닫기·외출을 넣는다. 휴무 빨강 · 일정 파랑 · 평소 검정 */
export function OwnerCalendar({ storeId, storeName, hours, closures, plans }: { storeId: string; storeName: string; hours: RegularHours | null; closures: TempClosure[]; plans: DayPlan[] }) {
  const router = useRouter();
  const { node, show } = useToast();
  const today = seoulToday();
  const last = lastPlanDay(today);
  const [day, setDay] = useState(today);
  const [kind, setKind] = useState<Kind | null>(null);
  const [from, setFrom] = useState("11:00");
  const [to, setTo] = useState("17:00");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // 오늘이 든 달부터 마지막 날이 든 달까지
  const months: [number, number][] = [];
  const [ty, tm] = today.split("-").map(Number);
  const [ly, lm] = last.split("-").map(Number);
  for (let ym: [number, number] = [ty, tm]; ym[0] * 12 + ym[1] <= ly * 12 + lm; ym = addMonth(ym[0], ym[1], 1)) months.push(ym);

  const closure = closureOn(closures, day);
  const dayPlans = plans.filter((p) => p.day === day);
  const line = dayLine(day, hours, closures, plans);

  function pick(d: string) {
    setDay(d);
    setKind(null);
    setNote("");
  }

  async function run(action: () => PromiseLike<{ error: unknown }>, done: string) {
    setBusy(true);
    try {
      const { error } = await action();
      if (error) throw error;
      show(done, "proud");
      setKind(null);
      setNote("");
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!kind) return;
    if (kind === "out" && from >= to) return show("돌아오는 시각이 나가는 시각보다 뒤여야 해요.", "think");
    run(
      () =>
        createClient().rpc("set_day_plan", {
          p_store_id: storeId,
          p_day: day,
          p_kind: kind,
          p_start: kind === "late_open" || kind === "out" ? from : null,
          p_end: kind === "early_close" || kind === "out" ? to : null,
          p_note: note.trim() || null,
        }),
      `${dayLabel(day)} 일정을 넣었어요.`,
    );
  }

  function cancelClosure(c: TempClosure) {
    if (!window.confirm(`${formatRange(c.start_date, c.end_date)} 휴무를 취소할까요?`)) return;
    run(() => createClient().rpc("cancel_temp_closure", { p_closure_id: c.id }), "휴무를 취소했어요.");
  }

  async function removePlan(p: DayPlan) {
    if (!(await askDelete({ detail: `${dayLabel(p.day)} ${planText(p)}` }))) return;
    run(() => createClient().rpc("clear_day_plan", { p_plan_id: p.id }), "일정을 지웠어요.");
  }

  return (
    <>
      <Link href="/owner/store" className="flex min-h-12 w-fit items-center gap-1.5 rounded-2xl border-2 border-line bg-card px-3.5 text-base font-bold">
        <span aria-hidden>‹</span> 뒤로
      </Link>
      <header className="flex flex-col gap-0.5">
        <span className="text-base text-muted">{storeName}</span>
        <h1 className="font-display text-[26px] leading-tight font-normal">캘린더에 일정 넣기</h1>
        <p className="text-lg text-muted">날짜를 누르고 그날 일정을 골라 주세요. 오늘부터 한 달 뒤까지 넣을 수 있어요.</p>
      </header>

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-base font-bold" aria-label="색 설명">
        <span className={TONE_TEXT.closed}>● 휴무</span>
        <span className={TONE_TEXT.plan}>● 일정 있음</span>
        <span className={TONE_TEXT.normal}>● 평소대로</span>
      </p>

      {months.map(([y, m]) => (
        <section key={`${y}-${m}`} className="flex flex-col gap-2 rounded-[22px] border-2 border-line bg-card p-3">
          <h2 className="text-center font-display text-[21px] font-normal">
            {y}년 {m}월
          </h2>
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEK.map((w) => (
              <span key={w} className="py-1 text-base font-bold text-muted">
                {w}
              </span>
            ))}
            {monthGrid(y, m).map((d, i) => {
              if (!d) return <span key={`e${i}`} />;
              const off = d < today || d > last;
              const tone = dayTone(d, hours, closures, plans);
              const on = d === day;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={off}
                  aria-pressed={on}
                  aria-label={`${dayLabel(d)} ${tone === "closed" ? "휴무" : tone === "plan" ? "일정 있음" : "평소대로"}`}
                  onClick={() => pick(d)}
                  className={`min-h-12 rounded-xl text-lg font-bold disabled:font-normal disabled:text-line ${off ? "" : TONE_TEXT[tone]} ${on ? "bg-yellow ring-2 ring-yellow-deep" : d === today ? "border-2 border-sage-deep" : ""}`}
                >
                  {Number(d.slice(-2))}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <section aria-live="polite" className="flex flex-col gap-3 rounded-[22px] border-2 border-line bg-card px-3.5 py-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-[23px] font-normal">{dayLabel(day)}</h2>
          <p className={`text-lg font-bold ${TONE_TEXT[line.tone]}`}>{line.text}</p>
          {line.note && <p className="text-base text-muted">{line.note}</p>}
        </div>

        {closure ? (
          <button type="button" disabled={busy} onClick={() => cancelClosure(closure)} className="min-h-16 rounded-[20px] border-2 border-line bg-white text-lg font-bold text-[#A4423F] disabled:opacity-60">
            {closure.start_date === closure.end_date ? "이날 휴무 취소하기" : `${formatRange(closure.start_date, closure.end_date)} 휴무 취소하기`}
          </button>
        ) : (
          <>
            {dayPlans.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-2xl border-2 border-line bg-white px-3 py-2">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-lg font-bold text-blue">{planText(p)}</span>
                  {p.note && <span className="text-base text-muted">{p.note}</span>}
                </span>
                <button type="button" disabled={busy} onClick={() => removePlan(p)} className="min-h-12 shrink-0 rounded-2xl border-2 border-line bg-card px-3.5 text-base font-bold text-[#A4423F]">
                  지우기
                </button>
              </div>
            ))}

            <div className="flex flex-col gap-2">
              <span className="text-lg font-bold">이날 무엇을 알릴까요?</span>
              <div className="grid grid-cols-2 gap-2">
                {KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    aria-pressed={kind === k.id}
                    onClick={() => setKind(k.id)}
                    className={`min-h-16 rounded-[20px] border-2 text-lg font-bold ${kind === k.id ? "border-sage-deep bg-sage-soft text-sage-deep" : "border-line bg-white"}`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            {kind && (
              <>
                {(kind === "late_open" || kind === "out") && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-lg font-bold">{kind === "out" ? "몇 시에 나가세요?" : "몇 시에 여세요?"}</span>
                    <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} className={TIME_INPUT} />
                  </label>
                )}
                {(kind === "early_close" || kind === "out") && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-lg font-bold">{kind === "out" ? "몇 시에 돌아오세요?" : "몇 시에 닫으세요?"}</span>
                    <input type="time" value={to} onChange={(e) => setTo(e.target.value)} className={TIME_INPUT} />
                  </label>
                )}
                <label className="flex flex-col gap-1.5">
                  <span className="text-lg font-bold">
                    한 줄 쪽지 <span className="text-sm font-normal text-muted">(선택)</span>
                  </span>
                  <input value={note} maxLength={MEMO_MAX} onChange={(e) => setNote(e.target.value)} placeholder="예: 병원 다녀와요" className={TIME_INPUT} />
                </label>
                <button type="button" disabled={busy || !from || !to} onClick={save} className="min-h-16 rounded-[22px] border-2 border-sage-deep bg-sage font-display text-xl text-white disabled:opacity-60">
                  {busy ? "넣는 중…" : `${dayLabel(day)} ${KINDS.find((k) => k.id === kind)?.label} 넣기`}
                </button>
              </>
            )}
          </>
        )}
      </section>
      {node}
    </>
  );
}
