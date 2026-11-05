"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Osori } from "@/components/Osori";
import { errorMessage } from "@/lib/errors";
import { createClient, ensureSession } from "@/lib/supabase/client";
import type { RedeemResult } from "@/lib/types";

/** 가게 코드 6자리를 넣으면 이 기기가 그 가게 사장님이 된다 (ADR-006) */
export function CodeEntry() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      await ensureSession(supabase);
      const { data, error } = await supabase.rpc("redeem_store_code", { p_code: code });
      if (error) throw error;
      const result = data as RedeemResult;
      if (!result.ok) {
        setError(errorMessage({ message: result.error }));
        setCode("");
        return;
      }
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col items-center gap-4 rounded-[22px] border-2 border-line bg-card px-5 py-6 text-center">
      <Osori mood="proud" size={110} className="ok-bob" />
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[26px] font-normal">사장님, 반가워요!</h1>
        <p className="text-base leading-relaxed text-muted">옥천신문에서 받은 가게 코드 6자리를 넣어 주세요. 한 번만 넣으면 이 휴대폰에서 계속 쓸 수 있어요.</p>
      </div>
      <form
        className="flex w-full flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="store-code" className="sr-only">
          가게 코드 6자리
        </label>
        <input
          id="store-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          className="min-h-16 w-full rounded-[18px] border-2 border-line bg-white text-center font-display text-[34px] tracking-[0.4em] placeholder:text-line"
        />
        <button
          type="submit"
          disabled={code.length !== 6 || busy}
          className={`min-h-14 rounded-[22px] border-2 font-display text-xl ${code.length === 6 && !busy ? "border-sage-deep bg-sage text-white" : "border-line bg-[#EFE9DF] text-muted"}`}
        >
          {busy ? "확인하는 중…" : "내 가게 연결하기"}
        </button>
      </form>
      {error && <p className="text-sm font-bold text-[#A4423F]">{error}</p>}
      <p className="text-sm text-muted">코드가 없으시면 옥천신문에 전화 주세요. 코드를 알려 드리거나 소식을 대신 올려 드려요.</p>
    </section>
  );
}
