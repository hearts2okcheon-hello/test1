"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Osori } from "@/components/Osori";
import { ReportSheet } from "@/components/ReportSheet";
import { pushWithLoading } from "@/lib/nav";

/** "지나가다 본 게 있나요?" → 제보 시트 → 그 가게 상세로 */
export function HomeReport({ stores }: { stores: { store_id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  if (stores.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[72px] w-full items-center gap-2.5 rounded-[22px] border-2 border-dashed border-line-strong bg-cream py-1.5 pr-4 pl-2 text-left"
      >
        <Osori mood="find" size={76} />
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="font-display text-lg">지나가다 본 게 있나요?</span>
          <span className="text-[13px] text-muted">사장님이 미처 못 알린 소식을 알려주세요</span>
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {open && (
        <ReportSheet
          stores={stores}
          onClose={() => setOpen(false)}
          onDone={(storeId, kind) => {
            setOpen(false);
            pushWithLoading(router, `/stores/${storeId}?reported=${kind}`);
          }}
        />
      )}
    </>
  );
}
