"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Mood } from "@/lib/signs";
import { Osori } from "./Osori";

type ToastState = { msg: string; mood: Mood; action?: { label: string; onClick: () => void } };

/** "반장 오소리" 토스트. node 를 화면에 두고 show 로 띄운다 */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => setToast(null), []);
  const show = useCallback((msg: string, mood: Mood = "smile", action?: ToastState["action"], ms = 3000) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, mood, action });
    timer.current = setTimeout(() => setToast(null), ms);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const node = (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 mx-auto max-w-[480px] px-3.5">
      {toast && (
        <div className="ok-pop pointer-events-auto relative flex min-h-[76px] items-center gap-2 rounded-3xl border-2 border-ink bg-card py-3.5 pr-3 pl-[88px]">
          <Osori mood={toast.mood} size={70} className="absolute bottom-1.5 left-2" />
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="font-display text-sm text-sage-deep">반장 오소리</span>
            <span className="text-[15px] leading-normal font-bold">{toast.msg}</span>
          </span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                hide();
              }}
              className="min-h-11 shrink-0 rounded-2xl border-2 border-line bg-white px-3 text-sm font-bold"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );

  return { node, show, hide };
}
