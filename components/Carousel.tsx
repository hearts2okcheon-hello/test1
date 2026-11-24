"use client";

import { Children, useRef, useState, type ReactNode } from "react";

/**
 * 옆으로 넘겨 보는 칸 (소통광장의 광고 배너, 가게 소식의 공지).
 * 한 번에 한 장이 보이고, 손가락으로 밀거나 아래 점을 눌러 넘긴다. 지금 몇 번째인지는 점으로 보여 준다.
 * 스스로 옆으로 넘어가는 목록이라, 이 위에서 민 손짓은 탭 넘기기(TabSwipe)가 가져가지 않는다
 */
export function Carousel({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  const slides = Children.toArray(children);
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const current = Math.min(index, slides.length - 1);

  function onScroll() {
    const el = scroller.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function go(i: number) {
    const el = scroller.current;
    if (!el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: calm ? "auto" : "smooth" });
    setIndex(i);
  }

  return (
    <div role="group" aria-roledescription="carousel" aria-label={label} className={`flex flex-col gap-1 ${className}`}>
      {/* 아래 여백은 카드 밑 그림자가 잘리지 않게 둔 자리 */}
      <div ref={scroller} onScroll={onScroll} className="ok-scroll-x flex snap-x snap-mandatory overflow-x-auto pb-1.5">
        {slides.map((slide, i) => (
          <div key={i} role="group" aria-roledescription="slide" aria-label={`${slides.length}장 가운데 ${i + 1}번째`} className="w-full shrink-0 snap-center">
            {slide}
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="flex justify-center">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}번째로 넘기기`}
              aria-current={i === current ? "true" : undefined}
              onClick={() => go(i)}
              className="flex h-7 min-w-7 items-center justify-center px-1 active:!transform-none"
            >
              <span className={`block h-2 rounded-full transition-all duration-200 motion-reduce:transition-none ${i === current ? "w-5 bg-sage" : "w-2 bg-line-strong"}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
