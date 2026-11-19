"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { addMonth, monthGrid, seoulToday } from "@/lib/calendar";
import { askDelete } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { dayLabel, dayLine, lastPlanDay, planText, type DayTone } from "@/lib/plans";
import { SCHEDULE_KINDS, bandOf, calendarEnd, dayMark, daysBetween, defaultTimes, kindAllowed, rangeLabel, scheduleText, schedulesOf, tapRange, type Schedule, type ScheduleKind } from "@/lib/schedule";
import { MEMO_MAX } from "@/lib/signs";
import { createClient } from "@/lib/supabase/client";
import type { DayPlan, RegularHours, TempClosure } from "@/lib/types";
import { TimeWheel } from "./TimeWheel";
import { useToast } from "./Toast";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const TONE_TEXT: Record<DayTone, string> = { closed: "text-red", plan: "text-blue", normal: "text-ink" };
const REASON_MAX = 200;
const REASON_CHIPS = ["가족 행사", "개인 사정", "가게 공사", "병원 진료"];
const FIELD = "min-h-14 w-full min-w-0 rounded-2xl border-2 border-line bg-white px-3 text-lg";

/** 일정 유형 그림: 휴무(침대) · 늦게 열어요(시계) · 일찍 닫아요(문) · 외출(가방) */
const KIND_ICON: Record<ScheduleKind, string[]> = {
  closed: ["M3 6v12", "M3 14h18v4", "M21 14v-1.5a3 3 0 0 0-3-3h-7.5V14", "M7 12.2a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z"],
  late_open: ["M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z", "M12 7.5V12l3 2"],
  early_close: ["M6.5 20V4.5h9V20", "M4 20h16", "M12.5 12v1", "M19 8.5v7"],
  out: ["M4 8h16v11H4z", "M9 8V5.5h6V8", "M4 13h16"],
};
const CALENDAR_ICON = ["M5 6h14v14H5z", "M5 10h14", "M9 3.5v4", "M15 3.5v4"];

type Range = { start: string | null; end: string | null };
const monthOf = (day: string): [number, number] => [Number(day.slice(0, 4)), Number(day.slice(5, 7))];
const monthKey = ([y, m]: [number, number]) => y * 12 + m;

function Icon({ paths, size = 26 }: { paths: string[]; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      {paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/**
 * 가게 캘린더 (ADR-015). 휴무 빨강 · 일정 파랑 · 평소 검정, 숫자 아래 작은 글씨로 유형을 적는다.
 * editable(사장님·관리자): 날짜를 눌러 기간을 고르고 → 유형을 골라 → "일정 등록". 등록된 일정은 고치고 지운다.
 * editable 이 아니면(주민): 날짜를 눌러 그날 일정을 본다.
 * embedded 는 가게 화면의 달력 창 안에 넣을 때 (머리말을 뺀다)
 */
export function OwnerCalendar({
  storeId,
  storeName,
  hours,
  closures,
  plans,
  editable = true,
  embedded = false,
}: {
  storeId: string;
  storeName: string;
  hours: RegularHours | null;
  closures: TempClosure[];
  plans: DayPlan[];
  editable?: boolean;
  embedded?: boolean;
}) {
  const router = useRouter();
  const { node, show } = useToast();
  const uid = useId();
  const today = seoulToday();
  const planLast = lastPlanDay(today);
  const last = calendarEnd(today, closures, editable);
  const [ym, setYm] = useState<[number, number]>(() => monthOf(today));
  const [range, setRange] = useState<Range>({ start: editable ? null : today, end: null });
  const [kind, setKind] = useState<ScheduleKind | null>(null);
  const [from, setFrom] = useState("11:00");
  const [to, setTo] = useState("17:00");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLElement>(null);

  const [y, m] = ym;
  const start = range.start;
  const end = range.end ?? range.start;
  const all = schedulesOf(closures, plans);
  // 하루만 골랐을 때 그날 걸린 일정 (눌러서 고치거나 지운다)
  const onDay = start && start === end ? all.filter((s) => s.start <= start && start <= s.end) : [];
  // 이미 시작한 휴무를 고치는 중이면 시작일은 그대로 둔다
  const startLocked = !!start && start < today;
  const firstMonth = monthOf(startLocked && start ? start : today);

  function reset() {
    setRange({ start: null, end: null });
    setKind(null);
    setNote("");
    setEditing(null);
    setPeriodOpen(false);
  }

  function keepKind(next: Range) {
    const e = next.end ?? next.start;
    // 한 달 뒤를 넘는 기간에는 휴무만 넣을 수 있다
    if (kind && e && !kindAllowed(kind, e, today)) setKind(null);
    setRange(next);
  }

  function pick(d: string) {
    if (!editable) return setRange({ start: d, end: null });
    keepKind(tapRange(range, d, today));
  }

  function typeStart(v: string) {
    if (!v || v < today || v > last) return;
    keepKind({ start: v, end: range.end && range.end >= v ? range.end : v });
    setYm(monthOf(v));
  }

  function typeEnd(v: string) {
    if (!v || v < today || v > last) return;
    keepKind(!start || v < start ? { start: startLocked ? start : v, end: v } : { start, end: v });
    setYm(monthOf(v));
  }

  function chooseKind(k: ScheduleKind) {
    if (k === kind) return;
    setKind(k);
    setNote((n) => n.slice(0, k === "closed" ? REASON_MAX : MEMO_MAX));
    if (editing?.kind === k) return;
    const t = defaultTimes(k, hours, start ?? today);
    setFrom(t.from);
    setTo(t.to);
  }

  function edit(s: Schedule) {
    setEditing(s);
    setRange({ start: s.start, end: s.end });
    setKind(s.kind);
    if (s.from) setFrom(s.from.slice(0, 5));
    if (s.to) setTo(s.to.slice(0, 5));
    setNote(s.note ?? "");
    setYm(monthOf(s.start < today ? today : s.start));
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() => form.current?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" }));
  }

  async function save() {
    if (!start || !end || !kind) return;
    if (kind === "out" && from >= to) return show("돌아오는 시각이 나가는 시각보다 뒤여야 해요.", "think");
    setBusy(true);
    try {
      const { data, error } = await createClient().rpc("save_schedule", {
        p_store_id: storeId,
        p_kind: kind,
        p_start: start,
        p_end: end,
        p_from: kind === "late_open" || kind === "out" ? from : null,
        p_to: kind === "early_close" || kind === "out" ? to : null,
        p_note: note.trim() || null,
        p_closure_id: editing?.closureId ?? null,
        p_plan_ids: editing && editing.planIds.length > 0 ? editing.planIds : null,
      });
      if (error) throw error;
      // 휴무인 날은 건너뛰므로 고른 기간보다 적게 들어갈 수 있다
      const skipped = typeof data === "number" && data < daysBetween(start, end);
      show(skipped ? `휴무인 날을 빼고 ${data}일에 넣었어요.` : editing ? "일정을 고쳤어요." : `${rangeLabel(start, end)} 일정을 넣었어요.`, "proud");
      reset();
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  async function remove(s: Schedule) {
    if (!(await askDelete({ title: "일정을 지울까요?", detail: `${rangeLabel(s.start, s.end)}\n${scheduleText(s)}` }))) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = s.closureId
        ? await supabase.rpc("cancel_temp_closure", { p_closure_id: s.closureId })
        : await supabase.rpc("clear_day_plans", { p_store_id: storeId, p_plan_ids: s.planIds });
      if (error) throw error;
      show("일정을 지웠어요.", "proud");
      if (editing?.key === s.key) reset();
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  const line = start && start === end ? dayLine(start, hours, closures, plans) : null;
  const viewDay = start ?? today;
  const viewLine = dayLine(viewDay, hours, closures, plans);

  return (
    <>
      {!embedded && (
        <>
          <header className="flex items-center gap-2.5">
            <button
              type="button"
              aria-label="뒤로"
              onClick={() => (window.history.length > 1 ? router.back() : router.push("/owner"))}
              className="flex size-[46px] shrink-0 items-center justify-center rounded-full border-2 border-line bg-card"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-base text-muted">{storeName}</span>
              <h1 className="font-display text-[26px] leading-tight font-normal">가게 캘린더</h1>
            </div>
          </header>
          <p className="text-lg leading-relaxed text-muted">시작하는 날과 끝나는 날을 차례로 눌러 주세요. 하루면 한 번만 누르면 돼요.</p>
        </>
      )}
      {embedded && <p className="text-base text-muted">{editable ? "시작하는 날과 끝나는 날을 차례로 누르고 일정을 넣어요. 하루면 한 번만 누르면 돼요." : "날짜를 누르면 그날 일정을 볼 수 있어요."}</p>}

      <section className="flex flex-col gap-2 rounded-[22px] border-2 border-line bg-card p-3">
        <div className="flex items-center">
          <button
            type="button"
            aria-label="이전 달"
            disabled={monthKey(ym) <= monthKey(firstMonth)}
            onClick={() => setYm(addMonth(y, m, -1))}
            className="flex size-12 items-center justify-center rounded-full border-2 border-line bg-white disabled:opacity-30"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <h2 className="flex-1 text-center font-display text-[21px] font-normal" aria-live="polite">
            {y}년 {m}월
          </h2>
          <button
            type="button"
            aria-label="다음 달"
            disabled={monthKey(ym) >= monthKey(monthOf(last))}
            onClick={() => setYm(addMonth(y, m, 1))}
            className="flex size-12 items-center justify-center rounded-full border-2 border-line bg-white disabled:opacity-30"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-y-1 text-center">
          {WEEK.map((w, i) => (
            <span key={w} className={`py-1 text-base font-bold ${i === 0 ? "text-red" : "text-muted"}`}>
              {w}
            </span>
          ))}
          {monthGrid(y, m).map((d, i) => {
            if (!d) return <span key={`e${i}`} />;
            const col = i % 7;
            const off = d < today || d > last;
            const mark = dayMark(d, hours, closures, plans);
            const band = off ? null : bandOf(d, closures, plans);
            const inSel = !!start && !!end && d >= start && d <= end;
            const edge = inSel && (d === start || d === end);
            // 이어진 날은 한 줄 띠로 잇는다. 띠의 처음·끝과 줄의 양 끝만 둥글게
            const left = inSel ? d === start || col === 0 : band ? band.start || col === 0 : true;
            const right = inSel ? d === end || col === 6 : band ? band.end || col === 6 : true;
            const fill = inSel ? (edge ? "bg-yellow" : "bg-yellow-soft") : band ? (band.type === "closed" ? "bg-coral-soft" : "bg-blue-soft") : "";
            const text = off ? (inSel ? "text-muted" : "text-line") : edge ? "text-ink" : TONE_TEXT[mark.tone];
            const state = mark.tone === "closed" ? (mark.label ?? "휴무") : mark.tone === "plan" ? `일정 있음 ${mark.label ?? ""}` : "평소대로";
            return (
              <button
                key={d}
                type="button"
                disabled={off}
                aria-pressed={inSel}
                aria-label={`${dayLabel(d)} ${state}${d === today ? ", 오늘" : ""}`}
                onClick={() => pick(d)}
                className={`flex min-h-[54px] flex-col items-center justify-center gap-[3px] text-[17px] leading-none font-bold disabled:font-normal ${fill} ${text} ${left ? "rounded-l-xl" : ""} ${right ? "rounded-r-xl" : ""} ${d === today && !edge ? "ring-2 ring-sage-deep ring-inset" : ""}`}
              >
                {Number(d.slice(-2))}
                <span className="h-[11px] text-[11px] leading-none">{off ? "" : mark.label}</span>
              </button>
            );
          })}
        </div>

        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pt-1 text-sm font-bold" aria-label="색 설명">
          <span className="flex items-center gap-1.5 text-red">
            <span aria-hidden className="size-2.5 rounded-full bg-red" />
            휴무
          </span>
          <span className="flex items-center gap-1.5 text-blue">
            <span aria-hidden className="size-2.5 rounded-full bg-blue" />
            늦게 · 일찍 · 외출
          </span>
          {editable && (
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full bg-yellow" />
              고른 날
            </span>
          )}
        </p>
      </section>

      {!editable ? (
        <section aria-live="polite" className="flex flex-col gap-3 rounded-[22px] border-2 border-line bg-card px-3.5 py-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-display text-[23px] font-normal">{dayLabel(viewDay)}</h2>
            <p className={`text-lg font-bold ${TONE_TEXT[viewLine.tone]}`}>{viewLine.text}</p>
            {viewLine.note && <p className="text-base text-muted">{viewLine.note}</p>}
          </div>
          {plans
            .filter((p) => p.day === viewDay)
            .map((p) => (
              <p key={p.id} className="rounded-2xl border-2 border-line bg-white px-3 py-2 text-lg font-bold text-blue">
                {planText(p)}
                {p.note && <span className="block text-base font-normal text-muted">{p.note}</span>}
              </p>
            ))}
        </section>
      ) : (
        <>
          {onDay.length > 0 && !editing && start && (
            <section aria-live="polite" className="flex flex-col gap-2">
              <h2 className="font-display text-[21px] font-normal">{dayLabel(start)}에 등록된 일정</h2>
              <ul className="flex flex-col gap-2">
                {onDay.map((s) => (
                  <ScheduleRow key={s.key} s={s} busy={busy} onEdit={() => edit(s)} onRemove={() => remove(s)} />
                ))}
              </ul>
            </section>
          )}

          <section ref={form} aria-label={editing ? "일정 고치기" : "일정 넣기"} className="flex scroll-mt-4 flex-col gap-4">
            {editing && (
              <div className="flex flex-col gap-1 rounded-[20px] border-2 border-yellow-line bg-cream py-2.5 pr-2.5 pl-3.5">
                <span className="flex items-center gap-2">
                  <span className="flex-1 text-base text-muted">고치는 중인 일정</span>
                  <button type="button" onClick={reset} className="min-h-12 shrink-0 rounded-2xl border-2 border-line bg-white px-3.5 text-base font-bold">
                    그만두기
                  </button>
                </span>
                <span className="text-[17px] leading-snug font-bold">
                  {rangeLabel(editing.start, editing.end)} · {scheduleText(editing)}
                </span>
              </div>
            )}

            {/* 기간 설정: 달력에서 고른 기간을 보여 주고, 눌러서 날짜를 직접 적을 수도 있다 */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                aria-expanded={periodOpen}
                aria-controls={`${uid}-period`}
                onClick={() => setPeriodOpen(!periodOpen)}
                className="flex min-h-16 items-center gap-3 rounded-[20px] border-2 border-line bg-card py-2 pr-3 pl-4 text-left"
              >
                <Icon paths={CALENDAR_ICON} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-base text-muted">기간 설정</span>
                  <span className="text-lg leading-snug font-bold">{start && end ? rangeLabel(start, end) : "달력에서 날짜를 눌러 주세요"}</span>
                </span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`shrink-0 text-muted ${periodOpen ? "rotate-90" : ""}`}>
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {periodOpen && (
                <div id={`${uid}-period`} className="grid grid-cols-2 gap-2">
                  <label className="flex min-w-0 flex-col gap-1.5">
                    <span className="text-lg font-bold">시작하는 날</span>
                    <input type="date" value={start ?? ""} min={today} max={last} disabled={startLocked} onChange={(e) => typeStart(e.target.value)} className={`${FIELD} disabled:bg-sand disabled:text-muted`} />
                  </label>
                  <label className="flex min-w-0 flex-col gap-1.5">
                    <span className="text-lg font-bold">끝나는 날</span>
                    <input type="date" value={end ?? ""} min={start && start > today ? start : today} max={last} onChange={(e) => typeEnd(e.target.value)} className={FIELD} />
                  </label>
                </div>
              )}
              {line && <p className="px-1 text-base text-muted">이날 지금 일정: {line.text}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-bold">일정 유형을 선택해 주세요</h2>
              <div role="group" aria-label="일정 유형" className="grid grid-cols-2 gap-2">
                {SCHEDULE_KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    aria-pressed={kind === k.id}
                    disabled={!!end && !kindAllowed(k.id, end, today)}
                    onClick={() => chooseKind(k.id)}
                    className={`flex min-h-[78px] flex-col items-center justify-center gap-1.5 rounded-[20px] border-2 text-lg font-bold disabled:opacity-40 ${kind === k.id ? "border-sage-deep bg-sage-soft text-sage-deep" : "border-line bg-white"}`}
                  >
                    <Icon paths={KIND_ICON[k.id]} />
                    {k.label}
                  </button>
                ))}
              </div>
              {end && end > planLast && <p className="px-1 text-base leading-normal text-muted">{dayLabel(planLast)} 뒤로는 휴무만 넣을 수 있어요. 늦게 열어요 · 일찍 닫아요 · 외출은 한 달 뒤까지만 넣어요.</p>}
            </div>

            {kind && (
              <>
                {(kind === "late_open" || kind === "out") && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-lg font-bold">{kind === "out" ? "몇 시에 나가세요?" : "몇 시에 여세요?"}</span>
                    <TimeWheel value={from} onChange={setFrom} label="시작 시간" />
                  </div>
                )}
                {(kind === "early_close" || kind === "out") && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-lg font-bold">{kind === "out" ? "몇 시에 돌아오세요?" : "몇 시에 닫으세요?"}</span>
                    <TimeWheel value={to} onChange={setTo} label="끝 시간" />
                  </div>
                )}
                {kind === "closed" && (
                  <div className="flex flex-wrap gap-2">
                    {REASON_CHIPS.map((c) => (
                      <button key={c} type="button" aria-pressed={note === c} onClick={() => setNote(c)} className={`min-h-12 rounded-[22px] border-2 px-4 text-base font-bold ${note === c ? "border-yellow-deep bg-yellow" : "border-line bg-card"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                )}
                <label className="flex flex-col gap-1.5">
                  <span className="text-lg font-bold">
                    {kind === "closed" ? "쉬는 이유" : "한 줄 쪽지"} <span className="text-sm font-normal text-muted">(선택)</span>
                  </span>
                  <input
                    value={note}
                    maxLength={kind === "closed" ? REASON_MAX : MEMO_MAX}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={kind === "closed" ? "예: 가족 여행으로 쉬어요" : "예: 병원 다녀와요"}
                    className={FIELD}
                  />
                </label>
              </>
            )}

            <button
              type="button"
              disabled={busy || !start || !kind}
              onClick={save}
              className="min-h-16 rounded-[22px] border-2 border-sage-deep bg-sage font-display text-xl text-white disabled:border-line disabled:bg-sand disabled:text-muted disabled:!shadow-none"
            >
              {busy ? "저장하는 중…" : !start ? "날짜를 골라 주세요" : !kind ? "일정 유형을 골라 주세요" : editing ? "고친 일정 저장" : "일정 등록"}
            </button>
          </section>

          <section aria-labelledby={`${uid}-all`} className="flex flex-col gap-2">
            <h2 id={`${uid}-all`} className="font-display text-[21px] font-normal">
              등록된 일정 <span className="font-sans text-base text-muted">{all.length}개</span>
            </h2>
            {all.length === 0 ? (
              <p className="rounded-[18px] border-2 border-dashed border-line px-3.5 py-3 text-base text-muted">아직 등록된 일정이 없어요.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {all.map((s) => (
                  <ScheduleRow key={s.key} s={s} busy={busy} active={editing?.key === s.key} onEdit={() => edit(s)} onRemove={() => remove(s)} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      {node}
    </>
  );
}

/** 등록된 일정 한 줄: 유형(색 + 글자) · 기간 · 쪽지, 그리고 고치기 · 지우기 */
function ScheduleRow({ s, busy, active = false, onEdit, onRemove }: { s: Schedule; busy: boolean; active?: boolean; onEdit: () => void; onRemove: () => void }) {
  return (
    <li className={`flex flex-col gap-2.5 rounded-[20px] border-2 bg-card px-3.5 py-3 ${active ? "border-sage-deep" : "border-line"}`}>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={`text-lg leading-snug font-bold ${s.kind === "closed" ? "text-red" : "text-blue"}`}>{scheduleText(s)}</span>
        <span className="text-lg leading-snug">{rangeLabel(s.start, s.end)}</span>
        {s.note && <span className="text-base text-muted">{s.note}</span>}
      </span>
      <span className="flex gap-2">
        <button type="button" disabled={busy} onClick={onEdit} className="min-h-12 flex-1 rounded-2xl border-2 border-line bg-white text-base font-bold disabled:opacity-60">
          고치기
        </button>
        <button type="button" disabled={busy} onClick={onRemove} className="min-h-12 flex-1 rounded-2xl border-2 border-line bg-white text-base font-bold text-danger disabled:opacity-60">
          지우기
        </button>
      </span>
    </li>
  );
}
