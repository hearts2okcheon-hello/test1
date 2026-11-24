"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useToast } from "@/components/Toast";
import { deleteStoreWithPhotos } from "@/lib/admin-store";
import { askDelete } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { formatPhone } from "@/lib/hours";
import { articleDate, articleUrl, articlesByStore } from "@/lib/storeArticles";
import { createClient } from "@/lib/supabase/client";
import type { StoreArticle, StoreInfoItem } from "@/lib/types";
import { linkStoreArticle } from "./actions";

/** 가게마다 붙일 수 있는 기사 수 (DB 의 admin_link_store_article 과 같다) */
const ARTICLE_MAX = 5;
const ROW_BUTTON = "min-h-11 shrink-0 rounded-2xl border-2 border-line bg-white px-3 text-sm font-bold";

/**
 * 가게 이름과 사장님 전화번호 목록. 번호가 없는 가게는 여기서 넣는다.
 * "기사"를 누르면 그 가게에 옥천신문 기사를 붙이거나 뗀다 (ADR-020). 붙인 기사는 가게 목록의 가게 칸에서 펼쳐 볼 수 있다
 */
export function StoreInfoPanel({ items, articles }: { items: StoreInfoItem[]; articles: StoreArticle[] }) {
  const router = useRouter();
  const { node, show } = useToast();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  // 가게 하나에서 한 가지만 펼친다: 번호 수정 또는 기사
  const [panel, setPanel] = useState<{ id: string; kind: "phone" | "articles" } | null>(null);
  const [phone, setPhone] = useState("");
  const [url, setUrl] = useState("");
  const byStore = useMemo(() => articlesByStore(articles), [articles]);

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

  function toggle(id: string, kind: "phone" | "articles") {
    setPanel(panel?.id === id && panel.kind === kind ? null : { id, kind });
    setUrl("");
  }

  async function remove(item: StoreInfoItem) {
    if (!(await askDelete({ detail: `${item.name}의 소식·메뉴·사진·댓글이 모두 사라지고 되돌릴 수 없어요.` }))) return;
    run(() => deleteStoreWithPhotos(item.store_id), `${item.name}을(를) 지웠어요.`);
  }

  function savePhone(item: StoreInfoItem) {
    run(async () => {
      const { error } = await createClient().rpc("admin_set_store_phone", { p_store_id: item.store_id, p_phone: phone });
      if (error) throw error;
      setPanel(null);
      setPhone("");
    }, "전화번호를 저장했어요.");
  }

  // 기사 주소를 붙여 넣으면 제목·사진·날짜는 서버가 옥천신문 기사 화면에서 읽어 온다
  function attach(item: StoreInfoItem) {
    run(async () => {
      const result = await linkStoreArticle(item.store_id, url);
      if (!result.ok) throw new Error(result.error);
      setUrl("");
    }, "기사를 붙였어요.");
  }

  async function detach(item: StoreInfoItem, article: StoreArticle) {
    if (!(await askDelete({ title: "이 기사를 뗄까요?", detail: `"${article.title}"\n${item.name}에서만 떼요. 옥천신문 기사는 그대로 있어요.` }))) return;
    run(async () => {
      const { error } = await createClient().rpc("admin_unlink_store_article", { p_store_id: item.store_id, p_article_id: article.article_id });
      if (error) throw error;
    }, "기사를 뗐어요.");
  }

  const needle = q.replace(/[\s-]/g, "");
  const filtered = items.filter((s) => !needle || s.name.replace(/\s/g, "").includes(needle) || (s.phone ?? "").includes(needle) || (s.owner_name ?? "").replace(/\s/g, "").includes(needle));

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-[22px] font-normal">등록된 가게 {items.length}곳</h2>
      {items.length > 0 && (
        <input aria-label="목록에서 찾기" value={q} onChange={(e) => setQ(e.target.value)} placeholder="가게 이름·전화번호·주민 이름으로 찾기" className="min-h-12 rounded-2xl border-2 border-line bg-white px-3 text-base" />
      )}
      {items.length === 0 && <p className="rounded-[20px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">아직 등록된 가게가 없어요.</p>}
      {filtered.map((s) => {
        const linked = byStore[s.store_id] ?? [];
        const open = panel?.id === s.store_id ? panel.kind : null;
        return (
          <div key={s.store_id} className="flex flex-col gap-2 rounded-[20px] border-2 border-line bg-card px-3.5 py-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-base break-words text-muted">
                <b className="font-bold text-ink">{s.name}</b>
                {s.phone ? `, ${formatPhone(s.phone)}` : ", 전화번호 없음"}
              </p>
              {/* 가게를 등록한 주민과 주소 */}
              <p className="text-sm break-words text-muted">
                주민 <b className="text-ink">{s.owner_name ?? "등록 정보 없음"}</b>
                {s.owner_area ? ` (${s.owner_area})` : ""}
              </p>
              <p className="text-sm break-words text-muted">주소 {s.address ?? "없음"}</p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" disabled={busy} aria-expanded={open === "articles"} onClick={() => toggle(s.store_id, "articles")} className={`${ROW_BUTTON} ${open === "articles" ? "border-ink bg-yellow" : ""}`}>
                기사 {linked.length}
              </button>
              <button
                type="button"
                disabled={busy}
                aria-expanded={open === "phone"}
                onClick={() => {
                  setPhone(s.phone ? formatPhone(s.phone) : "");
                  toggle(s.store_id, "phone");
                }}
                className={`${ROW_BUTTON} ${open === "phone" ? "border-ink bg-yellow" : ""}`}
              >
                번호 수정
              </button>
              <button type="button" disabled={busy} onClick={() => remove(s)} className={`${ROW_BUTTON} text-danger`}>
                지우기
              </button>
            </div>

            {open === "phone" && (
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

            {open === "articles" && (
              <div className="flex flex-col gap-2 rounded-2xl bg-cream p-2.5">
                <p className="text-sm leading-normal">
                  <b>옥천신문 기사</b> {linked.length}/{ARTICLE_MAX}
                  <span className="text-muted"> · 가게 목록의 가게 칸에서 펼쳐 볼 수 있어요</span>
                </p>
                {linked.map((a) => (
                  <div key={a.article_id} className="flex items-center gap-2 rounded-xl border-2 border-line bg-white py-1.5 pr-1 pl-2.5">
                    <a href={articleUrl(a.article_id)} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="line-clamp-2 text-sm font-bold break-keep">{a.title}</span>
                      <span className="text-xs text-muted">
                        {articleDate(a.published_at) ?? "날짜 없음"}
                        {a.image_url ? " · 사진 있음" : ""}
                      </span>
                    </a>
                    <button type="button" disabled={busy} onClick={() => detach(s, a)} className="min-h-11 shrink-0 rounded-xl px-2.5 text-sm font-bold text-danger">
                      떼기
                    </button>
                  </div>
                ))}
                {linked.length < ARTICLE_MAX ? (
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      attach(s);
                    }}
                  >
                    <input
                      inputMode="url"
                      aria-label={`${s.name}에 붙일 옥천신문 기사 주소`}
                      autoFocus
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="기사 주소 붙여넣기"
                      className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-line bg-white px-3 text-base"
                    />
                    <button type="submit" disabled={busy || !url.trim()} className="min-h-12 shrink-0 rounded-2xl border-2 border-yellow-deep bg-yellow px-4 font-bold disabled:opacity-50">
                      {busy ? "붙이는 중…" : "붙이기"}
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-muted">가게마다 {ARTICLE_MAX}개까지 붙일 수 있어요. 새 기사를 붙이려면 먼저 하나를 떼 주세요.</p>
                )}
                <p className="text-xs leading-normal text-muted">옥천신문 기사 화면의 주소를 붙여 넣으면 제목·사진·날짜를 자동으로 가져와요.</p>
              </div>
            )}
          </div>
        );
      })}
      {node}
    </section>
  );
}
