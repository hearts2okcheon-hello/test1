"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { deleteStoreWithPhotos } from "@/lib/admin-store";
import { askDelete } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { formatPhone } from "@/lib/hours";
import { createClient } from "@/lib/supabase/client";
import type { StoreInfoItem } from "@/lib/types";

/** 가게 이름과 사장님 전화번호 목록. 번호가 없는 가게는 여기서 넣는다 */
export function StoreInfoPanel({ items }: { items: StoreInfoItem[] }) {
  const router = useRouter();
  const { node, show } = useToast();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [phone, setPhone] = useState("");

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    try {
      await action();
      show(done, "proud");
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: StoreInfoItem) {
    if (!(await askDelete({ detail: `${item.name}의 소식·메뉴·사진·댓글이 모두 사라지고 되돌릴 수 없어요.` }))) return;
    run(() => deleteStoreWithPhotos(item.store_id), `${item.name}을(를) 지웠어요.`);
  }

  function savePhone(item: StoreInfoItem) {
    run(async () => {
      const { error } = await createClient().rpc("admin_set_store_phone", { p_store_id: item.store_id, p_phone: phone });
      if (error) throw error;
      setEditing(null);
      setPhone("");
    }, "전화번호를 저장했어요.");
  }

  const needle = q.replace(/[\s-]/g, "");
  const filtered = items.filter((s) => !needle || s.name.replace(/\s/g, "").includes(needle) || (s.phone ?? "").includes(needle));

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-[22px] font-normal">등록된 가게 {items.length}곳</h2>
      {items.length > 0 && (
        <input aria-label="목록에서 찾기" value={q} onChange={(e) => setQ(e.target.value)} placeholder="가게 이름·전화번호로 찾기" className="min-h-12 rounded-2xl border-2 border-line bg-white px-3 text-base" />
      )}
      {items.length === 0 && <p className="rounded-[20px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">아직 등록된 가게가 없어요.</p>}
      {filtered.map((s) => (
        <div key={s.store_id} className="flex flex-col gap-2 rounded-[20px] border-2 border-line bg-card px-3.5 py-3">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 text-base break-words text-muted">
              <b className="font-bold text-ink">{s.name}</b>
              {s.phone ? `, ${formatPhone(s.phone)}` : ", 전화번호 없음"}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setPhone(s.phone ? formatPhone(s.phone) : "");
                setEditing(editing === s.store_id ? null : s.store_id);
              }}
              className="min-h-11 shrink-0 rounded-2xl border-2 border-line bg-white px-2.5 text-sm font-bold"
            >
              번호 수정
            </button>
            <button type="button" disabled={busy} onClick={() => remove(s)} className="min-h-11 shrink-0 rounded-2xl border-2 border-line bg-white px-2.5 text-sm font-bold text-[#A4423F]">
              지우기
            </button>
          </div>
          {editing === s.store_id && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                savePhone(s);
              }}
            >
              <input type="tel" inputMode="tel" aria-label={`${s.name} 전화번호`} autoFocus value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-line bg-white px-3 text-base" />
              <button type="submit" disabled={busy || phone.replace(/\D/g, "").length < 9} className="min-h-12 shrink-0 rounded-2xl border-2 border-yellow-deep bg-yellow px-4 font-bold disabled:opacity-50">
                저장
              </button>
            </form>
          )}
        </div>
      ))}
      {node}
    </section>
  );
}
