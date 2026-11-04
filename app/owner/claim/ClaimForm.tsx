"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";

type Store = { id: string; name: string; category: string | null; address: string | null };

export function ClaimForm({ stores }: { stores: Store[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = stores.filter((s) => s.name.includes(q.trim()));

  async function submit() {
    if (!picked) return;
    setBusy(true);
    setError(null);
    const { error } = await createClient().rpc("request_claim", { p_store_id: picked, p_phone: phone || null });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    router.push("/owner");
    router.refresh();
  }

  return (
    <>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="가게 이름으로 찾기"
        aria-label="가게 이름으로 찾기"
        className="min-h-12 rounded-2xl border-2 border-line bg-white px-3 text-base"
      />
      <ul className="flex flex-col gap-2">
        {list.map((s) => {
          const on = s.id === picked;
          return (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setPicked(s.id)}
                className={`flex min-h-16 w-full flex-col justify-center rounded-[20px] border-2 px-4 py-2 text-left ${on ? "border-sage-deep bg-sage-soft" : "border-line bg-card"}`}
              >
                <span className="text-[17px] font-bold">{s.name}</span>
                <span className="text-[13px] text-muted">{[s.category, s.address].filter(Boolean).join(" · ")}</span>
              </button>
            </li>
          );
        })}
        {list.length === 0 && (
          <li className="rounded-[20px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">
            가게가 목록에 없으면 옥천신문에 전화 주세요. 등록해 드려요.
          </li>
        )}
      </ul>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">연락받을 전화번호 (선택)</span>
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-0000-0000"
          className="min-h-12 rounded-2xl border-2 border-line bg-white px-3 text-base"
        />
        <span className="text-xs text-muted">옥천신문이 사장님이 맞는지 확인할 때만 써요.</span>
      </label>

      {error && <p className="text-sm font-bold text-[#A4423F]">{error}</p>}
      <button
        type="button"
        disabled={!picked || busy}
        onClick={submit}
        className={`min-h-14 rounded-[22px] border-2 font-display text-xl ${picked && !busy ? "border-sage-deep bg-sage text-white" : "border-line bg-[#EFE9DF] text-muted"}`}
      >
        이 가게 사장님이에요
      </button>
    </>
  );
}
