"use client";

import { useEffect, useState } from "react";
import { isIos, isStandalone } from "@/lib/push";
import { inAppBrowser, iosMajor, type InApp } from "@/lib/inapp";
import { AlertButton } from "./AlertButton";
import { openExternally } from "./InAppGate";
import { IosInstallGuide } from "./IosInstallGuide";
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
  const [inApp, setInApp] = useState<InApp | null>(null);
  const [iosVersion, setIosVersion] = useState<number | null>(null);

  useEffect(() => {
    setStandalone(isStandalone());
    setIos(isIos());
    setInApp(inAppBrowser(navigator.userAgent));
    setIosVersion(iosMajor(navigator.userAgent));
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
          <div className="ok-pop relative flex max-h-[92dvh] w-full max-w-[440px] flex-col gap-3 overflow-y-auto rounded-[28px] border-2 border-line bg-card px-5 pt-5 pb-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label="닫기" onClick={() => setHelp(false)} className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full text-2xl leading-none text-muted">
              ×
            </button>
            <h2 id="install-title" className="font-display text-[23px] font-normal">홈 화면에 옥!소리 앱 추가하기</h2>
            {inApp ? (
              <>
                <p className="text-[17px] leading-relaxed">
                  {inApp === "kakao" ? "카카오톡" : "이 앱"} 안에서는 홈 화면에 추가할 수 없어요. <b>{ios ? "사파리" : "크롬"}</b>로 다시 열어 주세요.
                </p>
                {inApp === "kakao" || !ios ? (
                  <button type="button" onClick={openExternally} className="min-h-14 rounded-[18px] border-2 border-sage-deep bg-sage font-display text-lg text-white">
                    {ios ? "사파리" : "크롬"}로 열기
                  </button>
                ) : (
                  <p className="text-[16px] leading-relaxed text-muted">오른쪽 아래 <b className="text-ink">⋯</b> 또는 <b className="text-ink">공유</b>에서 <b className="text-ink">Safari로 열기</b>를 눌러 주세요.</p>
                )}
              </>
            ) : ios ? (
              <IosInstallGuide ios={iosVersion} />
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
