"use client";

import { useState } from "react";
import { REPORT_KINDS, REPORT_STYLES } from "@/lib/signs";
import { errorMessage } from "@/lib/errors";
import { createClient, ensureSession } from "@/lib/supabase/client";
import type { ReportKind } from "@/lib/types";
import { Osori } from "./Osori";

type StoreOption = { store_id: string; name: string };

/** 이웃 제보 바텀 시트 — 가게 고르고, 본 것 하나 누르기 */
export function ReportSheet({
  stores,
  initialStoreId,
  onClose,
  onDone,
}: {
  stores: StoreOption[];
  initialStoreId?: string;
  onClose: () => void;
  onDone: (storeId: string, kind: ReportKind) => void;
}) {
  const [storeId, setStoreId] = useState(initialStoreId ?? stores[0]?.store_id);
  const [choice, setChoice] = useState<ReportKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!choice || !storeId) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      await ensureSession(supabase);
      const { error } = await supabase.rpc("post_report", { p_store_id: storeId, p_kind: choice });
      if (error) throw error;
      onDone(storeId, choice);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto max-w-[480px]">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-[rgba(74,61,55,0.45)]" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="가게 상황 알려주기"
        className="absolute inset-x-2.5 bottom-2.5 flex max-h-[90dvh] flex-col gap-3.5 overflow-y-auto rounded-[28px] border-2 border-line bg-card px-[18px] pt-4 pb-[18px]"
      >
        <div className="flex items-center gap-2">
          <Osori mood="find" size={76} />
          <div className="flex flex-col">
            <span className="font-display text-[22px]">지금 가게 어땠나요?</span>
            <span className="text-[13px] text-muted">
              {initialStoreId ? "본 것 하나만 눌러 주세요" : "가게를 고르고, 본 것 하나만 눌러 주세요"}
            </span>
          </div>
        </div>

        {!initialStoreId && (
          <div className="flex flex-wrap gap-1.5">
            {stores.map((s) => {
              const on = s.store_id === storeId;
              return (
                <button
                  key={s.store_id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setStoreId(s.store_id)}
                  className={`min-h-10 rounded-[20px] border-2 px-3 text-sm font-bold ${on ? "border-sage-deep bg-sage-soft" : "border-line bg-white"}`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {REPORT_KINDS.map((k) => {
            const on = k === choice;
            const r = REPORT_STYLES[k];
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => setChoice(k)}
                className={`flex min-h-[52px] items-center gap-3 rounded-[18px] border-2 px-4 text-left text-base font-bold ${on ? "border-sage-deep bg-sage-soft" : "border-line bg-white"}`}
              >
                <span className="size-3.5 shrink-0 rounded-full" style={{ background: r.color }} />
                <span className="flex-1">{r.label}</span>
                {on && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5E7F55" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {error && <p className="text-sm font-bold text-[#A4423F]">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={!choice || busy}
          className={`min-h-14 rounded-[22px] border-2 font-display text-xl ${choice && !busy ? "border-sage-deep bg-sage text-white" : "border-line bg-[#EFE9DF] text-muted"}`}
        >
          {busy ? "알리는 중…" : "이웃에게 알려주기"}
        </button>
        <p className="text-center text-xs text-muted">제보는 사장님이 확인하기 전까지 &ldquo;확인 중&rdquo;으로 보여요. 누가 알렸는지는 보이지 않아요.</p>
      </section>
    </div>
  );
}
