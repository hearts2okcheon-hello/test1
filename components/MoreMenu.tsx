"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

export type MoreItem = {
  label: string;
  /** 다른 화면으로 가는 항목 (수정) */
  href?: string;
  /** 누르면 바로 하는 항목 (삭제: 확인 창은 부르는 쪽이 띄운다) */
  onSelect?: () => void;
  danger?: boolean;
};

const ITEM = "flex min-h-12 items-center rounded-xl px-3.5 text-left text-base font-bold whitespace-nowrap hover:bg-cream focus-visible:bg-cream active:!transform-none";

/**
 * 글 오른쪽 위의 점 세 개(⋮) 메뉴 (ADR-025). 누르면 바로 아래에 수정 · 삭제가 펼쳐지고,
 * 다른 곳을 누르거나 Esc 를 누르면 접힌다. 내 글에만 붙인다 (무엇이 들어가는지는 lib/posts 의 postActions).
 * 항목이 없으면 아무것도 그리지 않는다
 */
export function MoreMenu({ label, items, className = "" }: { label: string; items: MoreItem[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const rows = () => Array.from(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);
    rows()[0]?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      } else if (e.key === "Tab") {
        setOpen(false);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const all = rows();
        const at = all.indexOf(document.activeElement as HTMLElement);
        all[(at + (e.key === "ArrowDown" ? 1 : all.length - 1)) % all.length]?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`flex size-11 items-center justify-center rounded-full text-muted active:!transform-none ${open ? "bg-sand" : "hover:bg-cream"}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open && (
        <>
          {/* 다른 곳을 누르면 접힌다 (그 자리의 글이 눌리지는 않는다) */}
          <div data-no-swipe aria-hidden onClick={() => setOpen(false)} className="fixed inset-0 z-40" />
          <div ref={menu} id={id} role="menu" aria-label={label} className="ok-pop absolute top-full right-0 z-50 flex min-w-[132px] origin-top-right flex-col gap-0.5 rounded-2xl border-2 border-line bg-card p-1.5 shadow-lg">
            {items.map((item) =>
              item.href ? (
                <Link key={item.label} href={item.href} role="menuitem" onClick={() => setOpen(false)} className={`${ITEM} ${item.danger ? "text-danger" : ""}`}>
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onSelect?.();
                  }}
                  className={`${ITEM} ${item.danger ? "text-danger" : ""}`}
                >
                  {item.label}
                </button>
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}
