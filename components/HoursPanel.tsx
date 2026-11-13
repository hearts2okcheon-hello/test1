"use client";

import { useEffect, useRef, useState } from "react";
import { seoulToday } from "@/lib/calendar";
import { dayLine, lastPlanDay, nextDays, specialDays, weekdayName, type DayTone } from "@/lib/plans";
import type { DayPlan, RegularHours, TempClosure } from "@/lib/types";

const OPEN_EVENT = "ok:open-schedule";
const TONE_TEXT: Record<DayTone, string> = { closed: "font-bold text-[#C8403D]", plan: "font-bold text-blue", normal: "" };

/** 가게 이름 옆 달력 버튼: 누르면 아래 영업시간을 펼치고 그리로 내려간다 */
export function ScheduleButton({ marked }: { marked: boolean }) {
  return (
    <button
      type="button"
      aria-label="날짜별 영업 일정 보기"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className="relative flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-line bg-card"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 6h14v14H5z" />
        <path d="M5 10h14" />
        <path d="M9 3.5v4" />
        <path d="M15 3.5v4" />
      </svg>
      {marked && <span aria-hidden className="absolute top-0.5 right-0.5 size-3 rounded-full border-2 border-card bg-blue" />}
    </button>
  );
}

/**
 * 운영 날짜 & 영업시간: 오늘 하루만 보여 주고, ⌄ 를 누르면 1주일 뒤까지와 그 뒤로 잡힌 일정(휴무·늦게 열기·일찍 닫기·외출)을 편다.
 * 여기 시간은 "등록한 일정"일 뿐이다. 지금 영업 중인지는 위 배지(DB 계산)가 말한다
 */
export function HoursPanel({ hours, closures, plans }: { hours: RegularHours | null; closures: TempClosure[]; plans: DayPlan[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const today = seoulToday();

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      box.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const todayLine = dayLine(today, hours, closures, plans);
  // 오늘 다음 날부터 1주일 뒤 같은 요일까지
  const week = nextDays(today, 8).slice(1).map((d) => dayLine(d, hours, closures, plans));
  const weekEnd = week[week.length - 1].day;
  const later = specialDays(today, lastPlanDay(today), hours, closures, plans).filter((d) => d.day > weekEnd);

  return (
    <div ref={box} className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="hours-more"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-14 items-center gap-2 rounded-2xl border-2 border-line bg-white px-3.5 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={`text-lg ${TONE_TEXT[todayLine.tone] || "font-bold"}`}>
            오늘 {weekdayName(today)} {todayLine.text}
          </span>
          {todayLine.note && <span className="text-sm text-muted">{todayLine.note}</span>}
        </span>
        <span className="sr-only">{open ? "다른 날짜 접기" : "다른 날짜 보기"}</span>
        <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul id="hours-more" className="flex flex-col gap-1.5 px-1">
          {week.map((d) => (
            <DayRow key={d.day} label={d.label} text={d.text} tone={d.tone} note={d.note} />
          ))}
          {later.length > 0 && <li className="pt-1.5 text-sm font-bold text-muted">그 뒤에 잡힌 일정</li>}
          {later.map((d) => (
            <DayRow key={d.day} label={d.label} text={d.text} tone={d.tone} note={d.note} />
          ))}
        </ul>
      )}
    </div>
  );
}

function DayRow({ label, text, tone, note }: { label: string; text: string; tone: DayTone; note: string | null }) {
  return (
    <li className={`flex flex-col text-base ${TONE_TEXT[tone]}`}>
      <span className="flex gap-2">
        <span className="w-[86px] shrink-0">{label}</span>
        <span className="min-w-0 flex-1">{text}</span>
      </span>
      {note && <span className="pl-[94px] text-sm font-normal text-muted">{note}</span>}
    </li>
  );
}
