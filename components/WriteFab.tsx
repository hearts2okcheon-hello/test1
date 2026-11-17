"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { pushWithLoading } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import type { StoreSign } from "@/lib/types";
import { ReportSheet } from "./ReportSheet";

type StoreName = { store_id: string; name: string };

const ICONS = {
  story: ["M4 5.5h16v11H10l-4.5 3.5V16.5H4z"],
  owner: ["M4 10l1.5-5h13L20 10", "M5 10v9h14v-9", "M4 10h16", "M10 19v-5h4v5"],
  report: ["M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z", "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"],
} as const;

const ITEM = "flex items-center justify-end gap-2.5 transition-all duration-200 ease-out";
const LABEL = "rounded-full border-2 border-line bg-card px-3.5 py-1.5 font-display text-base shadow-[0_3px_0_var(--color-line)]";
const ROUND = "flex size-12 items-center justify-center rounded-full border-2 border-line bg-card shadow-[0_3px_0_var(--color-line)]";

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/**
 * 오른쪽 아래 동그란 쓰기 버튼. 누르면 동네 이야기 · 사장님 소식 · 이웃 제보가 위로 펼쳐진다
 */
export function WriteFab() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stores, setStores] = useState<StoreName[] | null>(null);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function report() {
    setOpen(false);
    setSheet(true);
    if (stores) return;
    const { data } = await createClient().rpc("get_store_signs");
    setStores(((data ?? []) as StoreSign[]).map((s) => ({ store_id: s.store_id, name: s.name })));
  }

  // 아래에서부터 차례로 올라온다
  const step = (i: number) => ({
    transitionDelay: open ? `${i * 45}ms` : "0ms",
    transform: open ? "translateY(0) scale(1)" : `translateY(${(i + 1) * 18}px) scale(0.85)`,
    opacity: open ? 1 : 0,
  });

  return (
    <>
      {/* 펼친 동안 뒤 화면을 살짝 가린다. 아무 데나 누르면 닫힌다 */}
      <button
        type="button"
        aria-label="쓰기 닫기"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-30 bg-ink/25 transition-opacity duration-200 active:!transform-none active:!filter-none ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <div data-no-swipe className="fixed right-5 bottom-[calc(96px+env(safe-area-inset-bottom))] z-30 flex flex-col items-end gap-3">
        <div id="write-menu" aria-hidden={!open} className={`flex flex-col items-end gap-3 pr-[5px] ${open ? "" : "pointer-events-none"}`}>
          <Link href="/write/story" tabIndex={open ? 0 : -1} className={ITEM} style={step(2)}>
            <span className={LABEL}>동네 이야기</span>
            <span className={ROUND}><Icon name="story" /></span>
          </Link>
          <Link href="/owner/news" tabIndex={open ? 0 : -1} className={ITEM} style={step(1)}>
            <span className={LABEL}>사장님 소식</span>
            <span className={ROUND}><Icon name="owner" /></span>
          </Link>
          <button type="button" tabIndex={open ? 0 : -1} onClick={report} className={`${ITEM} active:!transform-none`} style={step(0)}>
            <span className={LABEL}>이웃 제보</span>
            <span className={ROUND}><Icon name="report" /></span>
          </button>
        </div>

        <button
          type="button"
          aria-label={open ? "쓰기 닫기" : "쓰기"}
          aria-expanded={open}
          aria-controls="write-menu"
          onClick={() => setOpen(!open)}
          className="flex size-[58px] items-center justify-center rounded-full border-2 border-yellow-deep bg-yellow shadow-[0_5px_0_var(--color-yellow-deep)]"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className={`transition-transform duration-200 ${open ? "rotate-[-20deg] scale-110" : ""}`}
          >
            <path d="M4 20h4L19 9l-4-4L4 16z" />
            <path d="M13.5 6.5l4 4" />
          </svg>
        </button>
      </div>

      {sheet && stores && (
        <ReportSheet
          stores={stores}
          onClose={() => setSheet(false)}
          onDone={(storeId, kind) => {
            setSheet(false);
            pushWithLoading(router, `/stores/${storeId}?reported=${kind}`);
          }}
        />
      )}
    </>
  );
}
