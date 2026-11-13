"use client";

import { useEffect, useState } from "react";
import { CONFIRM_DELETE, type ConfirmDeleteRequest } from "@/lib/confirm";
import { Osori } from "./Osori";

/** 삭제 확인 창. 왼쪽 예, 오른쪽 아니오 */
export function ConfirmDeleteHost() {
  const [req, setReq] = useState<ConfirmDeleteRequest | null>(null);
  const [password, setPassword] = useState("");

  useEffect(() => {
    function onAsk(e: Event) {
      setPassword("");
      setReq((e as CustomEvent<ConfirmDeleteRequest>).detail);
    }
    window.addEventListener(CONFIRM_DELETE, onAsk);
    return () => window.removeEventListener(CONFIRM_DELETE, onAsk);
  }, []);

  useEffect(() => {
    if (!req) return;
    const current = req;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        current.resolve(null);
        setReq(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [req]);

  if (!req) return null;

  const close = (result: { password: string } | null) => {
    req.resolve(result);
    setReq(null);
  };
  const ready = !req.password || password.length > 0;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-ink/40 px-5">
      <div role="alertdialog" aria-modal="true" aria-labelledby="ok-delete-title" className="ok-pop flex w-full max-w-[380px] flex-col items-center gap-3 rounded-[22px] border-2 border-line bg-card px-4 py-5 text-center">
        <Osori mood="surprise" size={72} />
        <h2 id="ok-delete-title" className="font-display text-[24px] font-normal">{req.title ?? "삭제하시겠습니까?"}</h2>
        {req.detail && <p className="text-base leading-relaxed whitespace-pre-line text-muted">{req.detail}</p>}
        {req.password && (
          <label className="flex w-full flex-col gap-1.5 text-left">
            <span className="text-base font-bold">보호된 항목이에요. 비밀번호를 넣어 주세요.</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-14 rounded-2xl border-2 border-line bg-white px-3.5 text-xl"
            />
          </label>
        )}
        <div className="flex w-full gap-2">
          <button
            type="button"
            disabled={!ready}
            onClick={() => close({ password })}
            className="min-h-16 flex-1 rounded-[22px] border-2 border-[#A4423F] bg-[#A4423F] font-display text-xl text-white disabled:border-line disabled:bg-[#EFE9DF] disabled:text-muted"
          >
            예
          </button>
          <button type="button" autoFocus={!req.password} onClick={() => close(null)} className="min-h-16 flex-1 rounded-[22px] border-2 border-line bg-white font-display text-xl">
            아니오
          </button>
        </div>
      </div>
    </div>
  );
}
