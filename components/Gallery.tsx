"use client";

import { useEffect, useState } from "react";
import { PHOTO_CATEGORIES } from "@/lib/signs";
import type { PhotoCategory, StorePhoto } from "@/lib/types";

/** 7. 사진 갤러리: 종류별로 보고, 누르면 크게 */
export function Gallery({ photos }: { photos: StorePhoto[] }) {
  const [tab, setTab] = useState<PhotoCategory | "all">("all");
  const [open, setOpen] = useState<number | null>(null);
  const shown = tab === "all" ? photos : photos.filter((p) => p.category === tab);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % shown.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + shown.length) % shown.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, shown.length]);

  const tabs = [{ id: "all" as const, label: "전체" }, ...PHOTO_CATEGORIES];

  return (
    <>
      <div className="flex gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-10 flex-1 rounded-2xl border-2 text-sm font-bold ${tab === t.id ? "border-ink bg-yellow" : "border-line bg-white"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-muted">이 종류의 사진은 아직 없어요.</p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {shown.map((p, i) => (
            <button key={p.id} type="button" onClick={() => setOpen(i)} aria-label={`사진 ${i + 1} 크게 보기`} className="aspect-square overflow-hidden rounded-xl border-2 border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {open !== null && shown[open] && (
        <div role="dialog" aria-modal="true" aria-label="사진 크게 보기" className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={() => setOpen(null)}>
          <div className="flex items-center px-3 py-2 text-white">
            <span className="flex-1 text-sm">{open + 1} / {shown.length}</span>
            <button type="button" aria-label="닫기" autoFocus onClick={() => setOpen(null)} className="flex size-12 items-center justify-center rounded-full bg-white/15 text-2xl">×</button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shown[open].url} alt="" className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
            {shown.length > 1 && (
              <>
                <button type="button" aria-label="이전 사진" onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + shown.length) % shown.length); }} className="absolute left-2 flex size-12 items-center justify-center rounded-full bg-white/20 text-2xl text-white">‹</button>
                <button type="button" aria-label="다음 사진" onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % shown.length); }} className="absolute right-2 flex size-12 items-center justify-center rounded-full bg-white/20 text-2xl text-white">›</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
