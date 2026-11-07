"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { askDelete } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { formatPhone } from "@/lib/hours";
import { createClient } from "@/lib/supabase/client";
import type { IssuedCode, OwnerCodeItem } from "@/lib/types";

/** 전화번호를 넣으면 그 번호의 사장님 코드가 나온다. 없으면 새로 만든다 (ADR-007) */
export function CodePanel({ items, unlinkedStores }: { items: OwnerCodeItem[]; unlinkedStores: { store_id: string; name: string }[] }) {
  const router = useRouter();
  const { node, show } = useToast();
  const [phone, setPhone] = useState("");
  const [storeId, setStoreId] = useState("");
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<IssuedCode | null>(null);
  const [q, setQ] = useState("");

  async function issue() {
    setBusy(true);
    try {
      const { data, error } = await createClient().rpc("admin_issue_code", { p_phone: phone, p_store_id: storeId || null });
      if (error) throw error;
      setIssued(data as IssuedCode);
      setStoreId("");
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  async function reissue(item: OwnerCodeItem) {
    const who = item.store_name ?? formatPhone(item.phone);
    if (!window.confirm(`${who}의 코드를 새로 바꿀까요?\n예전 코드는 못 쓰게 되고, 연결된 기기 ${item.member_count}대도 모두 끊어져요.`)) return;
    setBusy(true);
    try {
      const { data, error } = await createClient().rpc("admin_reissue_code", { p_phone: item.phone });
      if (error) throw error;
      setIssued(data as IssuedCode);
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: OwnerCodeItem) {
    const answer = await askDelete({
      detail: `${formatPhone(item.phone)} · ${item.code}\n연결된 기기 ${item.member_count}대가 끊어져요.${item.store_name ? ` 가게 "${item.store_name}"는 남아요.` : ""}`,
      password: item.protected,
    });
    if (!answer) return;
    setBusy(true);
    try {
      const { data, error } = await createClient().rpc("admin_delete_code", { p_phone: item.phone, p_password: answer.password || null });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error);
      if (issued?.phone === item.phone) setIssued(null);
      show("코드를 지웠어요.", "proud");
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  const needle = q.replace(/[\s-]/g, "");
  const filtered = items.filter((c) => !needle || c.phone.includes(needle) || c.code.replace("-", "").includes(needle) || (c.store_name ?? "").replace(/\s/g, "").includes(needle));

  return (
    <section className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-3 rounded-[22px] border-2 border-line bg-card px-4 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          issue();
        }}
      >
        <h2 className="font-display text-[22px] font-normal">전화번호로 코드 찾기·만들기</h2>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold">사장님 전화번호</span>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => {
              setPhone(formatPhone(e.target.value));
              setIssued(null);
            }}
            placeholder="010-0000-0000"
            className="min-h-14 rounded-2xl border-2 border-line bg-white px-3.5 text-xl"
          />
        </label>
        {unlinkedStores.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold">이미 등록해 둔 가게에 연결 (선택)</span>
            <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className="min-h-12 rounded-2xl border-2 border-line bg-white px-3 text-base">
              <option value="">연결 안 함 — 사장님이 직접 등록해요</option>
              {unlinkedStores.map((s) => (
                <option key={s.store_id} value={s.store_id}>{s.name}</option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" disabled={busy || phone.replace(/\D/g, "").length < 9} className="min-h-14 rounded-[20px] border-2 border-yellow-deep bg-yellow font-display text-xl disabled:border-line disabled:bg-[#EFE9DF] disabled:text-muted">
          코드 보기
        </button>
        {issued && (
          <div role="status" className="ok-pop flex flex-col items-center gap-1 rounded-[20px] border-2 border-sage-deep bg-sage-soft px-3 py-4 text-center">
            <span className="text-sm">{formatPhone(issued.phone)}</span>
            <span className="font-display text-[42px] leading-tight">{issued.code}</span>
            <span className="text-sm text-muted">
              {issued.created === true ? "새로 만든 코드예요." : issued.created === false ? "이 번호에 이미 발급된 코드예요." : "새 코드로 바꿨어요."}
              {issued.store_name ? ` 연결된 가게: ${issued.store_name}` : ""}
            </span>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(issued.code);
                show("코드를 복사했어요.", "proud");
              }}
              className="mt-1 min-h-11 rounded-2xl border-2 border-line bg-white px-4 text-sm font-bold"
            >
              코드 복사
            </button>
          </div>
        )}
        <p className="text-sm leading-relaxed text-muted">사장님이 맞는지 확인한 뒤 코드를 불러 드리세요. 번호 하나에 코드 하나이고, 같은 번호를 다시 넣으면 같은 코드가 나와요.</p>
      </form>

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h2 className="flex-1 font-display text-[22px] font-normal">발급한 코드 {items.length}개</h2>
        </div>
        {items.length > 0 && (
          <input aria-label="목록에서 찾기" value={q} onChange={(e) => setQ(e.target.value)} placeholder="번호·코드·가게 이름으로 찾기" className="min-h-12 rounded-2xl border-2 border-line bg-white px-3 text-base" />
        )}
        {filtered.map((c) => (
          <div key={c.phone} className="flex items-center gap-2 rounded-[20px] border-2 border-line bg-card px-3.5 py-3">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-display text-[22px] leading-tight">{c.code}</span>
              <span className="text-sm">{formatPhone(c.phone)}</span>
              <span className="truncate text-xs text-muted">{c.store_name ?? "가게 등록 전"} · 기기 {c.member_count}대{c.protected ? " · 보호됨" : ""}</span>
            </span>
            {!c.protected && (
              <button type="button" disabled={busy} onClick={() => reissue(c)} className="min-h-11 shrink-0 rounded-2xl border-2 border-line bg-white px-2.5 text-sm font-bold">
                새 코드로
              </button>
            )}
            <button type="button" disabled={busy} onClick={() => remove(c)} className="min-h-11 shrink-0 rounded-2xl border-2 border-line bg-white px-2.5 text-sm font-bold text-[#A4423F]">
              지우기
            </button>
          </div>
        ))}
      </section>
      {node}
    </section>
  );
}
