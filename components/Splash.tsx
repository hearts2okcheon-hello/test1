"use client";

import { useEffect, useState } from "react";
import { SPLASH_ID, SPLASH_LEAVE_MS, splashWait } from "@/lib/splash";
import { Paw } from "./LoadingGauge";

type SplashState = "run" | "leaving";
/** 처음 그려지는 때를 이만큼만 기다린다 */
const FIRST_PAINT_WAIT_MS = 1000;

/**
 * 시작 화면의 모양 (ADR-021): 로고 · 달려가는 가방 오소리 · 한 줄 인사.
 * 오소리는 왼쪽에서 달려 들어와 제자리에서 달리고(뒤로 발자국이 흘러가고 길이 지나간다),
 * state 가 leaving 이 되면 오른쪽으로 달려 나가며 화면이 옅어진다. 움직임은 globals.css 의 ok-splash
 */
export function SplashView({ state }: { state: SplashState }) {
  return (
    // 같은 창에서 이미 본 사람에게는 스크립트가 data-state 를 off 로 바꿔 둔다 (그래서 서버가 그린 것과 달라도 된다)
    <div id={SPLASH_ID} data-state={state} suppressHydrationWarning role="status" className="ok-splash">
      <span className="sr-only">옥!소리를 열고 있어요</span>
      <div aria-hidden className="flex flex-col items-center gap-1">
        {/* 시작 화면의 그림은 뜨자마자 보여야 해서, 미루지 않고 바로 그리게 한다 (decoding="sync") */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.webp" alt="" width={166} height={104} decoding="sync" fetchPriority="high" className="block h-[104px] w-auto" />
        <span className="font-display text-[15px] text-muted">주머니 속 마을방송</span>
      </div>

      <div aria-hidden className="ok-splash-stage">
        {[0, 1, 2].map((i) => (
          <span key={i} className="ok-splash-paw">
            <Paw size={18} className="rotate-90" />
          </span>
        ))}
        {/* 들어오기(runner) · 나가기(dash) · 통통 뛰기(bob)를 따로 두어, 들어오는 중에 나가도 자리가 튀지 않는다 */}
        <div className="ok-splash-runner">
          <div className="ok-splash-dash">
            <div className="ok-splash-bob">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/osori/move.webp" alt="" width={124} height={124} decoding="sync" fetchPriority="high" className="block size-[124px] object-contain" />
            </div>
          </div>
        </div>
        <div className="ok-splash-ground" />
      </div>

      <p aria-hidden className="text-center font-display text-[17px] break-keep">오늘 소식을 가지러 달려가고 있어요</p>
    </div>
  );
}

/**
 * 앱·웹을 처음 열 때 한 번 보이는 시작 화면. 서버가 처음부터 그려 보내서 화면이 뜨는 동안 바로 보인다.
 * 화면이 준비되면(그리고 달려가는 모습이 보일 만큼 지나면) 오소리가 달려 나가고 사라진다.
 * 화면 사이를 옮겨 다닐 때나, 같은 창에서 새로 고칠 때는 다시 나오지 않는다
 */
export function Splash() {
  const [state, setState] = useState<SplashState | "gone">("run");

  useEffect(() => {
    // 같은 창에서 이미 한 번 보여 줬으면 스크립트가 미리 감춰 두었다. 그대로 치운다
    if (document.getElementById(SPLASH_ID)?.dataset.state === "off") {
      setState("gone");
      return;
    }
    let timer = 0;
    let frame = 0;
    let late = 0;
    let counting = false;
    // 시작 화면이 처음 그려진 때부터 잰다 (shownFor 는 그려진 뒤 지난 시간)
    const leaveAfter = (shownFor: number) => {
      if (counting) return;
      counting = true;
      timer = window.setTimeout(() => setState("leaving"), splashWait(shownFor));
    };
    const painted = performance.getEntriesByName("first-contentful-paint")[0]?.startTime;
    if (painted !== undefined) {
      leaveAfter(performance.now() - painted);
    } else {
      // 아직 그려지기 전이다: 처음 그려지는 때를 기다린다.
      // 화면이 가려져 있어 그려지지 않는 창에서도 멈춰 있지 않게, 1초 뒤에는 그냥 세기 시작한다
      frame = window.requestAnimationFrame(() => leaveAfter(0));
      late = window.setTimeout(() => leaveAfter(0), FIRST_PAINT_WAIT_MS);
    }
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(late);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (state !== "leaving") return;
    const timer = window.setTimeout(() => setState("gone"), SPLASH_LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  return state === "gone" ? null : <SplashView state={state} />;
}
