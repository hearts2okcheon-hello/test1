"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmCard } from "@/components/ConfirmCard";
import { NoticeButtons } from "@/components/NoticeButtons";
import { SignChip } from "@/components/SignChip";
import { TimeAgo } from "@/components/TimeAgo";
import { useToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import { parseHours } from "@/lib/hours";
import { SIGN_STYLES } from "@/lib/signs";
import { createClient } from "@/lib/supabase/client";
import type { ClaimItem, OwnerNotice, QueueItem, StoreSign, Weekday } from "@/lib/types";

// ── 엇갈림·무응답 ────────────────────────────────────
export function QueueList({ items }: { items: QueueItem[] }) {
  const router = useRouter();
  const { node, show } = useToast();
  const [busy, setBusy] = useState(false);

  async function answer(id: string, yes: boolean) {
    setBusy(true);
    const { error } = await createClient().rpc("answer_report", { p_report_id: id, p_yes: yes });
    setBusy(false);
    if (error) return show(errorMessage(error), "think");
    show("옥천신문 확인으로 팻말을 바꿨어요.", "proud");
    router.refresh();
  }

  if (items.length === 0) {
    return <p className="rounded-[20px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">지금 확인할 제보가 없어요.</p>;
  }
  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-muted">사장님께 전화로 확인한 뒤 답해 주세요. 답하면 &ldquo;옥천신문 확인&rdquo;으로 표시돼요.</p>
      {items.map((q) => (
        <div key={q.report_id} className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-muted">
            {q.reason === "conflict" && q.notice_kind
              ? `엇갈림 — 지금 팻말은 "${SIGN_STYLES[q.notice_kind].chip}"`
              : "무응답 — 30분 넘게 사장님 답이 없어요"}
          </span>
          <ConfirmCard kind={q.report_kind} createdAt={q.report_created_at} agreeCount={q.agree_count} storeName={q.store_name} busy={busy} onAnswer={(yes) => answer(q.report_id, yes)} />
        </div>
      ))}
      {node}
    </section>
  );
}

// ── 대리 등록 ────────────────────────────────────────
type NoticeRow = {
  id: string;
  store_id: string;
  kind: OwnerNotice["kind"];
  at_time: string | null;
  memo: string | null;
  source: OwnerNotice["source"];
  created_at: string;
  from_report_id: string | null;
};

export function ProxyPanel({ stores, notices }: { stores: StoreSign[]; notices: NoticeRow[] }) {
  const [storeId, setStoreId] = useState<string | null>(null);
  const store = stores.find((s) => s.store_id === storeId);
  const n = notices.filter((x) => x.store_id === storeId).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const current: OwnerNotice | null = n
    ? { id: n.id, kind: n.kind, at_time: n.at_time, memo: n.memo, source: n.source, created_at: n.created_at, created_by_me: false, from_report: !!n.from_report_id }
    : null;

  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-muted">사장님이 전화로 알려주신 소식을 대신 올려요. 출처는 &ldquo;옥천신문 확인&rdquo;으로 보여요.</p>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">가게</span>
        <select
          value={storeId ?? ""}
          onChange={(e) => setStoreId(e.target.value || null)}
          className="min-h-12 rounded-2xl border-2 border-line bg-white px-3 text-base"
        >
          <option value="">가게를 고르세요</option>
          {stores.map((s) => (
            <option key={s.store_id} value={s.store_id}>
              {s.name} — {SIGN_STYLES[s.sign].chip}
            </option>
          ))}
        </select>
      </label>
      {store && (
        <>
          <div className="flex items-center gap-2 rounded-[18px] border-2 border-line bg-card px-3.5 py-2.5">
            <span className="flex-1 text-sm">지금 팻말</span>
            <SignChip sign={store.sign} atTime={store.at_time} />
          </div>
          <NoticeButtons key={store.store_id} storeId={store.store_id} current={current} proxy />
        </>
      )}
    </section>
  );
}

// ── 가게 인증 ────────────────────────────────────────
export function ClaimList({ items }: { items: ClaimItem[] }) {
  const router = useRouter();
  const { node, show } = useToast();
  const [busy, setBusy] = useState(false);

  async function review(id: string, approve: boolean) {
    setBusy(true);
    const { error } = await createClient().rpc("review_claim", { p_claim_id: id, p_approve: approve });
    setBusy(false);
    if (error) return show(errorMessage(error), "think");
    show(approve ? "가게를 연결했어요." : "요청을 거절했어요.", approve ? "proud" : "smile");
    router.refresh();
  }

  if (items.length === 0) {
    return <p className="rounded-[20px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">기다리는 인증 요청이 없어요.</p>;
  }
  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-muted">전화나 방문으로 사장님이 맞는지 확인한 뒤 승인해 주세요.</p>
      {items.map((c) => (
        <div key={c.claim_id} className="flex flex-col gap-2 rounded-[20px] border-2 border-line bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-base font-bold">{c.store_name}</span>
            <span className="text-xs text-muted">
              <TimeAgo iso={c.created_at} />
            </span>
          </div>
          <span className="text-sm">
            {c.user_name ?? "이름 없음"} · {c.phone ? <a className="font-bold underline" href={`tel:${c.phone}`}>{c.phone}</a> : "전화번호 없음"}
          </span>
          {c.store_has_owner && <span className="text-sm font-bold text-[#A4423F]">이미 다른 사장님이 연결된 가게예요. 승인하면 바뀌어요.</span>}
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => review(c.claim_id, true)} className="min-h-12 flex-1 rounded-2xl border-2 border-yellow-deep bg-yellow font-bold">
              승인
            </button>
            <button type="button" disabled={busy} onClick={() => review(c.claim_id, false)} className="min-h-12 flex-1 rounded-2xl border-2 border-line bg-white font-bold">
              거절
            </button>
          </div>
        </div>
      ))}
      {node}
    </section>
  );
}

// ── 가게 등록 ────────────────────────────────────────
const DAYS: [Weekday, string][] = [
  ["mon", "월"], ["tue", "화"], ["wed", "수"], ["thu", "목"], ["fri", "금"], ["sat", "토"], ["sun", "일"],
];

export function StoreForm() {
  const router = useRouter();
  const { node, show } = useToast();
  const [busy, setBusy] = useState(false);

  async function onSubmit(form: FormData) {
    const name = String(form.get("name") ?? "").trim();
    if (!name) return show("가게 이름을 써 주세요.", "think");
    const hours: Record<string, [string, string][] | null> = {};
    for (const [d, label] of DAYS) {
      const raw = String(form.get(d) ?? "");
      const v = parseHours(raw);
      if (v === undefined && raw.trim() !== "") return show(`${label}요일 시간 형식을 확인해 주세요 (예: 09:00-19:00, 휴무)`, "think");
      if (v !== undefined) hours[d] = v;
    }
    setBusy(true);
    const { error } = await createClient().rpc("admin_upsert_store", {
      p_name: name,
      p_category: String(form.get("category") ?? "").trim() || null,
      p_address: String(form.get("address") ?? "").trim() || null,
      p_regular_hours: Object.keys(hours).length ? hours : null,
      p_is_pilot: form.get("is_pilot") === "on",
    });
    setBusy(false);
    if (error) return show(errorMessage(error), "think");
    show(`${name}을(를) 등록했어요.`, "proud");
    router.refresh();
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const el = e.currentTarget;
        onSubmit(new FormData(el)).then(() => undefined);
      }}
    >
      <p className="text-sm text-muted">새 가게를 등록해요. 영업시간은 &ldquo;09:00-19:00&rdquo;처럼 쓰고, 쉬는 날은 &ldquo;휴무&rdquo;, 모르면 비워 두세요.</p>
      <Field name="name" label="가게 이름" required />
      <Field name="category" label="종류 (식당·카페·간식·약국·의원 등)" />
      <Field name="address" label="주소" />
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="mb-1.5 text-sm font-bold">평소 영업시간</legend>
        {DAYS.map(([d, label]) => (
          <label key={d} className="flex items-center gap-2 text-sm">
            <span className="w-4 font-bold">{label}</span>
            <input name={d} placeholder="09:00-19:00" className="min-h-11 min-w-0 flex-1 rounded-xl border-2 border-line bg-white px-2" />
          </label>
        ))}
      </fieldset>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" name="is_pilot" defaultChecked className="size-5" /> 시범 참여 가게
      </label>
      <button type="submit" disabled={busy} className="min-h-14 rounded-[22px] border-2 border-sage-deep bg-sage font-display text-xl text-white">
        가게 등록
      </button>
      {node}
    </form>
  );
}

function Field({ name, label, required }: { name: string; label: string; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold">{label}</span>
      <input name={name} required={required} className="min-h-12 rounded-2xl border-2 border-line bg-white px-3 text-base" />
    </label>
  );
}
