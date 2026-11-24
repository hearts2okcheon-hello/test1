"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { writeMenu, type WriteItem } from "@/lib/intent";
import { pushWithLoading } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import type { StoreSign } from "@/lib/types";
import { ReportSheet } from "./ReportSheet";

type StoreName = { store_id: string; name: string };

const ICONS: Record<WriteItem, readonly string[]> = {
  story: ["M4 5.5h16v11H10l-4.5 3.5V16.5H4z"],
  owner: ["M4 10l1.5-5h13L20 10", "M5 10v9h14v-9", "M4 10h16", "M10 19v-5h4v5"],
  report: ["M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z", "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"],
};
const LABELS: Record<WriteItem, string> = { story: "동네 이야기", owner: "사장님 소식", report: "이웃 제보" };
const HREFS: Record<Exclude<WriteItem, "report">, string> = { story: "/write/story", owner: "/owner/news" };

const ITEM = "flex items-center justify-end gap-2.5 transition-all duration-200 ease-out motion-reduce:!transform-none motion-reduce:transition-none";
const LABEL = "rounded-full border-2 border-line bg-card px-3.5 py-1.5 font-display text-base";
const ROUND = "flex size-12 items-center justify-center rounded-full border-2 border-line bg-card";

function Icon({ name }: { name: WriteItem }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/**
 * 오른쪽 아래 동그란 쓰기 버튼. 누르면 동네 이야기 · 사장님 소식 · 이웃 제보가 위로 펼쳐진다.
 * 사장님 소식은 가게를 등록하는(한) 사람(owner)에게만 나오고, 없을 때는 동네 이야기가 그 자리로 내려온다 (ADR-019).
 * 접혀 있는 메뉴의 자리는 눌리지 않게 비워 둔다. 그 아래에 있는 화면의 버튼이 가려지면 안 된다.
 *
 * 자리 (ADR-025): 아래 탭 줄(BottomNav) 바로 앞에 놓고, 탭 줄과 같은 방식(sticky)으로 화면 아래에 붙인다.
 * 그래서 어디까지 스크롤해도, 맨 아래에서 화면을 더 당겨도 늘 탭 줄 위 16px 에 떠 있다.
 * (예전에는 화면에 고정(fixed)이라, 탭 줄과 따로 움직이는 휴대폰에서 탭 줄 뒤로 숨는 일이 있었다)
 */
export function WriteFab({ owner = false }: { owner?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stores, setStores] = useState<StoreName[] | null>(null);
  const [sheet, setSheet] = useState(false);
  const items = writeMenu(owner);

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

  // 아래에서부터 차례로 올라온다 (n 은 아래에서 몇 번째인가)
  const step = (n: number) => ({
    transitionDelay: open ? `${n * 45}ms` : "0ms",
    transform: open ? "translateY(0) scale(1)" : `translateY(${(n + 1) * 18}px) scale(0.85)`,
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
        className={`fixed inset-0 z-30 bg-ink/25 transition-opacity duration-200 motion-reduce:transition-none active:!transform-none active:!filter-none ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      {/* 높이 0 인 받침: 탭 줄의 윗선에 붙어 다닌다. 버튼은 그 위 16px 에 놓인다 */}
      <div data-no-swipe data-write-fab className="pointer-events-none sticky bottom-[var(--ok-nav-height)] z-30 h-0">
        <div className="absolute right-5 bottom-4 flex flex-col items-end gap-3">
          <div id="write-menu" aria-hidden={!open} className="flex flex-col items-end gap-3 pr-[5px]">
            {items.map((item, i) => {
              const style = step(items.length - 1 - i);
              const cls = `${ITEM} ${open ? "pointer-events-auto" : ""}`;
              const inner = (
                <>
                  <span className={LABEL}>{LABELS[item]}</span>
                  <span className={ROUND}><Icon name={item} /></span>
                </>
              );
              return item === "report" ? (
                <button key={item} type="button" tabIndex={open ? 0 : -1} onClick={report} className={`${cls} active:!transform-none`} style={style}>
                  {inner}
                </button>
              ) : (
                <Link key={item} href={HREFS[item]} tabIndex={open ? 0 : -1} className={cls} style={style}>
                  {inner}
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            aria-label={open ? "쓰기 닫기" : "쓰기"}
            aria-expanded={open}
            aria-controls="write-menu"
            onClick={() => setOpen(!open)}
            className="pointer-events-auto flex size-[58px] items-center justify-center rounded-full border-2 border-yellow-deep bg-yellow"
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
              className={`transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-[-20deg] scale-110" : ""}`}
            >
              <path d="M4 20h4L19 9l-4-4L4 16z" />
              <path d="M13.5 6.5l4 4" />
            </svg>
          </button>
        </div>
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
