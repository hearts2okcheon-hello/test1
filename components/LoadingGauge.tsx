import { Osori } from "./Osori";

function Paw({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={`size-[13px] shrink-0 fill-sage-deep ${className}`}>
      <ellipse cx="10" cy="13.5" rx="5" ry="4.2" />
      <circle cx="4" cy="8" r="2" />
      <circle cx="8" cy="4.6" r="2" />
      <circle cx="12.4" cy="4.6" r="2" />
      <circle cx="16.2" cy="8" r="2" />
    </svg>
  );
}

/**
 * 모든 로딩 화면 공통: 왼쪽에서 오른쪽으로 차오르는 게이지.
 * 게이지 끝은 발자국이고, 그 위를 가방 오소리가 걸어간다
 */
export function LoadingGauge() {
  return (
    <div aria-hidden className="flex w-full max-w-[280px] flex-col items-center gap-3">
      <div className="relative mt-[84px] h-6 w-full rounded-full border-2 border-line bg-cream">
        <div className="ok-gauge absolute inset-y-0 left-0 rounded-full bg-sage">
          {/* 채워진 막대의 끝을 덮어 발자국으로 보이게 한다 */}
          <div className="absolute inset-y-0 right-0 flex w-12 items-center justify-end gap-[3px] rounded-r-full bg-cream pr-1">
            <Paw className="-translate-y-[3px] rotate-90 opacity-50" />
            <Paw className="translate-y-[3px] rotate-90 opacity-75" />
            <Paw className="-translate-y-[3px] rotate-90" />
          </div>
          <div className="absolute right-0 bottom-[calc(100%-6px)] translate-x-[38%]">
            <div className="ok-walk">
              <Osori mood="move" size={84} eager />
            </div>
          </div>
        </div>
      </div>
      <p className="font-display text-lg text-ink">오늘 소식을 모으고 있어요</p>
    </div>
  );
}
