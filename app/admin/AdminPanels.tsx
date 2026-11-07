"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ConfirmCard } from "@/components/ConfirmCard";
import { NoticeButtons } from "@/components/NoticeButtons";
import { ScheduleBadge } from "@/components/ScheduleBadge";
import { SignChip } from "@/components/SignChip";
import { useToast } from "@/components/Toast";
import { askDelete } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { formatPhone, parseHours } from "@/lib/hours";
import { SIGN_STYLES } from "@/lib/signs";
import { createClient } from "@/lib/supabase/client";
import type { IssuedCode, OwnerCodeItem, OwnerNotice, QueueItem, StoreSign, Weekday } from "@/lib/types";

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

// ── 등록된 가게 고르기·지우기 ────────────────────────
export function StoreManager({ stores, codes }: { stores: StoreSign[]; codes: OwnerCodeItem[] }) {
  const router = useRouter();
  const { node, show } = useToast();
  const [storeId, setStoreId] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const store = stores.find((s) => s.store_id === storeId);
  const code = codes.find((c) => c.store_id === storeId);

  async function link() {
    setBusy(true);
    try {
      const { data, error } = await createClient().rpc("admin_issue_code", { p_phone: phone, p_store_id: storeId });
      if (error) throw error;
      setPhone("");
      show(`코드 ${(data as IssuedCode).code}와(과) 연결했어요.`, "proud");
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!store) return;
    const answer = await askDelete({
      detail: `${store.name}의 소식·메뉴·사진·댓글이 모두 사라지고 되돌릴 수 없어요.${code ? "\n사장님 코드는 남아요." : ""}`,
    });
    if (!answer) return;
    setBusy(true);
    try {
      const supabase = createClient();
      // 가게가 지워지면 사진 폴더 권한도 사라지므로 먼저 지운다
      const bucket = supabase.storage.from("store-media");
      const { data: files } = await bucket.list(store.store_id, { limit: 1000 });
      if (files?.length) await bucket.remove(files.map((f) => `${store.store_id}/${f.name}`));

      const { error } = await supabase.rpc("admin_delete_store", { p_store_id: store.store_id });
      if (error) throw error;
      show(`${store.name}을(를) 지웠어요.`, "proud");
      setStoreId("");
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-[22px] font-normal">등록된 가게 {stores.length}곳</h2>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">가게</span>
        <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className="min-h-12 rounded-2xl border-2 border-line bg-white px-3 text-base">
          <option value="">가게를 고르세요</option>
          {stores.map((s) => (
            <option key={s.store_id} value={s.store_id}>{s.name}</option>
          ))}
        </select>
      </label>
      {store && (
        <div className="flex flex-col gap-3 rounded-[20px] border-2 border-line bg-card px-3.5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-display text-xl">{store.name}</span>
            {store.sign === "none" ? <ScheduleBadge status={store.schedule_status} /> : <SignChip sign={store.sign} atTime={store.at_time} />}
          </div>
          {code ? (
            <p className="text-sm">
              사장님 코드 <b>{code.code}</b> · {formatPhone(code.phone)}
              {code.protected && " · 보호됨"}
            </p>
          ) : (
            <form
              className="flex flex-col gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                link();
              }}
            >
              <span className="text-sm font-bold">사장님 코드와 연결 (전화번호)</span>
              <span className="flex gap-2">
                <input type="tel" inputMode="tel" aria-label="사장님 전화번호" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-line bg-white px-3 text-base" />
                <button type="submit" disabled={busy || phone.replace(/\D/g, "").length < 9} className="min-h-12 shrink-0 rounded-2xl border-2 border-yellow-deep bg-yellow px-4 font-bold disabled:opacity-50">
                  연결
                </button>
              </span>
            </form>
          )}
          <div className="flex gap-2">
            <Link href={`/stores/${store.store_id}`} className="flex min-h-12 flex-1 items-center justify-center rounded-2xl border-2 border-line bg-white text-sm font-bold">
              가게 페이지 보기
            </Link>
            <button type="button" disabled={busy} onClick={remove} className="min-h-12 flex-1 rounded-2xl border-2 border-line bg-white text-sm font-bold text-[#A4423F]">
              이 가게 지우기
            </button>
          </div>
        </div>
      )}
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
  const [ownerPhone, setOwnerPhone] = useState("");
  const [linked, setLinked] = useState<{ name: string; code: string; phone: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

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
    setLinked(null);
    const { data, error } = await createClient().rpc("admin_register_store", {
      p_name: name,
      p_category: String(form.get("category") ?? "").trim() || null,
      p_address: String(form.get("address") ?? "").trim() || null,
      p_regular_hours: Object.keys(hours).length ? hours : null,
      p_is_pilot: form.get("is_pilot") === "on",
      p_phone: ownerPhone.trim() || null,
    });
    setBusy(false);
    if (error) return show(errorMessage(error), "think");
    const result = data as { code: string | null; phone: string | null };
    if (result.code && result.phone) setLinked({ name, code: result.code, phone: result.phone });
    show(`${name}을(를) 등록했어요.`, "proud");
    formRef.current?.reset();
    setOwnerPhone("");
    router.refresh();
  }

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const el = e.currentTarget;
        onSubmit(new FormData(el)).then(() => undefined);
      }}
    >
      <h2 className="font-display text-[22px] font-normal">새 가게 등록</h2>
      <p className="text-sm text-muted">영업시간은 &ldquo;09:00-19:00&rdquo;처럼 쓰고, 쉬는 날은 &ldquo;휴무&rdquo;, 모르면 비워 두세요.</p>
      <Field name="name" label="가게 이름" required />
      <Field name="category" label="종류 (식당·카페·간식·약국·의원 등)" />
      <Field name="address" label="주소" />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">사장님 전화번호 (선택)</span>
        <input type="tel" inputMode="tel" value={ownerPhone} onChange={(e) => setOwnerPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" className="min-h-12 rounded-2xl border-2 border-line bg-white px-3 text-base" />
        <span className="text-xs leading-normal text-muted">넣으면 이 번호의 고유 코드와 가게가 연결돼요. 코드가 없으면 새로 만들어요. 이 번호는 가게 페이지에 공개되지 않아요.</span>
      </label>
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
      {linked && (
        <div role="status" className="ok-pop flex flex-col items-center gap-1 rounded-[20px] border-2 border-sage-deep bg-sage-soft px-3 py-4 text-center">
          <span className="text-sm">{linked.name} · {formatPhone(linked.phone)}</span>
          <span className="font-display text-[34px] leading-tight">{linked.code}</span>
          <span className="text-sm text-muted">이 코드와 연결했어요. 사장님께 불러 드리세요.</span>
        </div>
      )}
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
