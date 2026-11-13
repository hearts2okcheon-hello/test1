"use client";

import { useState } from "react";
import { seoulToday } from "@/lib/calendar";
import { dayLine, nextDays, weekdayName, type DayTone } from "@/lib/plans";
import type { DayPlan, RegularHours, TempClosure } from "@/lib/types";

const TONE_TEXT: Record<DayTone, string> = { closed: "font-bold text-[#C8403D]", plan: "font-bold text-blue", normal: "" };

/**
 * 운영 날짜 & 영업시간: 오늘 하루만 보여 주고, ⌄ 를 누르면 1주일 뒤까지 편다. 한 달 일정은 가게 이름 옆 달력 버튼에서 본다.
 * 여기 시간은 "등록한 일정"일 뿐이다. 지금 영업 중인지는 위 배지(DB 계산)가 말한다
 */
export function HoursPanel({ hours, closures, plans }: { hours: RegularHours | null; closures: TempClosure[]; plans: DayPlan[] }) {
  const [open, setOpen] = useState(false);
  const today = seoulToday();

  const todayLine = dayLine(today, hours, closures, plans);
  // 오늘 다음 날부터 1주일 뒤 같은 요일까지
  const week = nextDays(today, 8).slice(1).map((d) => dayLine(d, hours, closures, plans));

  return (
    <div className="flex flex-col gap-2">
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
