"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Osori } from "@/components/Osori";
import { errorMessage } from "@/lib/errors";
import { createClient, ensureSession } from "@/lib/supabase/client";
import type { RedeemResult } from "@/lib/types";

const LETTERS = ["가", "나", "다", "라", "마", "바", "사", "아", "자", "차", "카", "타", "파", "하"];

/**
 * 사장님 코드(예: 타-00000)를 넣으면 이 기기가 사장님이 된다 (ADR-007).
 * 휴대폰에서 한글·숫자 자판을 오가지 않도록 글자는 버튼으로 고른다.
 */
export function CodeEntry() {
  const router = useRouter();
  const [letter, setLetter] = useState<string | null>(null);
  const [digits, setDigits] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = letter !== null && digits.length === 5;

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      await ensureSession(supabase);
      const { data, error } = await supabase.rpc("redeem_store_code", { p_code: `${letter}-${digits}` });
      if (error) throw error;
      const result = data as RedeemResult;
      if (!result.ok) {
        setError(errorMessage({ message: result.error }));
        setDigits("");
        return;
      }
      if (result.needs_store) router.push("/owner/register");
      else router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col items-center gap-4 rounded-[22px] border-2 border-line bg-card px-4 py-6 text-center">
      <Osori mood="proud" size={110} className="ok-bob" />
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[26px] font-normal">사장님, 반가워요!</h1>
        <p className="text-lg leading-relaxed text-muted">옥천신문에서 받은 사장님 코드를 넣어 주세요. 한 번만 넣으면 이 휴대폰에서 계속 쓸 수 있어요.</p>
      </div>
      <form
        className="flex w-full flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 w-full text-lg font-bold">첫 글자를 고르세요</legend>
          <div className="grid grid-cols-7 gap-1.5">
            {LETTERS.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={letter === l}
                onClick={() => setLetter(l)}
                className={`aspect-square min-h-11 rounded-xl border-2 font-display text-xl ${letter === l ? "border-yellow-deep bg-yellow" : "border-line bg-white"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-2">
          <span className="text-lg font-bold">숫자 5자리를 넣으세요</span>
          <span className="flex items-center gap-2">
            <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-[18px] border-2 border-line bg-cream font-display text-[30px]">
              {letter ?? "?"}
            </span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={5}
              value={digits}
              onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="00000"
              className="min-h-16 w-full min-w-0 rounded-[18px] border-2 border-line bg-white text-center font-display text-[32px] tracking-[0.2em] placeholder:text-line"
            />
          </span>
        </label>
        <button
          type="submit"
          disabled={!ready || busy}
          className={`min-h-16 rounded-[22px] border-2 font-display text-xl ${ready && !busy ? "border-sage-deep bg-sage text-white" : "border-line bg-[#EFE9DF] text-muted"}`}
        >
          {busy ? "확인하는 중…" : "내 가게로 들어가기"}
        </button>
      </form>
      {error && <p role="alert" className="text-base font-bold text-[#A4423F]">{error}</p>}
      <p className="text-base text-muted">코드가 없으시면 옥천신문에 전화 주세요. 전화번호로 코드를 찾아 알려 드려요.</p>
    </section>
  );
}
