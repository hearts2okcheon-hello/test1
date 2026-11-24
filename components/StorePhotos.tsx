"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PHOTO_CATEGORIES } from "@/lib/signs";
import type { StorePhoto } from "@/lib/types";

const LABEL = Object.fromEntries(PHOTO_CATEGORIES.map((c) => [c.id, c.label])) as Record<StorePhoto["category"], string>;

/**
 * 가게 화면 맨 위의 사진 (ADR-025). 사진을 한 줄로 늘어놓고 손가락으로 옆으로 밀어 넘겨 본다 (지도 앱의 가게 사진처럼).
 * 누르면 크게 보고, 사진 종류(매장 · 음식 · 일상)는 사진 왼쪽 아래에 작게 적는다.
 * 가게를 고칠 수 있는 사람(editHref 가 있음)에게는 "사진 고치기"가 보인다. 사진이 없으면 그 사람에게만 올리라고 알려 준다
 */
export function StorePhotos({ photos, editHref }: { photos: StorePhoto[]; editHref?: string }) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);

  if (photos.length === 0) {
    if (!editHref) return null;
    return (
      <Link href={editHref} className="flex min-h-16 items-center justify-between gap-3 rounded-[22px] border-2 border-dashed border-line-strong bg-cream px-4 py-3">
        <span className="flex min-w-0 flex-col break-keep">
          <span className="font-display text-lg leading-snug">가게 사진을 올려 보세요</span>
          <span className="text-sm text-muted">올린 사진은 이 화면 맨 위에 보여요</span>
        </span>
        <span className="shrink-0 rounded-2xl border-2 border-line bg-card px-3.5 py-2 text-base font-bold">사진 올리기</span>
      </Link>
    );
  }

  const single = photos.length === 1;

  return (
    <section aria-label="가게 사진" className="flex flex-col gap-2">
      {/* 화면 양 끝까지 닿게 놓는다. 다음 사진이 조금 보여서 옆으로 넘길 수 있음을 알 수 있다 */}
      <div data-no-swipe className="ok-scroll-x -mx-5 flex snap-x gap-2 overflow-x-auto scroll-px-5 px-5">
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`${LABEL[p.category]} 사진 크게 보기 (${photos.length}장 가운데 ${i + 1}번째)`}
            className={`relative shrink-0 snap-start overflow-hidden rounded-[18px] border-2 border-line bg-sand active:!transform-none ${single ? "aspect-[16/10] w-full" : "size-[212px]"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" loading={i < 2 ? "eager" : "lazy"} className="size-full object-cover" />
            <span className="absolute bottom-2 left-2 rounded-[10px] bg-ink/75 px-2 py-0.5 text-xs font-bold text-white">{LABEL[p.category]}</span>
          </button>
        ))}
      </div>

      {editHref && (
        <Link href={editHref} className="flex min-h-11 items-center gap-1.5 self-end rounded-2xl border-2 border-line bg-card px-3.5 text-sm font-bold">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 20h4L19 9l-4-4L4 16z" />
            <path d="M13.5 6.5l4 4" />
          </svg>
          사진 고치기
        </Link>
      )}

      {open !== null && photos[open] && (
        <div role="dialog" aria-modal="true" aria-label="사진 크게 보기" className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={() => setOpen(null)}>
          <div className="flex items-center px-3 py-2 text-white">
            <span className="flex-1 text-sm">
              {open + 1} / {photos.length} · {LABEL[photos[open].category]}
            </span>
            <button type="button" aria-label="닫기" autoFocus onClick={() => setOpen(null)} className="flex size-12 items-center justify-center rounded-full bg-white/15 text-2xl">×</button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[open].url} alt="" className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
            {photos.length > 1 && (
              <>
                <button type="button" aria-label="이전 사진" onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + photos.length) % photos.length); }} className="absolute left-2 flex size-12 items-center justify-center rounded-full bg-white/20 text-2xl text-white">‹</button>
                <button type="button" aria-label="다음 사진" onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % photos.length); }} className="absolute right-2 flex size-12 items-center justify-center rounded-full bg-white/20 text-2xl text-white">›</button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
