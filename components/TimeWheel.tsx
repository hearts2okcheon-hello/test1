"use client";

import { useEffect, useRef } from "react";
import { joinClock, splitClock } from "@/lib/clock";

const ROW = 44;
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

/** 위아래로 밀어 하나를 고르는 칸. 가운데 줄에 온 것이 고른 값이다 */
function Wheel<T extends string | number>({ label, items, value, onPick, text }: { label: string; items: T[]; value: T; onPick: (v: T) => void; text: (v: T) => string }) {
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const index = Math.max(0, items.indexOf(value));

  // 밖에서 값이 바뀌면(처음 열 때, 눌러서 고를 때) 그 줄로 옮긴다
  useEffect(() => {
    const el = box.current;
    if (el && Math.abs(el.scrollTop - index * ROW) > 2) el.scrollTo({ top: index * ROW });
  }, [index]);
  useEffect(() => () => void (timer.current && window.clearTimeout(timer.current)), []);

  function onScroll() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = box.current;
      if (!el) return;
      const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
      if (items[i] !== value) onPick(items[i]);
    }, 90);
  }

  return (
    <div
      ref={box}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onScroll={onScroll}
      className="ok-scroll-x h-[132px] flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain"
    >
      <div style={{ height: ROW }} aria-hidden />
      {items.map((it) => (
        <button
          key={it}
          type="button"
          role="option"
          aria-selected={it === value}
          onClick={() => onPick(it)}
          style={{ height: ROW }}
          className={`flex w-full snap-center items-center justify-center text-lg active:!transform-none ${it === value ? "font-bold text-ink" : "text-muted/60"}`}
        >
          {text(it)}
        </button>
      ))}
      <div style={{ height: ROW }} aria-hidden />
    </div>
  );
}

/** 오전/오후 · 시 · 분을 밀어서 고르는 시간 돌림판. 값은 "HH:MM" */
export function TimeWheel({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const p = splitClock(value);
  return (
    <div data-no-swipe role="group" aria-label={label} className="relative flex rounded-2xl border-2 border-line bg-white px-2">
      <span aria-hidden className="pointer-events-none absolute inset-x-2 top-[44px] h-[44px] rounded-xl bg-yellow-soft" />
      <div className="relative flex flex-1">
        <Wheel label="오전 오후" items={["오전", "오후"]} value={p.pm ? "오후" : "오전"} onPick={(v) => onChange(joinClock({ ...p, pm: v === "오후" }))} text={(v) => v} />
        <Wheel label="시" items={HOURS} value={p.hour} onPick={(v) => onChange(joinClock({ ...p, hour: v }))} text={(v) => `${v}시`} />
        <Wheel label="분" items={MINUTES} value={p.minute} onPick={(v) => onChange(joinClock({ ...p, minute: v }))} text={(v) => `${String(v).padStart(2, "0")}분`} />
      </div>
    </div>
  );
}
