/** 아이폰 사파리 공유 아이콘 (네모에서 위로 나가는 화살표) */
export function ShareIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M8.5 9.5H7a1.8 1.8 0 0 0-1.8 1.8v7.9A1.8 1.8 0 0 0 7 21h10a1.8 1.8 0 0 0 1.8-1.8v-7.9A1.8 1.8 0 0 0 17 9.5h-1.5" />
      <path d="M12 2.8v11.4" />
      <path d="M8.6 6.2L12 2.8l3.4 3.4" />
    </svg>
  );
}

/** "홈 화면에 추가" 아이콘 (네모 안 더하기) */
function AddIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}

const IOS_BLUE = "text-[#007AFF]";
const RING = "rounded-full ring-[3px] ring-coral ring-offset-2 ring-offset-white";

function Step({ n, title, children }: { n: number; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-2">
      <span className="flex items-start gap-2 text-[17px] leading-snug">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink font-display text-[15px] text-white">{n}</span>
        <span className="pt-0.5">{title}</span>
      </span>
      <div aria-hidden className="ml-9 overflow-hidden rounded-2xl border-2 border-line bg-white">
        {children}
      </div>
    </li>
  );
}

/**
 * 아이폰 사파리에서 홈 화면에 추가하는 방법을 그림으로 (글을 안 읽어도 따라 할 수 있게).
 * iOS 26 부터는 공유 버튼이 아래 "⋯" 메뉴 안에 있다
 */
export function IosInstallGuide({ ios }: { ios: number | null }) {
  const newSafari = (ios ?? 0) >= 26;
  return (
    <ol className="flex flex-col gap-3.5">
      {newSafari ? (
        <Step n={1} title={<>화면 아래 <b>⋯</b> 버튼을 누르고 <b>공유</b>를 눌러요</>}>
          <div className="flex items-center justify-between px-4 py-2.5 text-[#8E8E93]">
            <span className="text-xl">‹</span>
            <span className="h-7 flex-1 mx-3 rounded-full bg-[#F2F2F7] text-center text-[12px] leading-7">oksori.vercel.app</span>
            <span className={`flex size-8 items-center justify-center text-xl font-bold ${IOS_BLUE} ${RING}`}>⋯</span>
          </div>
          <div className="flex items-center gap-2 border-t border-[#E5E5EA] px-4 py-2 text-[15px]">
            <ShareIcon size={20} className={IOS_BLUE} />
            <span className="font-bold">공유</span>
          </div>
        </Step>
      ) : (
        <Step n={1} title={<>화면 아래 가운데 <ShareIcon size={20} className={`inline -mt-1 ${IOS_BLUE}`} /> <b>공유</b> 버튼을 눌러요</>}>
          <div className="flex items-center justify-around px-3 py-2.5 text-[#8E8E93]">
            <span className="text-xl">‹</span>
            <span className="text-xl">›</span>
            <span className={`flex size-9 items-center justify-center ${IOS_BLUE} ${RING}`}>
              <ShareIcon />
            </span>
            <span className="text-lg">▢</span>
            <span className="text-lg">⧉</span>
          </div>
        </Step>
      )}

      <Step n={2} title={<>목록을 위로 올려서 <b>홈 화면에 추가</b>를 눌러요</>}>
        <div className="flex flex-col text-[15px]">
          <span className="flex items-center justify-between px-4 py-2 text-[#8E8E93]">
            복사 <span>⧉</span>
          </span>
          <span className="flex items-center justify-between border-t border-[#E5E5EA] px-4 py-2 text-[#8E8E93]">
            읽기 목록에 추가
            <svg width="22" height="14" viewBox="0 0 26 14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <circle cx="6.5" cy="7.5" r="4.5" />
              <circle cx="19.5" cy="7.5" r="4.5" />
              <path d="M11 7.5h4" />
            </svg>
          </span>
          <span className="m-1.5 flex items-center justify-between rounded-xl px-3 py-2 font-bold ring-[3px] ring-coral">
            홈 화면에 추가 <AddIcon />
          </span>
        </div>
      </Step>

      <Step n={3} title={<>오른쪽 위 <b>추가</b>를 누르면 끝!</>}>
        <div className="flex items-center justify-between px-4 py-2.5 text-[15px]">
          <span className={IOS_BLUE}>취소</span>
          <span className="font-bold">홈 화면에 추가</span>
          <span className={`px-2 font-bold ${IOS_BLUE} ${RING}`}>추가</span>
        </div>
        <div className="flex items-center gap-2.5 border-t border-[#E5E5EA] px-4 py-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="size-10 rounded-[10px]" />
          <span className="text-[15px]">옥!소리</span>
        </div>
      </Step>

      <li className="ml-9 text-[15px] leading-relaxed text-muted">
        홈 화면에 생긴 <b className="text-ink">옥!소리</b>를 눌러 들어오면 앱처럼 열리고, 오른쪽 위에서 <b className="text-ink">알림</b>을 켤 수 있어요.
      </li>
    </ol>
  );
}
