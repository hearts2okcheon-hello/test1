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
  if ((ios ?? 0) >= 27) return <Ios27Guide />;
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

function Row({ icon, label, on = false, last = false }: { icon: React.ReactNode; label: string; on?: boolean; last?: boolean }) {
  return on ? (
    <span className="m-1.5 flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-bold ring-[3px] ring-coral">
      {icon}
      {label}
    </span>
  ) : (
    <span className={`flex items-center gap-3 px-4 py-2 text-[15px] text-[#8E8E93] ${last ? "" : "border-b border-[#E5E5EA]"}`}>
      {icon}
      {label}
    </span>
  );
}

const MENU_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
    <path d="M5 7h14M5 12h14M5 17h14" />
  </svg>
);
const BOOKMARK = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden>
    <path d="M7 3.5h10v17l-5-4-5 4z" />
  </svg>
);
const FIND = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
    <path d="M14 3.5H6.5v17h6" />
    <circle cx="15.5" cy="15" r="3.2" />
    <path d="M18 17.5l2.5 2.5" />
  </svg>
);

/** iOS 27 사파리: 주소창 왼쪽 ≡ → 공유 → 더 보기 → 홈 화면에 추가 → 추가 */
function Ios27Guide() {
  return (
    <ol className="flex flex-col gap-3.5">
      <Step n={1} title={<>화면 아래 주소창 왼쪽 <b>≡</b> 버튼을 눌러요</>}>
        <div className="flex items-center gap-2 px-3 py-2.5 text-[#3A3A3C]">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F2F2F7] text-xl">‹</span>
          <span className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-[#F2F2F7] pr-3 pl-1">
            <span className={`flex size-7 shrink-0 items-center justify-center ${RING}`}>{MENU_ICON}</span>
            <span className="min-w-0 flex-1 truncate text-center text-[12px]">oksori.vercel.app</span>
            <span className="text-sm">↻</span>
          </span>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F2F2F7] text-lg">⧉</span>
        </div>
      </Step>

      <Step n={2} title={<>메뉴에서 <b>공유</b>를 눌러요</>}>
        <div className="flex flex-col">
          <Row icon={<span className="text-[13px] font-bold">文A</span>} label="번역" />
          <Row icon={<ShareIcon size={20} />} label="공유" on />
          <Row icon={BOOKMARK} label="북마크에 추가" last />
        </div>
      </Step>

      <Step n={3} title={<>맨 아래 줄 오른쪽 <b>더 보기</b>를 눌러요</>}>
        <div className="grid grid-cols-4 gap-1 px-2 py-2.5 text-center text-[11px] text-[#8E8E93]">
          {(
            [
              ["⧉", "복사"],
              [BOOKMARK, "북마크에 추가"],
              [
                <svg key="g" width="22" height="14" viewBox="0 0 26 14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <circle cx="6.5" cy="7.5" r="4.5" />
                  <circle cx="19.5" cy="7.5" r="4.5" />
                  <path d="M11 7.5h4" />
                </svg>,
                "읽기 목록에 추가",
              ],
            ] as [React.ReactNode, string][]
          ).map(([i, t]) => (
            <span key={t} className="flex flex-col items-center gap-1">
              <span className="flex size-10 items-center justify-center rounded-full bg-[#F2F2F7] text-base">{i}</span>
              {t}
            </span>
          ))}
          <span className="flex flex-col items-center gap-1 font-bold text-ink">
            <span className={`flex size-10 items-center justify-center bg-[#F2F2F7] text-lg ${RING}`}>∨</span>
            더 보기
          </span>
        </div>
      </Step>

      <Step n={4} title={<><b>홈 화면에 추가</b>를 눌러요</>}>
        <div className="flex flex-col">
          <Row icon={FIND} label="페이지에서 찾기" />
          <Row icon={<AddIcon />} label="홈 화면에 추가" on />
        </div>
      </Step>

      <Step n={5} title={<>오른쪽 위 <b>추가</b>를 누르면 끝!</>}>
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
