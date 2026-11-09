"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Osori } from "@/components/Osori";
import { ReportSheet } from "@/components/ReportSheet";
import { pushWithLoading } from "@/lib/nav";

const CARD = "ok-sticker flex items-center gap-3 rounded-[22px] border-2 border-line bg-card px-4 py-3.5 text-left";

/** 쓰기: 이웃 제보 또는 사장님 소식 */
export function WriteChoices({ stores }: { stores: { store_id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" disabled={stores.length === 0} onClick={() => setOpen(true)} className={`${CARD} disabled:opacity-60`}>
        <Osori mood="find" size={72} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-display text-xl">지나가다 봤어요</span>
          <span className="text-sm text-muted">이웃 제보 · 사장님이나 옥천신문이 확인해요</span>
        </span>
      </button>
      <Link href="/owner/news" className={CARD}>
        <Osori mood="proud" size={72} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-display text-xl">우리 가게 소식</span>
          <span className="text-sm text-muted">사장님이 직접 올려요 · 카카오 로그인이 필요해요</span>
        </span>
      </Link>
      {stores.length === 0 && <p className="text-sm text-muted">아직 등록된 가게가 없어요.</p>}
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
