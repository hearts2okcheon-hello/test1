"use client";

import { useEffect, useState } from "react";
import { externalOpenUrl, inAppBrowser, type InApp } from "@/lib/inapp";
import { isIos } from "@/lib/push";

const TRIED_KEY = "ok-open-external";

/** 사파리·크롬으로 다시 연다. 열 방법이 없으면 false */
export function openExternally(): boolean {
  const app = inAppBrowser(navigator.userAgent);
  if (!app) return false;
  const to = externalOpenUrl(app, window.location.href, /android/i.test(navigator.userAgent));
  if (!to) return false;
  window.location.href = to;
  return true;
}

/**
 * 카카오톡 등 다른 앱 안에서 열면 홈 화면 추가·알림이 안 된다.
 * 아이폰 카카오톡은 처음 한 번 바로 사파리로 넘기고, 그 밖에는 위에 안내 띠를 띄운다 (ADR-013)
 */
export function InAppGate() {
  const [app, setApp] = useState<InApp | null>(null);
  const [ios, setIos] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const found = inAppBrowser(navigator.userAgent);
    const iphone = isIos();
    setApp(found);
    setIos(iphone);
    if (found === "kakao" && iphone) {
      let tried = false;
      try {
        tried = window.sessionStorage.getItem(TRIED_KEY) === "1";
        window.sessionStorage.setItem(TRIED_KEY, "1");
      } catch {}
      if (!tried) openExternally();
    }
  }, []);

  if (!app || closed) return null;
  const browser = ios ? "사파리" : "크롬";
  const canOpen = app === "kakao" || !ios;

  return (
    <div className="mx-[18px] mt-3 -mb-1 flex items-center gap-2 rounded-[18px] border-2 border-sage-deep bg-sage-soft py-2 pr-1 pl-3.5">
      <span className="flex-1 text-[14px] leading-snug">
        {app === "kakao" ? "카카오톡" : "이 앱"} 안에서는 앱 설치·알림이 안 돼요.
        {!canOpen && (
          <>
            {" "}오른쪽 아래 <b>⋯</b> 또는 <b>공유</b>에서 <b>Safari로 열기</b>를 눌러 주세요.
          </>
        )}
      </span>
      {canOpen && (
        <button type="button" onClick={openExternally} className="min-h-11 shrink-0 rounded-2xl border-2 border-sage-deep bg-sage px-3 font-display text-[15px] text-white">
          {browser}로 열기
        </button>
      )}
      <button type="button" aria-label="안내 닫기" onClick={() => setClosed(true)} className="flex size-10 shrink-0 items-center justify-center text-xl text-muted">
        ×
      </button>
    </div>
  );
}
