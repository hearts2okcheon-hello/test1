"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorMessage } from "@/lib/errors";
import { pushWithLoading } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "./Toast";

/**
 * 프로필 옆 가게 표시. 가게가 있으면 내 가게로, 없으면 가게 등록으로 간다.
 * 처음 등록하러 갈 때는 연락 안내를 보여 주고 "확인했습니다"를 받는다 (한 번 확인하면 다시 띄우지 않는다)
 */
export function StoreGate({ storeName, acked, canRegister }: { storeName: string | null; acked: boolean; canRegister: boolean }) {
  const router = useRouter();
  const { node, show } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function go() {
    if (storeName) return pushWithLoading(router, "/owner/store");
    if (!canRegister) return show("먼저 내 정보를 등록해 주세요.", "think");
    if (acked) return pushWithLoading(router, "/owner/register");
    setOpen(true);
  }

  async function agree() {
    setBusy(true);
    try {
      const { error } = await createClient().rpc("ack_store_notice");
      if (error) throw error;
      setOpen(false);
      pushWithLoading(router, "/owner/register");
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={go}
        aria-label={storeName ? `내 가게 ${storeName} 열기` : "가게 등록하기"}
        className="ok-sticker flex min-h-[84px] w-[84px] shrink-0 flex-col items-center justify-center gap-1 rounded-[20px] border-2 border-sage-deep bg-sage-soft px-1.5 text-sage-deep"
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 7h18l-1.5 4h-15z" />
          <path d="M5 11v9h14v-9" />
          <path d="M10 20v-5h4v5" />
        </svg>
        <span className="line-clamp-2 text-center font-display text-[15px] leading-tight break-keep">{storeName ? "내 가게" : "가게 등록"}</span>
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="store-gate-title" className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/30 px-3 pb-3 sm:items-center" onClick={() => setOpen(false)}>
          <div className="ok-pop relative flex w-full max-w-[440px] flex-col gap-3 rounded-[28px] border-2 border-line bg-card px-5 pt-5 pb-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label="닫기" onClick={() => setOpen(false)} className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full text-2xl leading-none text-muted">
              ×
            </button>
            <h2 id="store-gate-title" className="font-display text-[23px] font-normal">가게 등록 전에 확인해 주세요</h2>
            <p className="text-lg leading-relaxed">
              가게를 등록하면 <b>확인 연락</b>이 가요. 연락에 <b>응해 주셔야 가게 정보가 유지</b>됩니다.
            </p>
            <button type="button" disabled={busy} onClick={agree} className="min-h-16 self-end rounded-[20px] border-2 border-sage-deep bg-sage px-6 font-display text-xl text-white disabled:opacity-60">
              {busy ? "잠시만요…" : "확인했습니다"}
            </button>
          </div>
        </div>
      )}
      {node}
    </>
  );
}
