"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV_START, isInternalNav } from "@/lib/nav";
import { Osori } from "./Osori";

const SHOW_AFTER_MS = 120; // 바로 넘어가는 화면에서는 깜빡이지 않게
const MIN_VISIBLE_MS = 600;
const GIVE_UP_MS = 10000; // 이동이 실패해도 화면이 막히지 않게

/** 화면을 옮기는 동안 지금 보는 화면 위에 띄운다 */
export function NavLoading() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [visible, setVisible] = useState(false);
  const timers = useRef({ pending: false, shownAt: 0, show: 0, giveUp: 0, hide: 0 });

  function finish() {
    const t = timers.current;
    if (!t.pending) return;
    t.pending = false;
    window.clearTimeout(t.show);
    window.clearTimeout(t.giveUp);
    if (!t.shownAt) return;
    t.hide = window.setTimeout(() => {
      t.shownAt = 0;
      setVisible(false);
    }, Math.max(0, MIN_VISIBLE_MS - (Date.now() - t.shownAt)));
  }

  useEffect(() => {
    function begin() {
      const t = timers.current;
      if (t.pending) return;
      t.pending = true;
      window.clearTimeout(t.hide);
      if (!t.shownAt) {
        t.show = window.setTimeout(() => {
          t.shownAt = Date.now();
          setVisible(true);
        }, SHOW_AFTER_MS);
      }
      t.giveUp = window.setTimeout(finish, GIVE_UP_MS);
    }

    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      if (isInternalNav(a.href, window.location.href)) begin();
    }

    document.addEventListener("click", onClick);
    window.addEventListener(NAV_START, begin);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener(NAV_START, begin);
    };
  }, []);

  useEffect(finish, [pathname, search]);

  // 로딩 화면은 잠깐만 뜨므로 그림을 미리 받아 둔다
  // eslint-disable-next-line @next/next/no-img-element
  if (!visible) return <img src="/osori/move.webp" alt="" aria-hidden className="hidden" />;

  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/20">
      <span className="sr-only">로딩 중</span>
      <div aria-hidden className="ok-pop relative size-[260px] rounded-full border-2 border-line bg-card shadow-lg">
        <svg viewBox="0 0 260 260" className="absolute inset-0 size-full overflow-visible">
          <path id="ok-loading-arc" d="M 42 136 A 88 88 0 0 1 218 136" fill="none" />
          <text className="ok-loading-text font-display" fontSize="44" letterSpacing="2" textAnchor="middle">
            <textPath href="#ok-loading-arc" startOffset="50%">
              로 딩 중
            </textPath>
          </text>
          <line className="ok-road" x1="62" y1="212" x2="198" y2="212" strokeWidth="5" strokeLinecap="round" strokeDasharray="14 16" />
        </svg>
        <div className="absolute top-[106px] left-1/2 -ml-[52px]">
          <div className="ok-walk">
            <Osori mood="move" size={104} eager />
          </div>
        </div>
      </div>
    </div>
  );
}
