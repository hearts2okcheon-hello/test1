"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import { formatPhone } from "@/lib/hours";
import { AREAS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/client";
import type { ResidentItem, StoreInfoItem } from "@/lib/types";
import { StoreInfoPanel } from "./StoreInfoPanel";

const INPUT = "min-h-12 w-full min-w-0 rounded-2xl border-2 border-line bg-white px-3 text-base";

/** 이용자 정보: 주민 정보 · 가게 정보를 눌러 나눠 본다 */
export function UserInfoPanel({ stores, residents }: { stores: StoreInfoItem[]; residents: ResidentItem[] }) {
  const [view, setView] = useState<"residents" | "stores">("residents");
  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="이용자 정보 종류" className="grid grid-cols-2 gap-2">
        {(
          [
            ["residents", `주민 정보 ${residents.length}`],
            ["stores", `가게 정보 ${stores.length}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`min-h-12 rounded-2xl border-2 text-base font-bold ${view === id ? "border-ink bg-yellow" : "border-line bg-card"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {view === "residents" ? <ResidentPanel items={residents} /> : <StoreInfoPanel items={stores} />}
    </div>
  );
}

/** 내 정보를 등록한 주민 목록. 이름·전화번호로 찾고, 관리자가 고칠 수 있다 */
function ResidentPanel({ items }: { items: ResidentItem[] }) {
  const router = useRouter();
  const { node, show } = useToast();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", nickname: "", area: "", phone: "" });

  async function save(item: ResidentItem) {
    setBusy(true);
    try {
      const { error } = await createClient().rpc("admin_update_resident", {
        p_user_id: item.user_id,
        p_name: form.name,
        p_nickname: form.nickname,
        p_area: form.area,
        p_phone: form.phone,
      });
      if (error) throw error;
      setEditing(null);
      show("주민 정보를 고쳤어요.", "proud");
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  const needle = q.replace(/[\s-]/g, "");
  const filtered = items.filter((r) => !needle || r.name.replace(/\s/g, "").includes(needle) || r.phone.includes(needle));

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-[22px] font-normal">등록된 주민 {items.length}명</h2>
      {items.length > 0 && <input aria-label="주민 찾기" value={q} onChange={(e) => setQ(e.target.value)} placeholder="주민 이름·전화번호로 찾기" className={INPUT} />}
      {items.length === 0 && <p className="rounded-[20px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">아직 내 정보를 등록한 주민이 없어요.</p>}
      {filtered.map((r) => (
        <div key={r.user_id} className="flex flex-col gap-2 rounded-[20px] border-2 border-line bg-card px-3.5 py-3">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 text-base break-words text-muted">
              <b className="font-bold text-ink">{r.name}</b>, {formatPhone(r.phone)}
              <span className="block text-sm">
                {[r.nickname, r.area, r.store_name ? `가게: ${r.store_name}` : null].filter(Boolean).join(" · ")}
              </span>
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setForm({ name: r.name, nickname: r.nickname ?? "", area: r.area, phone: formatPhone(r.phone) });
                setEditing(editing === r.user_id ? null : r.user_id);
              }}
              className="min-h-11 shrink-0 rounded-2xl border-2 border-line bg-white px-2.5 text-sm font-bold"
            >
              {editing === r.user_id ? "닫기" : "고치기"}
            </button>
          </div>
          {editing === r.user_id && (
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                save(r);
              }}
            >
              <input aria-label="이름" value={form.name} maxLength={20} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="이름" className={INPUT} />
              <input aria-label="닉네임" value={form.nickname} maxLength={20} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="닉네임" className={INPUT} />
              <input aria-label="사는 곳" list="okc-areas" value={form.area} maxLength={20} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="사는 곳" className={INPUT} />
              <input type="tel" inputMode="tel" aria-label="전화번호" value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="010-0000-0000" className={INPUT} />
              <button type="submit" disabled={busy || !form.name.trim() || !form.area.trim() || form.phone.replace(/\D/g, "").length < 9} className="min-h-12 rounded-2xl border-2 border-yellow-deep bg-yellow px-4 font-bold disabled:opacity-50">
                저장
              </button>
            </form>
          )}
        </div>
      ))}
      <datalist id="okc-areas">
        {AREAS.map((a) => <option key={a} value={a} />)}
      </datalist>
      {node}
    </section>
  );
}
