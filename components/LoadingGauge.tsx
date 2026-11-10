import { Osori } from "./Osori";

const WIDTH = 280;
const STEP = 22;
const PAWS = Array.from({ length: Math.floor((WIDTH - 10) / STEP) }, (_, i) => i);

function Paw({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={`size-[14px] shrink-0 fill-[#9C8670] ${className}`}>
      <ellipse cx="10" cy="13.5" rx="5" ry="4.2" />
      <circle cx="4" cy="8" r="2" />
      <circle cx="8" cy="4.6" r="2" />
      <circle cx="12.4" cy="4.6" r="2" />
      <circle cx="16.2" cy="8" r="2" />
    </svg>
  );
}

/**
 * 모든 로딩 화면 공통: 가방 오소리가 왼쪽에서 오른쪽으로 걸어가고,
 * 지나온 길에 발자국이 하나씩 남는다
 */
export function LoadingGauge() {
  return (
    <div aria-hidden className="flex w-[280px] max-w-full flex-col items-center gap-3">
      <div className="relative mt-[84px] h-6 w-full">
        {/* 오소리가 지나간 만큼만 발자국이 보인다 */}
        <div className="ok-gauge absolute inset-y-0 left-0">
          <div className="absolute inset-y-0 left-0 w-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 flex items-center" style={{ width: WIDTH }}>
              {PAWS.map((i) => (
                <span key={i} className="flex shrink-0 justify-center" style={{ width: STEP }}>
                  <Paw className={`rotate-90 ${i % 2 ? "translate-y-[5px]" : "-translate-y-[5px]"}`} />
                </span>
              ))}
            </div>
          </div>
          <div className="absolute right-0 bottom-[calc(100%-14px)] w-[84px] translate-x-[45%]">
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
