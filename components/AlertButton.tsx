"use client";

import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/errors";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/push";
import { useToast } from "./Toast";

function Bell({ off = false }: { off?: boolean }) {
  return (
    <svg width={off ? 19 : 17} height={off ? 19 : 17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <g transform={off ? "translate(-2.2 2) scale(0.88)" : undefined}>
        <path d="M6 10.5a6 6 0 0 1 12 0v3.7l1.6 2.6H4.4L6 14.2z" />
        <path d="M10 19.5a2 2 0 0 0 4 0" />
      </g>
      {/* 꺼짐: 벨 오른쪽 위에 X */}
      {off && <path d="M17 2.5l4.5 4.5M21.5 2.5L17 7" strokeWidth="2.6" />}
    </svg>
  );
}

/**
 * 홈 화면 앱으로 열었을 때 홈 오른쪽 위 "앱 설치" 자리에 놓는 알림 버튼.
 * 꺼져 있으면 누르는 즉시 알림 허용을 묻고, 켜져 있으면 무슨 알림이 오는지와 끄기를 보여 준다
 */
export function AlertButton() {
  const [state, setState] = useState<PushState | null>(null);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const { node, show } = useToast();

  useEffect(() => {
    getPushState().then(setState);
  }, []);

  if (state === null || state === "unsupported" || state === "need-install") return null;
  const on = state === "on";

  async function turnOn() {
    setBusy(true);
    try {
      const s = await enablePush();
      setState(s);
      if (s === "on") show("알림을 켰어요! 소식이 생기면 휴대폰으로 알려 드릴게요.", "proud");
      else if (s === "denied") setSheet(true);
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      setState(await disablePush());
      setSheet(false);
      show("알림을 껐어요.", "smile");
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => (state === "off" ? turnOn() : setSheet(true))}
        className={`ok-sticker inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 px-4 py-2 font-display text-[16px] disabled:opacity-60 ${
          on ? "border-line bg-card text-sage-deep" : state === "denied" ? "border-ink bg-muted text-white" : "border-[#A4423F] bg-coral text-white"
        }`}
      >
        <Bell off={!on} />
        {busy ? "켜는 중…" : on ? "알림 켜짐" : state === "denied" ? "알림 막힘" : "알림 꺼짐"}
      </button>

      {sheet && (
        <div role="dialog" aria-modal="true" aria-labelledby="alert-title" className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/30 px-3 pb-3 sm:items-center" onClick={() => setSheet(false)}>
          <div className="ok-pop relative flex w-full max-w-[440px] flex-col gap-3 rounded-[28px] border-2 border-line bg-card px-5 pt-5 pb-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label="닫기" onClick={() => setSheet(false)} className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full text-2xl leading-none text-muted">
              ×
            </button>
            <h2 id="alert-title" className="font-display text-[23px] font-normal">{on ? "알림을 받고 있어요" : "알림이 막혀 있어요"}</h2>
            {on ? (
              <ul className="flex flex-col gap-1.5 text-[17px] leading-relaxed">
                <li>⭐ 즐겨찾는 가게가 <b>문 열었을 때 · 재료 소진 · 임시휴무</b></li>
                <li>🔔 사장님이면 <b>이웃 제보</b>가 왔을 때</li>
                <li>⏰ 사장님이면 <b>여는 시간</b>이 지났는데 오늘 소식이 없을 때</li>
              </ul>
            ) : (
              <p className="text-[17px] leading-relaxed">
                휴대폰 <b>설정 → 애플리케이션(앱) → 옥!소리 → 알림</b>에서 허용한 뒤, 이 버튼을 다시 눌러 주세요.
              </p>
            )}
            {on ? (
              <button type="button" disabled={busy} onClick={turnOff} className="min-h-14 rounded-[18px] border-2 border-line bg-white text-lg font-bold disabled:opacity-50">
                알림 끄기
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  setSheet(false);
                  setState(await getPushState());
                }}
                className="min-h-14 rounded-[18px] border-2 border-yellow-deep bg-yellow font-display text-lg"
              >
                다시 확인하기
              </button>
            )}
          </div>
        </div>
      )}
      {node}
    </>
  );
}
