"use client";

import { useEffect, useState } from "react";
import { isIos, isStandalone } from "@/lib/push";
import { AlertButton } from "./AlertButton";
import { canInstallApp, installApp, onInstallChange } from "./PwaSetup";

/**
 * 홈 오른쪽 위 "앱 설치" 버튼.
 * 안드로이드 크롬은 바로 설치 창을, 아이폰·그 밖의 브라우저는 홈 화면에 추가하는 방법을 보여 준다.
 * 이미 홈 화면 앱으로 열었으면 그 자리에 알림 켜기 버튼을 둔다
 */
export function InstallButton() {
  const [ready, setReady] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    setStandalone(isStandalone());
    setIos(isIos());
    setReady(true);
    return onInstallChange(() => setReady(true));
  }, []);

  if (!ready) return null;
  // 이미 홈 화면 앱으로 열었으면 같은 자리에 알림 버튼
  if (standalone) return <AlertButton />;

  async function click() {
    if (canInstallApp()) {
      if (await installApp()) setStandalone(true);
      return;
    }
    setHelp(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={click}
        className="ok-sticker inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-sage-deep bg-sage px-4 py-2 font-display text-[16px] text-white"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 4v11" />
          <path d="M7 10.5l5 5 5-5" />
          <path d="M5 19.5h14" />
        </svg>
        앱 설치
      </button>

      {help && (
        <div role="dialog" aria-modal="true" aria-labelledby="install-title" className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/30 px-3 pb-3 sm:items-center" onClick={() => setHelp(false)}>
          <div className="ok-pop relative flex w-full max-w-[440px] flex-col gap-3 rounded-[28px] border-2 border-line bg-card px-5 pt-5 pb-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label="닫기" onClick={() => setHelp(false)} className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full text-2xl leading-none text-muted">
              ×
            </button>
            <h2 id="install-title" className="font-display text-[23px] font-normal">홈 화면에 옥!소리 앱 추가하기</h2>
            {ios ? (
              <ol className="flex list-decimal flex-col gap-2 pl-5 text-[17px] leading-relaxed">
                <li><b>사파리</b>로 이 화면을 열어 주세요.</li>
                <li>아래쪽 <b>공유 버튼(□↑)</b>을 눌러요.</li>
                <li><b>홈 화면에 추가</b> → 오른쪽 위 <b>추가</b>를 눌러요.</li>
                <li>홈 화면의 옥!소리를 누르면 앱처럼 열리고, 알림도 켤 수 있어요.</li>
              </ol>
            ) : (
              <ol className="flex list-decimal flex-col gap-2 pl-5 text-[17px] leading-relaxed">
                <li><b>크롬</b>(또는 삼성 인터넷)으로 이 화면을 열어 주세요.</li>
                <li>오른쪽 위 <b>⋮</b> (삼성 인터넷은 아래 <b>≡</b>) 메뉴를 눌러요.</li>
                <li><b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 눌러요.</li>
              </ol>
            )}
            <button type="button" onClick={() => setHelp(false)} className="mt-1 min-h-14 rounded-[18px] border-2 border-yellow-deep bg-yellow font-display text-lg">
              알겠어요
            </button>
          </div>
        </div>
      )}
    </>
  );
}
