"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { SIGN_STYLES } from "@/lib/signs";
import { STATUS_FILTERS, STATUS_FILTER_LABEL, type StatusFilter } from "@/lib/storeFilter";

const DOT: Record<StatusFilter, string | null> = {
  all: null,
  open: SIGN_STYLES.open.dot,
  closed: SIGN_STYLES.closed_today.dot,
  out: SIGN_STYLES.out.dot,
};

const GAP = 6;
/** 메뉴가 놓일 자리: 버튼 바로 아래(자리가 없으면 위), 오른쪽 끝을 버튼에 맞춘다 */
type Spot = { top?: number; bottom?: number; right: number; up: boolean };

/**
 * 가게 상태 고르기. 버튼을 누르면 전체 · 영업중 · 휴무중 · 외출중이 아래로 차례로 펼쳐진다.
 * 하나를 고르거나 다른 곳을 누르면 쓰기 버튼처럼 부드럽게 버튼 쪽으로 접힌다
 */
export function StatusSelect({ value, onChange }: { value: StatusFilter; onChange: (v: StatusFilter) => void }) {
  const id = useId();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [spot, setSpot] = useState<Spot>({ top: 0, right: 0, up: false });
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  // 메뉴는 화면 맨 위층(body)에 미리 그려 둔다. 그래야 처음 펼칠 때도 부드럽고, 넘기는 화면에 잘리지 않는다
  useEffect(() => setReady(true), []);

  function show() {
    const r = button.current?.getBoundingClientRect();
    if (!r) return;
    const height = menu.current?.offsetHeight ?? 0;
    const right = Math.max(8, document.documentElement.clientWidth - r.right);
    // 아래에 자리가 모자라고 위에는 넉넉하면 위로 펼친다
    const up = r.bottom + GAP + height > window.innerHeight - 8 && r.top - GAP - height > 8;
    setSpot(up ? { bottom: window.innerHeight - r.top + GAP, right, up } : { top: r.bottom + GAP, right, up });
    setOpen(true);
  }

  function hide(refocus = false) {
    setOpen(false);
    if (refocus) button.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus({ preventScroll: true });
    // 화면이 움직이면 버튼과 메뉴가 떨어지므로 접는다
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      return hide(true);
    }
    // Tab 은 메뉴를 접고 버튼 다음으로 넘어간다
    if (e.key === "Tab") return hide(true);
    const items = [...(menu.current?.querySelectorAll<HTMLElement>("[role=option]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const j = e.key === "ArrowDown" ? i + 1 : e.key === "ArrowUp" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : null;
    if (j === null) return;
    e.preventDefault();
    items[Math.max(0, Math.min(items.length - 1, j))]?.focus({ preventScroll: true });
  }

  // 버튼에서 가까운 것부터 차례로 나오고, 접힐 때는 한꺼번에 버튼 쪽으로 돌아간다
  const step = (i: number) => {
    const order = spot.up ? STATUS_FILTERS.length - 1 - i : i;
    return {
      transitionDelay: open ? `${order * 35}ms` : "0ms",
      transform: open ? "none" : `translateY(${(spot.up ? 1 : -1) * (order + 1) * 10}px)`,
      opacity: open ? 1 : 0,
    };
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`가게 상태 고르기. 지금 ${STATUS_FILTER_LABEL[value]}`}
        onClick={() => (open ? hide() : show())}
        className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 pr-2.5 pl-3.5 font-display text-[15px] ${value === "all" ? "border-line bg-card" : "border-sage-deep bg-sage-soft text-sage-deep"}`}
      >
        {DOT[value] && <span aria-hidden className="size-2.5 rounded-full" style={{ background: DOT[value]! }} />}
        {STATUS_FILTER_LABEL[value]}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {ready &&
        createPortal(
          <div data-no-swipe inert={!open} aria-hidden={!open} className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
            {/* 다른 곳을 누르면 접힌다 (그 자리의 가게가 눌리지는 않는다) */}
            <div aria-hidden onClick={() => hide()} className="absolute inset-0" />
            <div
              ref={menu}
              id={id}
              role="listbox"
              aria-label="가게 상태"
              onKeyDown={onKey}
              style={{ top: spot.top, bottom: spot.bottom, right: spot.right }}
              className={`ok-sticker absolute flex min-w-[152px] flex-col gap-0.5 rounded-[20px] border-2 border-line bg-card p-1.5 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${spot.up ? "origin-bottom-right" : "origin-top-right"} ${open ? "opacity-100" : "scale-90 opacity-0"}`}
            >
              {STATUS_FILTERS.map((f, i) => {
                const on = f === value;
                return (
                  <button
                    key={f}
                    type="button"
                    role="option"
                    aria-selected={on}
                    tabIndex={open ? 0 : -1}
                    onClick={() => {
                      onChange(f);
                      hide(true);
                    }}
                    style={step(i)}
                    className={`flex min-h-12 items-center gap-2 rounded-2xl pr-2.5 pl-3 text-left font-display text-base transition-[opacity,transform] duration-200 ease-out motion-reduce:!transform-none motion-reduce:transition-none ${on ? "bg-sage-soft text-sage-deep" : "hover:bg-cream"}`}
                  >
                    <span aria-hidden className="flex size-2.5 shrink-0 rounded-full" style={{ background: DOT[f] ?? "var(--color-line-strong)" }} />
                    <span className="flex-1">{STATUS_FILTER_LABEL[f]}</span>
                    {on && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
